import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { AttendanceRecord, UserPreferences } from '../../types';
import { formatDuration } from '../../utils/time';
import { useTheme } from '../../context/ThemeContext';

interface WeeklyHoursChartProps {
  records: AttendanceRecord[];
  preferences: UserPreferences | null;
}

export const WeeklyHoursChart: React.FC<WeeklyHoursChartProps> = ({ records, preferences }) => {
  const { actualTheme } = useTheme();
  const expectedMinutes = preferences?.expectedDailyMinutes || 480; // 8 hours default
  const expectedHours = Math.round((expectedMinutes / 60) * 10) / 10;

  // Build Mon - Sun days mapping
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Map each record to day of week
  const dayMinutesMap: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  records.forEach((record) => {
    if (record.localDate && record.totalMinutes) {
      const [y, m, d] = record.localDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const dayIndex = date.getDay(); // 0 is Sun, 1 is Mon...
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
      if (dayMinutesMap[dayName] !== undefined) {
        dayMinutesMap[dayName] += record.totalMinutes;
      }
    }
  });

  const chartData = daysOfWeek.map((day) => {
    const minutes = dayMinutesMap[day] || 0;
    const hours = Math.round((minutes / 60) * 100) / 100;
    return {
      day,
      hours,
      minutes,
      formatted: formatDuration(minutes),
    };
  });

  const isDark = actualTheme === 'dark';
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';
  const barColor = '#4F46E5'; // Indigo-600
  const activeBarColor = '#6366F1'; // Indigo-500

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Weekly Working Hours
          </h3>
          <p className="text-xs text-slate-500">
            Recorded daily durations compared to target ({expectedHours}h daily)
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
            <span>Worked Hours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-400 dark:border-slate-500 inline-block" />
            <span>Target ({expectedHours}h)</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
              stroke={textColor}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              stroke={textColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}h`}
            />
            <Tooltip
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white dark:bg-slate-800 p-2.5 rounded-lg text-xs shadow-lg border border-slate-700">
                      <p className="font-semibold">{data.day}</p>
                      <p className="text-indigo-300 font-mono mt-1 tabular-nums">
                        Worked: {data.formatted} ({data.hours} hrs)
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        Target: {expectedHours} hrs
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {expectedHours > 0 && (
              <ReferenceLine
                y={expectedHours}
                stroke={isDark ? '#64748B' : '#94A3B8'}
                strokeDasharray="3 3"
              />
            )}
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.hours >= expectedHours ? '#10B981' : barColor}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
