import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Edit3,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { AttendanceRecord, AttendanceStatus } from '../types';
import {
  formatDuration,
  formatTime,
  formatReadableDate,
  toJsDate,
  DEFAULT_TIMEZONE,
} from '../utils/time';
import { IncompleteSessionModal } from '../components/dashboard/IncompleteSessionModal';

export const AttendancePage: React.FC = () => {
  const { user, preferences } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timezone = preferences?.timezone || DEFAULT_TIMEZONE;
  const clockFormat = preferences?.clockFormat || '12h';

  const loadAttendance = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceService.getAttendanceHistory(user.uid, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter,
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to load attendance records:', err);
      setError('Could not retrieve attendance records.');
    } finally {
      setLoading(false);
    }
  }, [user, startDate, endDate, statusFilter]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleResolve = async (
    recordId: string,
    checkOutDate: Date,
    notes: string
  ) => {
    if (!user) return;
    await attendanceService.resolveIncompleteSession(user.uid, recordId, checkOutDate, notes);
    setCorrectingRecord(null);
    await loadAttendance();
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Attendance History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Complete log of verified office arrival and departure sessions
          </p>
        </div>

        <button
          onClick={loadAttendance}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            {(['all', 'completed', 'active', 'incomplete'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {(startDate || endDate || statusFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Records Table & Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <span className="text-xs">Loading attendance log...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Attendance Records Found
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No sessions match the selected filters. Try broadening your date range or filter criteria.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Total Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((record) => {
                    const checkInDate = toJsDate(record.checkInAt);
                    const checkOutDate = toJsDate(record.checkOutAt);

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {record.localDate}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatTime(checkInDate, clockFormat, timezone)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatTime(checkOutDate, clockFormat, timezone)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {record.totalMinutes !== null && record.totalMinutes !== undefined
                            ? formatDuration(record.totalMinutes)
                            : record.status === 'active'
                            ? 'In progress'
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                              record.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                                : record.status === 'active'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                            }`}
                          >
                            {record.status}
                          </span>
                          {record.isCorrected && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                              Corrected
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="View Record Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {record.status === 'incomplete' && (
                            <button
                              onClick={() => setCorrectingRecord(record)}
                              className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-600 hover:text-amber-700 transition-colors"
                              title="Resolve / Correct Record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {records.map((record) => {
                const checkInDate = toJsDate(record.checkInAt);
                const checkOutDate = toJsDate(record.checkOutAt);

                return (
                  <div key={record.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {record.localDate}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          record.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : record.status === 'active'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Check-In: </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatTime(checkInDate, clockFormat, timezone)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Check-Out: </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatTime(checkOutDate, clockFormat, timezone)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs">
                        <span className="text-slate-500">Duration: </span>
                        <strong className="font-mono text-slate-900 dark:text-white tabular-nums">
                          {record.totalMinutes ? formatDuration(record.totalMinutes) : 'In progress'}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="px-2.5 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                        >
                          Details
                        </button>
                        {record.status === 'incomplete' && (
                          <button
                            onClick={() => setCorrectingRecord(record)}
                            className="px-2.5 py-1 text-xs rounded bg-amber-600 text-white font-medium"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Attendance Record Details
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatReadableDate(selectedRecord.localDate, timezone)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Document ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedRecord.id}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Arrival Time:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatTime(selectedRecord.checkInAt, clockFormat, timezone)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Departure Time:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {selectedRecord.checkOutAt
                    ? formatTime(selectedRecord.checkOutAt, clockFormat, timezone)
                    : 'Not checked out'}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Total Duration:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatDuration(selectedRecord.totalMinutes)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                  {selectedRecord.status}
                </span>
              </div>
              {selectedRecord.notes && (
                <div className="py-2 space-y-1">
                  <span className="text-slate-500">Correction Notes:</span>
                  <p className="p-2 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                    {selectedRecord.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incomplete / Correction Modal */}
      {correctingRecord && (
        <IncompleteSessionModal
          record={correctingRecord}
          preferences={preferences}
          isOpen={true}
          onClose={() => setCorrectingRecord(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
};
