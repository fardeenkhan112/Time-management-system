import { Timestamp } from 'firebase/firestore';

export type AttendanceStatus = 'active' | 'completed' | 'incomplete';

export interface AttendanceRecord {
  id: string; // YYYY-MM-DD
  localDate: string; // YYYY-MM-DD in Asia/Karachi
  checkInAt: Timestamp | Date;
  checkOutAt?: Timestamp | Date | null;
  totalMinutes?: number | null;
  status: AttendanceStatus;
  notes?: string | null;
  isCorrected?: boolean;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  timezone: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface UserPreferences {
  timezone: string;
  clockFormat: '12h' | '24h';
  weeklySchedule: string[]; // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  expectedDailyMinutes: number; // e.g. 480 for 8 hours
  theme: 'system' | 'light' | 'dark';
  updatedAt?: Timestamp | Date;
}

export type ReportPreset =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'last-7-days'
  | 'last-30-days'
  | 'custom';

export interface ReportSummary {
  totalCompletedDays: number;
  totalRecordedMinutes: number;
  averageMinutesPerCompletedDay: number;
  incompleteCount: number;
  expectedTotalMinutes: number;
  records: AttendanceRecord[];
}
