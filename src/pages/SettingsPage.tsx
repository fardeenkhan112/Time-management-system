import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Calendar,
  Sun,
  Moon,
  Laptop,
  KeyRound,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_TIMEZONE, formatDuration } from '../utils/time';

export const SettingsPage: React.FC = () => {
  const { user, profile, preferences, updatePreferences, updateProfileName, resetPassword, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState(profile?.displayName || 'Arsalan Bhai');
  const [clockFormat, setClockFormat] = useState<'12h' | '24h'>(preferences?.clockFormat || '12h');
  const [timezone, setTimezone] = useState(preferences?.timezone || DEFAULT_TIMEZONE);
  const [expectedHours, setExpectedHours] = useState(
    preferences?.expectedDailyMinutes ? preferences.expectedDailyMinutes / 60 : 8
  );
  const [weeklySchedule, setWeeklySchedule] = useState<string[]>(
    preferences?.weeklySchedule || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
    if (preferences) {
      setClockFormat(preferences.clockFormat);
      setTimezone(preferences.timezone);
      setExpectedHours(preferences.expectedDailyMinutes / 60);
      setWeeklySchedule(preferences.weeklySchedule);
    }
  }, [profile, preferences]);

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const toggleDay = (day: string) => {
    if (weeklySchedule.includes(day)) {
      setWeeklySchedule(weeklySchedule.filter((d) => d !== day));
    } else {
      setWeeklySchedule([...weeklySchedule, day]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      if (displayName.trim() !== profile?.displayName) {
        await updateProfileName(displayName.trim());
      }

      await updatePreferences({
        clockFormat,
        timezone,
        expectedDailyMinutes: Math.round(expectedHours * 60),
        weeklySchedule,
        theme,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email.');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
          Personal Preferences & Schedule
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure display formatting, daily target hours, and account security
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Your settings and preferences have been successfully updated.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {resetSent && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <span>Password reset link has been dispatched to {user?.email}.</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: User Profile */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Personal Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={50}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Authorized Account Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Managed via Firebase Authentication
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Display & Timezone Preferences */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Time & Format Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Clock Format */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Clock Display Format
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setClockFormat('12h')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    clockFormat === '12h'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  12-Hour (07:45 PM)
                </button>
                <button
                  type="button"
                  onClick={() => setClockFormat('24h')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    clockFormat === '24h'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  24-Hour (19:45)
                </button>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Office Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Default: Asia/Karachi (UTC+05:00)
              </span>
            </div>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Appearance Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'system', label: 'System Auto', icon: Laptop },
                { id: 'light', label: 'Light Mode', icon: Sun },
                { id: 'dark', label: 'Dark Mode', icon: Moon },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id as any)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      theme === item.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Work Schedule & Target Hours */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Work Schedule & Informational Target
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Configured Working Days
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => {
                const active = weeklySchedule.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Used for benchmark comparisons in weekly and monthly reports.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expected Daily Working Hours: <strong className="text-indigo-600 dark:text-indigo-400">{expectedHours} hours ({expectedHours * 60} mins)</strong>
            </label>
            <input
              type="range"
              min={4}
              max={12}
              step={0.5}
              value={expectedHours}
              onChange={(e) => setExpectedHours(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>4 hours</span>
              <span>8 hours (Standard)</span>
              <span>12 hours</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Account Security & Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
          Account Security & Session
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Reset Password
            </p>
            <p className="text-[11px] text-slate-500">
              Receive a secure password reset link to your registered email
            </p>
          </div>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="self-start sm:self-auto px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Send Reset Link
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              Log Out of WorkTrack
            </p>
            <p className="text-[11px] text-slate-500">
              Terminate your authenticated session on this browser
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
