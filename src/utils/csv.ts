import { AttendanceRecord } from '../types';
import { formatTime, formatDuration, formatShortDate } from './time';

export function escapeCsvCell(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAttendanceToCsv({
  userName,
  periodTitle,
  records,
  clockFormat = '12h',
  timezone = 'Asia/Karachi',
}: {
  userName: string;
  periodTitle: string;
  records: AttendanceRecord[];
  clockFormat?: '12h' | '24h';
  timezone?: string;
}): void {
  const rows: string[][] = [];

  // Report Header Metadata
  rows.push(['# WorkTrack Attendance Report']);
  rows.push([`# User: ${userName}`]);
  rows.push([`# Period: ${periodTitle}`]);
  rows.push([`# Timezone: ${timezone}`]);
  rows.push([`# Generated: ${new Date().toISOString()}`]);
  rows.push([]); // blank separator

  // Table Columns
  rows.push([
    'Date',
    'Day',
    'Check-In Time',
    'Check-Out Time',
    'Working Duration (Hours/Min)',
    'Total Minutes',
    'Status',
    'Notes / Correction',
  ]);

  // Data rows
  records.forEach((record) => {
    const dayOfWeek = record.localDate
      ? new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(record.localDate))
      : '—';

    const checkInStr = formatTime(record.checkInAt, clockFormat, timezone);
    const checkOutStr = record.checkOutAt ? formatTime(record.checkOutAt, clockFormat, timezone) : '—';
    const durationStr = record.totalMinutes !== null && record.totalMinutes !== undefined
      ? formatDuration(record.totalMinutes)
      : '—';
    const totalMinutesStr = record.totalMinutes !== null && record.totalMinutes !== undefined
      ? String(record.totalMinutes)
      : '0';

    rows.push([
      record.localDate,
      dayOfWeek,
      checkInStr,
      checkOutStr,
      durationStr,
      totalMinutesStr,
      record.status.toUpperCase(),
      record.notes || (record.isCorrected ? 'Corrected' : ''),
    ]);
  });

  // Calculate totals
  const completedRecords = records.filter((r) => r.status === 'completed');
  const totalMinutes = completedRecords.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);
  const avgMinutes = completedRecords.length > 0 ? Math.round(totalMinutes / completedRecords.length) : 0;

  rows.push([]);
  rows.push(['# SUMMARY']);
  rows.push([`# Total Completed Days: ${completedRecords.length}`]);
  rows.push([`# Total Working Time: ${formatDuration(totalMinutes)} (${totalMinutes} minutes)`]);
  rows.push([`# Daily Average: ${formatDuration(avgMinutes)}`]);

  // Convert to CSV string with CRLF
  const csvContent = '\uFEFF' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');

  // Trigger browser download via Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeTitle = periodTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  anchor.href = url;
  anchor.download = `worktrack_attendance_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
