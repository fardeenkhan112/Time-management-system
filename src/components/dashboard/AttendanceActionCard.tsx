import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { AttendanceRecord, UserPreferences } from '../../types';
import {
  formatDuration,
  formatLiveTimer,
  formatTime,
  formatReadableDate,
  toJsDate,
  DEFAULT_TIMEZONE,
} from '../../utils/time';

interface AttendanceActionCardProps {
  record: AttendanceRecord | null;
  loading: boolean;
  preferences: UserPreferences | null;
  onCheckIn: () => Promise<void>;
  onCheckOut: (checkInDate: Date) => Promise<void>;
}

export const AttendanceActionCard: React.FC<AttendanceActionCardProps> = ({
  record,
  loading,
  preferences,
  onCheckIn,
  onCheckOut,
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  const clockFormat = preferences?.clockFormat || '12h';
  const timezone = preferences?.timezone || DEFAULT_TIMEZONE;

  const checkInDate = record?.checkInAt ? toJsDate(record.checkInAt) : null;
  const checkOutDate = record?.checkOutAt ? toJsDate(record.checkOutAt) : null;
  const isActive = record?.status === 'active';
  const isCompleted = record?.status === 'completed';

  // Live timer tick for active session
  useEffect(() => {
    if (!isActive || !checkInDate) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diffMs = now.getTime() - checkInDate.getTime();
      setElapsedSeconds(Math.max(0, Math.floor(diffMs / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isActive, checkInDate]);

  const handleCheckInClick = async () => {
    setActionLoading(true);
    try {
      await onCheckIn();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOutConfirm = async () => {
    if (!checkInDate) return;
    setActionLoading(true);
    try {
      await onCheckOut(checkInDate);
      setShowCheckoutConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs relative overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      )}

      {/* State 1: Active Session (Checked In) */}
      {isActive && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                Active Session
              </span>
              <span className="text-xs text-slate-500">
                Arrival: {formatTime(checkInDate, clockFormat, timezone)}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Current Working Duration
              </p>
              <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-slate-900 dark:text-white tabular-nums mt-1">
                {formatLiveTimer(elapsedSeconds)}
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Live counter based on authoritative server timestamp at {formatTime(checkInDate, clockFormat, timezone)}.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCheckoutConfirm(true)}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>Check Out</span>
            </button>
          </div>
        </div>
      )}

      {/* State 2: Completed Today */}
      {isCompleted && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Session Completed
              </span>
              <span className="text-xs text-slate-500">
                {formatReadableDate(checkInDate, timezone)}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Completed Hours Today
              </p>
              <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {formatDuration(record.totalMinutes)}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span>Arrived: <strong className="text-slate-900 dark:text-slate-200">{formatTime(checkInDate, clockFormat, timezone)}</strong></span>
              <span>·</span>
              <span>Departed: <strong className="text-slate-900 dark:text-slate-200">{formatTime(checkOutDate, clockFormat, timezone)}</strong></span>
              {record.isCorrected && (
                <>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">(Manually Corrected)</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 max-w-xs">
            Office attendance for today is finalized. Further check-ins for the same calendar day are prevented to maintain historical accuracy.
          </div>
        </div>
      )}

      {/* State 3: Not Checked In */}
      {!isActive && !isCompleted && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Not Checked In
              </span>
              <span className="text-xs text-slate-500">
                {formatReadableDate(new Date(), timezone)}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
                Ready to start your work day?
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Record your office arrival to begin tracking working hours in real time.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={handleCheckInClick}
              disabled={actionLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              <span>Check In Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Dialog */}
      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Confirm Office Departure
                </h3>
                <p className="text-xs text-slate-500">
                  Are you ready to check out for today?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in time:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatTime(checkInDate, clockFormat, timezone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated duration:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatLiveTimer(elapsedSeconds)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Checking out finalizes today's session and records the authoritative duration.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCheckOutConfirm}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Check Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
