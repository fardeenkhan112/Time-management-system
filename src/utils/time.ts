import { Timestamp } from 'firebase/firestore';

export const DEFAULT_TIMEZONE = 'Asia/Karachi';

/**
 * Returns current Date adjusted or represented in Asia/Karachi.
 */
export function getNowInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  return new Date();
}

/**
 * Returns YYYY-MM-DD string for a given date in the target timezone (Asia/Karachi).
 */
export function getLocalDateString(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // outputs YYYY-MM-DD
}

/**
 * Converts a Timestamp or Date or string to a JavaScript Date object.
 */
export function toJsDate(val: Timestamp | Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats time according to user's 12h or 24h clock preference in specified timezone.
 */
export function formatTime(
  val: Timestamp | Date | string | null | undefined,
  clockFormat: '12h' | '24h' = '12h',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = toJsDate(val);
  if (!date) return '—';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: clockFormat === '12h',
  };

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Formats a date into a human readable string (e.g. "Wednesday, Oct 14, 2026").
 */
export function formatReadableDate(
  val: Timestamp | Date | string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = toJsDate(val);
  if (!date) return '—';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format date in short form (e.g. "Oct 14, 2026")
 */
export function formatShortDate(
  dateStrOrDate: string | Date | Timestamp,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (typeof dateStrOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStrOrDate)) {
    const [y, m, d] = dateStrOrDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }
  const date = toJsDate(dateStrOrDate);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Calculates working duration in minutes between check-in and check-out.
 * Formula: elapsedMinutes = floor((checkoutTimestamp - checkinTimestamp) / 60000)
 */
export function calculateElapsedMinutes(
  checkIn: Timestamp | Date | string,
  checkOut: Timestamp | Date | string
): number {
  const inDate = toJsDate(checkIn);
  const outDate = toJsDate(checkOut);
  if (!inDate || !outDate) return 0;
  const diffMs = outDate.getTime() - inDate.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 60000);
}

/**
 * Formats minutes into human-readable duration string:
 * e.g. 490 -> "8h 10m", 45 -> "45m", 0 -> "0m"
 */
export function formatDuration(totalMinutes: number | null | undefined): string {
  if (totalMinutes === null || totalMinutes === undefined || totalMinutes < 0) {
    return '—';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Formats elapsed seconds into ticking live timer string: HH:MM:SS
 */
export function formatLiveTimer(elapsedSeconds: number): string {
  const sec = Math.max(0, Math.floor(elapsedSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Computes start and end dates (YYYY-MM-DD strings) for common report presets in Asia/Karachi.
 */
export function getPresetDateRange(
  preset: string,
  timezone: string = DEFAULT_TIMEZONE
): { startDate: string; endDate: string } {
  const todayStr = getLocalDateString(new Date(), timezone);
  const [year, month, day] = todayStr.split('-').map(Number);
  const todayDate = new Date(year, month - 1, day);

  const formatDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dayNum = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };

    case 'yesterday': {
      const yDate = new Date(todayDate);
      yDate.setDate(yDate.getDate() - 1);
      const str = formatDateStr(yDate);
      return { startDate: str, endDate: str };
    }

    case 'this-week': {
      // Monday as week start
      const d = new Date(todayDate);
      const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { startDate: formatDateStr(monday), endDate: formatDateStr(sunday) };
    }

    case 'last-week': {
      const d = new Date(todayDate);
      const dayOfWeek = d.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMonday = new Date(d);
      thisMonday.setDate(d.getDate() + diffToMonday);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return { startDate: formatDateStr(lastMonday), endDate: formatDateStr(lastSunday) };
    }

    case 'this-month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0); // last day of current month
      return { startDate: formatDateStr(start), endDate: formatDateStr(end) };
    }

    case 'last-month': {
      const start = new Date(year, month - 2, 1);
      const end = new Date(year, month - 1, 0);
      return { startDate: formatDateStr(start), endDate: formatDateStr(end) };
    }

    case 'last-7-days': {
      const start = new Date(todayDate);
      start.setDate(todayDate.getDate() - 6);
      return { startDate: formatDateStr(start), endDate: todayStr };
    }

    case 'last-30-days': {
      const start = new Date(todayDate);
      start.setDate(todayDate.getDate() - 29);
      return { startDate: formatDateStr(start), endDate: todayStr };
    }

    default:
      return { startDate: todayStr, endDate: todayStr };
  }
}
