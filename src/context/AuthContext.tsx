import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserPreferences } from '../types';
import { attendanceService } from '../services/attendanceService';
import { DEFAULT_TIMEZONE } from '../utils/time';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch or initialize user profile
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          let userProfileData: UserProfile;
          if (userSnap.exists()) {
            userProfileData = { uid: currentUser.uid, ...userSnap.data() } as UserProfile;
          } else {
            userProfileData = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Arsalan Bhai',
              email: currentUser.email || '',
              timezone: DEFAULT_TIMEZONE,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await setDoc(userDocRef, {
              displayName: userProfileData.displayName,
              email: userProfileData.email,
              timezone: userProfileData.timezone,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          setProfile(userProfileData);

          // Fetch preferences
          const prefs = await attendanceService.getUserPreferences(currentUser.uid);
          setPreferences(prefs);
        } catch (err) {
          console.error('Error fetching profile or preferences:', err);
        }
      } else {
        setProfile(null);
        setPreferences(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user) return;
    await attendanceService.saveUserPreferences(user.uid, newPrefs);
    setPreferences((prev) => (prev ? { ...prev, ...newPrefs } : null));
  };

  const updateProfileName = async (name: string) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { displayName: name.trim(), updatedAt: serverTimestamp() }, { merge: true });
    setProfile((prev) => (prev ? { ...prev, displayName: name.trim() } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        preferences,
        loading,
        login,
        logout,
        resetPassword,
        updatePreferences,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
