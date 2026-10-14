import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { AttendanceRecord, ReportPreset } from '../types';
import {
  formatDuration,
  formatTime,
  formatShortDate,
  formatReadableDate,
  toJsDate,
  getPresetDateRange,
  DEFAULT_TIMEZONE,
} from '../utils/time';
import { exportAttendanceToCsv } from '../utils/csv';
import { useTheme } from '../context/ThemeContext';

export const ReportsPage: React.FC = () => {
  const { user, profile, preferences } = useAuth();
  const { actualTheme } = useTheme();

  const [preset, setPreset] = useState<ReportPreset>('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const timezone = preferences?.timezone || DEFAULT_TIMEZONE;
  const clockFormat = preferences?.clockFormat || '12h';
  const expectedDailyMinutes = preferences?.expectedDailyMinutes || 480;

  // Determine active date range
  const getDateRange = useCallback((): { startDate: string; endDate: string; label: string } => {
    if (preset === 'custom') {
      return {
        startDate: customStart || '2026-01-01',
        endDate: customEnd || '2026-12-31',
        label: `Custom (${customStart || 'Start'} to ${customEnd || 'End'})`,
      };
    }
    const range = getPresetDateRange(preset, timezone);
    const presetLabels: Record<string, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      'this-week': 'This Week',
      'last-week': 'Last Week',
      'this-month': 'This Month',
      'last-month': 'Last Month',
      'last-7-days': 'Last 7 Days',
      'last-30-days': 'Last 30 Days',
    };
    return { ...range, label: presetLabels[preset] || preset };
  }, [preset, customStart, customEnd, timezone]);

  const loadReportData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const data = await attendanceService.getAttendanceHistory(user.uid, {
        startDate,
        endDate,
      });
      // Sort ascending for chronological report and chart
      const sorted = [...data].sort((a, b) => a.localDate.localeCompare(b.localDate));
      setRecords(sorted);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getDateRange]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Aggregate metrics
  const completedRecords = records.filter((r) => r.status === 'completed');
  const incompleteRecords = records.filter((r) => r.status === 'incomplete');
  const activeRecords = records.filter((r) => r.status === 'active');

  const totalMinutes = completedRecords.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);
  const totalCompletedDays = completedRecords.length;
  const averageMinutesPerDay =
    totalCompletedDays > 0 ? Math.round(totalMinutes / totalCompletedDays) : 0;

  // Earliest check-in and latest check-out
  let earliestCheckInTime = '—';
  let latestCheckOutTime = '—';

  if (completedRecords.length > 0) {
    const validInDates = completedRecords
      .map((r) => toJsDate(r.checkInAt))
      .filter((d): d is Date => d !== null);

    const validOutDates = completedRecords
      .map((r) => toJsDate(r.checkOutAt))
      .filter((d): d is Date => d !== null);

    if (validInDates.length > 0) {
      const minIn = validInDates.reduce((min, d) => (d.getTime() < min.getTime() ? d : min));
      earliestCheckInTime = formatTime(minIn, clockFormat, timezone);
    }

    if (validOutDates.length > 0) {
      const maxOut = validOutDates.reduce((max, d) => (d.getTime() > max.getTime() ? d : max));
      latestCheckOutTime = formatTime(maxOut, clockFormat, timezone);
    }
  }

  // Daily chart data
  const chartData = records.map((r) => ({
    date: r.localDate.slice(5), // MM-DD
    fullDate: r.localDate,
    hours: Math.round(((r.totalMinutes || 0) / 60) * 10) / 10,
    minutes: r.totalMinutes || 0,
    formatted: formatDuration(r.totalMinutes),
    status: r.status,
  }));

  const handleExportCsv = () => {
    const { label } = getDateRange();
    exportAttendanceToCsv({
      userName: profile?.displayName || 'Arsalan Bhai',
      periodTitle: label,
      records,
      clockFormat,
      timezone,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const presets: { id: ReportPreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this-week', label: 'This Week' },
    { id: 'last-week', label: 'Last Week' },
    { id: 'this-month', label: 'This Month' },
    { id: 'last-month', label: 'Last Month' },
    { id: 'last-7-days', label: 'Last 7 Days' },
    { id: 'last-30-days', label: 'Last 30 Days' },
    { id: 'custom', label: 'Custom' },
  ];

  const isDark = actualTheme === 'dark';
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Work-Hours Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit working durations, daily attendance averages, and export reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download RFC 4180 CSV export"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Print printable summary"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Preset Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                preset === p.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 text-xs">
            <span className="text-slate-500 font-medium">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <span className="text-slate-500 font-medium">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}
      </div>

      {/* Report Header (Visible in print too) */}
      <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs print-card">
        <div>
          <span className="text-slate-500 uppercase tracking-wider font-semibold">Active Reporting Period: </span>
          <strong className="text-slate-900 dark:text-white font-display text-sm">{getDateRange().label}</strong>
        </div>
        <div className="text-slate-500">
          User: <strong className="text-slate-800 dark:text-slate-200">{profile?.displayName || 'Arsalan Bhai'}</strong> (Timezone: {timezone})
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs print-card">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Days</span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-1">
            {totalCompletedDays}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Finalized work days</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs print-card">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Hours</span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-1">
            {formatDuration(totalMinutes)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{totalMinutes} verified minutes</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs print-card">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Daily Duration</span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {formatDuration(averageMinutesPerDay)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Per completed session</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs print-card">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Incomplete Sessions</span>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1">
            {incompleteRecords.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Requiring time correction</p>
        </div>
      </div>

      {/* Additional Stats: Earliest Check-In & Latest Check-Out */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between text-xs print-card">
          <div>
            <p className="text-slate-500 font-medium">Earliest Arrival in Period:</p>
            <p className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {earliestCheckInTime}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between text-xs print-card">
          <div>
            <p className="text-slate-500 font-medium">Latest Departure in Period:</p>
            <p className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {latestCheckOutTime}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Daily Working-Hours Bar Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs print-card">
        <h3 className="text-base font-bold text-slate-900 dark:text-white font-display mb-1">
          Daily Working Duration Trend
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Hours recorded for each calendar day in the selected range
        </p>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            No attendance records to display for this timeframe.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  stroke={textColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis
                  stroke={textColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}h`}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white dark:bg-slate-800 p-2.5 rounded-lg text-xs shadow-lg border border-slate-700">
                          <p className="font-semibold">{item.fullDate}</p>
                          <p className="text-indigo-300 font-mono mt-1 tabular-nums">
                            Hours: {item.formatted} ({item.hours}h)
                          </p>
                          <p className="text-[10px] uppercase text-slate-400 mt-0.5">
                            Status: {item.status}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="hours" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Attendance Detail Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden print-card">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            Detailed Attendance Sessions ({records.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Arrival</th>
                <th className="py-3 px-4">Departure</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No records found for the chosen reporting period.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {r.localDate}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatTime(r.checkInAt, clockFormat, timezone)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                      {r.checkOutAt ? formatTime(r.checkOutAt, clockFormat, timezone) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {r.totalMinutes ? formatDuration(r.totalMinutes) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          r.status === 'completed'
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                            : r.status === 'active'
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60'
                            : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {r.notes || (r.isCorrected ? 'Manually adjusted' : '—')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
