import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AttendanceRecord, AttendanceStatus, UserPreferences } from '../types';
import { calculateElapsedMinutes, DEFAULT_TIMEZONE, getLocalDateString } from '../utils/time';

export const attendanceService = {
  /**
   * Retrieves today's attendance record for the user.
   */
  async getTodayAttendance(userId: string, localDate: string): Promise<AttendanceRecord | null> {
    const path = `users/${userId}/attendance/${localDate}`;
    try {
      const docRef = doc(db, 'users', userId, 'attendance', localDate);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as AttendanceRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  /**
   * Check in for the day using a deterministic local date ID (YYYY-MM-DD).
   * Ensures idempotency and single session per calendar day via Firestore transaction.
   */
  async checkIn(userId: string, localDate: string): Promise<void> {
    const path = `users/${userId}/attendance/${localDate}`;
    try {
      const docRef = doc(db, 'users', userId, 'attendance', localDate);

      await runTransaction(db, async (transaction) => {
        const existingDoc = await transaction.get(docRef);
        if (existingDoc.exists()) {
          const data = existingDoc.data();
          if (data.status === 'active') {
            throw new Error('You already have an active check-in session for today.');
          }
          if (data.status === 'completed') {
            throw new Error('Attendance session has already been completed for today.');
          }
        }

        transaction.set(docRef, {
          localDate,
          checkInAt: serverTimestamp(),
          checkOutAt: null,
          totalMinutes: null,
          status: 'active',
          notes: null,
          isCorrected: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  /**
   * Check out from an active session.
   * Calculates total working duration in minutes and stores checkout timestamp.
   */
  async checkOut(userId: string, localDate: string, checkInDate: Date): Promise<void> {
    const path = `users/${userId}/attendance/${localDate}`;
    try {
      const docRef = doc(db, 'users', userId, 'attendance', localDate);

      await runTransaction(db, async (transaction) => {
        const existingDoc = await transaction.get(docRef);
        if (!existingDoc.exists()) {
          throw new Error('No active attendance record found for today.');
        }

        const data = existingDoc.data();
        if (data.status !== 'active') {
          throw new Error('This attendance session is not active.');
        }

        const now = new Date();
        const durationMinutes = calculateElapsedMinutes(checkInDate, now);

        transaction.update(docRef, {
          checkOutAt: serverTimestamp(),
          totalMinutes: durationMinutes,
          status: 'completed',
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Checks for any past active sessions (e.g. from yesterday or earlier) that were left open,
   * and flags them as 'incomplete'.
   */
  async flagOverdueSessions(userId: string, currentLocalDate: string): Promise<AttendanceRecord | null> {
    const path = `users/${userId}/attendance`;
    try {
      const q = query(
        collection(db, 'users', userId, 'attendance'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      let oldestIncomplete: AttendanceRecord | null = null;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as AttendanceRecord;
        if (data.localDate < currentLocalDate) {
          // This session was left open overnight
          await updateDoc(docSnap.ref, {
            status: 'incomplete',
            updatedAt: serverTimestamp(),
          });
          if (!oldestIncomplete || data.localDate < oldestIncomplete.localDate) {
            oldestIncomplete = { ...data, id: docSnap.id, status: 'incomplete' };
          }
        }
      }
      return oldestIncomplete;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  /**
   * Manually resolves an incomplete session with user-specified check-out time and notes.
   */
  async resolveIncompleteSession(
    userId: string,
    attendanceId: string,
    checkOutDate: Date,
    notes: string
  ): Promise<void> {
    const path = `users/${userId}/attendance/${attendanceId}`;
    try {
      const docRef = doc(db, 'users', userId, 'attendance', attendanceId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        throw new Error('Attendance record not found.');
      }

      const data = snapshot.data() as AttendanceRecord;
      const checkInDate = data.checkInAt instanceof Timestamp ? data.checkInAt.toDate() : new Date(data.checkInAt);

      if (checkOutDate.getTime() <= checkInDate.getTime()) {
        throw new Error('Check-out time must be after check-in time.');
      }

      const totalMinutes = calculateElapsedMinutes(checkInDate, checkOutDate);

      await updateDoc(docRef, {
        checkOutAt: Timestamp.fromDate(checkOutDate),
        totalMinutes,
        status: 'completed',
        notes: notes.trim(),
        isCorrected: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Retrieves attendance history with optional date range and status filters.
   */
  async getAttendanceHistory(
    userId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      status?: AttendanceStatus | 'all';
      limitCount?: number;
    }
  ): Promise<AttendanceRecord[]> {
    const path = `users/${userId}/attendance`;
    try {
      let q = query(
        collection(db, 'users', userId, 'attendance'),
        orderBy('localDate', 'desc')
      );

      if (options?.startDate && options?.endDate) {
        q = query(
          collection(db, 'users', userId, 'attendance'),
          where('localDate', '>=', options.startDate),
          where('localDate', '<=', options.endDate),
          orderBy('localDate', 'desc')
        );
      } else if (options?.limitCount) {
        q = query(
          collection(db, 'users', userId, 'attendance'),
          orderBy('localDate', 'desc'),
          limit(options.limitCount)
        );
      }

      const snapshot = await getDocs(q);
      let records = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as AttendanceRecord[];

      if (options?.status && options.status !== 'all') {
        records = records.filter((r) => r.status === options.status);
      }

      return records;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  /**
   * Retrieves user preferences from Firestore or initializes default preferences.
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const path = `users/${userId}/settings/preferences`;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'preferences');
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        return snapshot.data() as UserPreferences;
      }

      const defaultPrefs: UserPreferences = {
        timezone: DEFAULT_TIMEZONE,
        clockFormat: '12h',
        weeklySchedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        expectedDailyMinutes: 480, // 8 hours
        theme: 'system',
      };

      await setDoc(docRef, {
        ...defaultPrefs,
        updatedAt: serverTimestamp(),
      });

      return defaultPrefs;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  /**
   * Updates user preferences in Firestore.
   */
  async saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<void> {
    const path = `users/${userId}/settings/preferences`;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'preferences');
      await setDoc(
        docRef,
        {
          ...prefs,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
};
