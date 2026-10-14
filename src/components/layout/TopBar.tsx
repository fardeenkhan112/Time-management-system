import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Laptop, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_TIMEZONE } from '../../utils/time';

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const { theme, actualTheme, setTheme } = useTheme();
  const { profile } = useAuth();
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Live Asia/Karachi authoritative clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = new Intl.DateTimeFormat('en-US', {
        timeZone: DEFAULT_TIMEZONE,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(now);

      const timePart = new Intl.DateTimeFormat('en-US', {
        timeZone: DEFAULT_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now);

      setCurrentTimeStr(`${datePart} · ${timePart} PKT`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (pathname: string): { section: string; title: string } => {
    switch (pathname) {
      case '/dashboard':
        return { section: 'Workspace', title: 'Attendance Dashboard' };
      case '/attendance':
        return { section: 'Records', title: 'Attendance History' };
      case '/reports':
        return { section: 'Analytics', title: 'Work-Hours Reports' };
      case '/settings':
        return { section: 'Preferences', title: 'Settings & Schedule' };
      default:
        return { section: 'WorkTrack', title: 'Overview' };
    }
  };

  const { section, title } = getPageTitle(location.pathname);

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors no-print">
      {/* Zone 1: Mobile Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
          <span className="text-slate-600 dark:text-slate-400 font-normal">{section}</span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
          <h1 className="text-slate-900 dark:text-slate-100 font-semibold truncate font-display">
            {title}
          </h1>
        </nav>
      </div>

      {/* Zone 2: Live Asia/Karachi Authoritative Clock */}
      <div className="hidden md:flex items-center text-xs text-slate-600 dark:text-slate-400 font-medium tabular-nums">
        <span>{currentTimeStr}</span>
      </div>

      {/* Zone 3: Actions (Theme Selector & Profile Badge) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme mode toggle button */}
        <button
          onClick={cycleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          title={`Current theme: ${theme}. Click to switch.`}
          aria-label="Toggle theme mode"
        >
          {theme === 'system' ? (
            <Laptop className="w-3.5 h-3.5" />
          ) : actualTheme === 'dark' ? (
            <Moon className="w-3.5 h-3.5" />
          ) : (
            <Sun className="w-3.5 h-3.5" />
          )}
          <span className="capitalize hidden sm:inline">{theme}</span>
        </button>

        {/* User avatar indicator */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
            {profile?.displayName?.charAt(0) || 'A'}
          </div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:inline max-w-[120px] truncate">
            {profile?.displayName || 'Arsalan Bhai'}
          </span>
        </div>
      </div>
    </header>
  );
};
