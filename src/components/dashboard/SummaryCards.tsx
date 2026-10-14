import React from 'react';
import { Clock, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';
import { formatDuration } from '../../utils/time';

interface SummaryCardsProps {
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  completedDaysCount: number;
  expectedDailyMinutes: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  todayMinutes,
  weekMinutes,
  monthMinutes,
  completedDaysCount,
  expectedDailyMinutes,
}) => {
  const cards = [
    {
      label: "Today's Hours",
      value: formatDuration(todayMinutes),
      subtext: expectedDailyMinutes > 0 ? `Target: ${formatDuration(expectedDailyMinutes)}` : 'Recorded today',
      icon: Clock,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
    },
    {
      label: "This Week's Total",
      value: formatDuration(weekMinutes),
      subtext: 'Mon – Sun in Asia/Karachi',
      icon: Calendar,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      label: "This Month's Total",
      value: formatDuration(monthMinutes),
      subtext: 'Calendar month accumulated',
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'Completed Days',
      value: completedDaysCount.toString(),
      subtext: 'Finalized attendance sessions',
      icon: CheckCircle2,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-8 h-8 rounded-lg ${card.bgColor} ${card.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {card.value}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
