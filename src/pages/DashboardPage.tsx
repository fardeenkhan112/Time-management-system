import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  BarChart3,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { AttendanceRecord } from '../types';
import {
  getLocalDateString,
  getPresetDateRange,
  DEFAULT_TIMEZONE,
  formatTime,
  formatDuration,
  formatReadableDate,
} from '../utils/time';
import { AttendanceActionCard } from '../components/dashboard/AttendanceActionCard';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { WeeklyHoursChart } from '../components/dashboard/WeeklyHoursChart';
import { IncompleteSessionModal } from '../components/dashboard/IncompleteSessionModal';

export const DashboardPage: React.FC = () => {
  const { user, profile, preferences } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [weekRecords, setWeekRecords] = useState<AttendanceRecord[]>([]);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [incompleteRecord, setIncompleteRecord] = useState<AttendanceRecord | null>(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezone = preferences?.timezone || DEFAULT_TIMEZONE;
  const todayDateStr = getLocalDateString(new Date(), timezone);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setError(null);

    try {
      // 1. Check for overdue active sessions from prior days
      const overdue = await attendanceService.flagOverdueSessions(user.uid, todayDateStr);
      if (overdue) {
        setIncompleteRecord(overdue);
      }

      // 2. Fetch today's record
      const today = await attendanceService.getTodayAttendance(user.uid, todayDateStr);
      setTodayRecord(today);

      // 3. Fetch this week's records for summary and chart
      const weekRange = getPresetDateRange('this-week', timezone);
      const weekData = await attendanceService.getAttendanceHistory(user.uid, {
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
      });
      setWeekRecords(weekData);

      // 4. Fetch this month's records for monthly summary
      const monthRange = getPresetDateRange('this-month', timezone);
      const monthData = await attendanceService.getAttendanceHistory(user.uid, {
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
      });
      setMonthRecords(monthData);

      // 5. Fetch recent 5 records
      const recent = await attendanceService.getAttendanceHistory(user.uid, { limitCount: 5 });
      setRecentRecords(recent);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load attendance records. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, todayDateStr, timezone]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleCheckIn = async () => {
    if (!user) return;
    try {
      await attendanceService.checkIn(user.uid, todayDateStr);
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed.');
    }
  };

  const handleCheckOut = async (checkInDate: Date) => {
    if (!user) return;
    try {
      await attendanceService.checkOut(user.uid, todayDateStr, checkInDate);
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-out failed.');
    }
  };

  const handleResolveIncomplete = async (
    recordId: string,
    checkOutDate: Date,
    notes: string
  ) => {
    if (!user) return;
    await attendanceService.resolveIncompleteSession(user.uid, recordId, checkOutDate, notes);
    setIncompleteRecord(null);
    await loadDashboardData();
  };

  // Metrics calculations
  const todayMinutes = todayRecord?.totalMinutes || 0;
  const weekMinutes = weekRecords.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);
  const monthMinutes = monthRecords.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);
  const completedDaysCount = monthRecords.filter((r) => r.status === 'completed').length;
  const expectedDailyMinutes = preferences?.expectedDailyMinutes || 480;

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            Welcome back, {profile?.displayName || 'Arsalan Bhai'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Personal attendance dashboard · {formatReadableDate(new Date(), timezone)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh attendance records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 dark:text-rose-400 font-semibold hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Incomplete Session Recovery Alert */}
      {incompleteRecord && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 font-display">
                Incomplete Attendance Session Detected
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Session for {incompleteRecord.localDate} was left open without a recorded check-out.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowIncompleteModal(true)}
            className="self-start sm:self-auto px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shrink-0"
          >
            Resolve Session Now
          </button>
        </div>
      )}

      {/* Main Attendance Action Card */}
      <AttendanceActionCard
        record={todayRecord}
        loading={loading}
        preferences={preferences}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
      />

      {/* Summary KPI Cards */}
      <SummaryCards
        todayMinutes={todayMinutes}
        weekMinutes={weekMinutes}
        monthMinutes={monthMinutes}
        completedDaysCount={completedDaysCount}
        expectedDailyMinutes={expectedDailyMinutes}
      />

      {/* Two Column Section: Weekly Hours Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Chart */}
        <div className="lg:col-span-2">
          <WeeklyHoursChart records={weekRecords} preferences={preferences} />
        </div>

        {/* Right 1 Col: Recent Attendance Records */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Recent Sessions
              </h3>
              <Link
                to="/attendance"
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p>No attendance records logged yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Use the Check In button above to start your first session.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentRecords.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.localDate}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatTime(item.checkInAt, preferences?.clockFormat, timezone)}
                        {item.checkOutAt && ` → ${formatTime(item.checkOutAt, preferences?.clockFormat, timezone)}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {item.totalMinutes ? formatDuration(item.totalMinutes) : 'In progress'}
                      </p>
                      <span
                        className={`text-[10px] uppercase font-semibold tracking-wider ${
                          item.status === 'completed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.status === 'active'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <Link
              to="/reports"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 font-medium"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Generate Monthly Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Incomplete Session Modal */}
      {incompleteRecord && (
        <IncompleteSessionModal
          record={incompleteRecord}
          preferences={preferences}
          isOpen={showIncompleteModal}
          onClose={() => setShowIncompleteModal(false)}
          onResolve={handleResolveIncomplete}
        />
      )}
    </div>
  );
};
