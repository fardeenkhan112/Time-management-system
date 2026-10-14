import React, { useState } from 'react';
import { AlertTriangle, Clock, X, Loader2 } from 'lucide-react';
import { AttendanceRecord, UserPreferences } from '../../types';
import { formatTime, formatReadableDate, toJsDate, DEFAULT_TIMEZONE } from '../../utils/time';

interface IncompleteSessionModalProps {
  record: AttendanceRecord;
  preferences: UserPreferences | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (recordId: string, checkOutDate: Date, notes: string) => Promise<void>;
}

export const IncompleteSessionModal: React.FC<IncompleteSessionModalProps> = ({
  record,
  preferences,
  isOpen,
  onClose,
  onResolve,
}) => {
  const [timeStr, setTimeStr] = useState('18:00'); // default 6:00 PM
  const [notes, setNotes] = useState('Forgot to check out before leaving office');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const clockFormat = preferences?.clockFormat || '12h';
  const timezone = preferences?.timezone || DEFAULT_TIMEZONE;
  const checkInDate = record.checkInAt ? toJsDate(record.checkInAt) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInDate) return;

    setError(null);
    setLoading(true);

    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Please enter a valid check-out time.');
      }

      // Construct checkout date using the record's local date
      const [year, month, day] = record.localDate.split('-').map(Number);
      const targetCheckOut = new Date(year, month - 1, day, hours, minutes, 0);

      if (targetCheckOut.getTime() <= checkInDate.getTime()) {
        throw new Error('Check-out time must be later than check-in time.');
      }

      await onResolve(record.id, targetCheckOut, notes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Resolve Incomplete Attendance
            </h2>
            <p className="text-xs text-slate-500">
              Session from {formatReadableDate(record.localDate, timezone)} was left open.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Attendance Date:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {record.localDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Recorded Check-In:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                {formatTime(checkInDate, clockFormat, timezone)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Actual Departure Time (24h format HH:MM)
            </label>
            <div className="relative">
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Specify the approximate time you left the office on that day.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Correction Reason / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="e.g. Left office in a hurry, forgot to press checkout button"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Finalize Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
