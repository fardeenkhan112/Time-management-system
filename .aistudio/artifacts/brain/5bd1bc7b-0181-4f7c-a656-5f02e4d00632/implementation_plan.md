# WorkTrack — Personal Office Time Management System

A dedicated, production-grade office attendance tracking and working-hours management system built exclusively for Arsalan Bhai. The application provides manual check-in/check-out with live duration tracking, historical attendance logs, date-range analytics, CSV export, and personal schedule configuration powered by Firebase Authentication and Cloud Firestore.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions have been aligned based on user clarification and project requirements:
>
> - **Authentication Standard**: **Strict Firebase Auth email & password login only** (no demo/mock toggles; authenticated user UID gating with zero public registration).
> - **Incomplete Session Handling**: **Flag as incomplete with a manual correction dialog** (sessions left open past local midnight are marked `incomplete` and require explicit, confirmed time correction rather than arbitrary auto-timestamps).
> - **Visual Theme & Styling**: **System auto theme with manual light/dark toggle** (featuring a refined Slate/Neutral palette, restrained Indigo accent, 1px hairline borders, and tabular numerals).
> - **Timezone & Date Grounding**: **Asia/Karachi (UTC+5)** as authoritative timezone for local calendar day boundaries, document ID naming (`YYYY-MM-DD`), and duration math.

---

### 1. Overview & Core Concept

- **What It Does**: WorkTrack enables Arsalan Bhai to manually record his office arrival and departure with one tap, tracks active working time in real-time, stores tamper-resistant attendance records in Firestore, and generates rich daily, weekly, monthly, and custom reports with CSV export and clean printing.
- **Target Audience / Persona**: Built specifically for a single authorized executive user (Arsalan Bhai) tracking personal working hours independently without any integration with office biometric machines or corporate payroll.
- **Key Value**: Delivers 100% personal data sovereignty, precise duration tracking down to the minute, transparent weekly/monthly productivity visibility, and seamless multi-device access across desktop, tablet, and mobile.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Authentication Flow (`/login`)**:
   - Clean, focused login form with email and password fields.
   - Password reset modal with Firebase reset email dispatch.
   - Clear validation, loading spinner states, and human-friendly Firebase error messages.
   - Automatic redirect to `/dashboard` upon successful login; unauthenticated route guarding for all other pages.

2. **Daily Attendance Flow (`/dashboard`)**:
   - **Pre-Check-In State**: Prominent current date/time card with Asia/Karachi clock, status badge indicating "Not Checked In", and high-intent "Check In" button.
   - **Active Session State**: Live elapsed timer (`0h 42m 15s`) pulsing with clean tabular figures, recorded check-in timestamp display, status badge indicating "In Progress", and clear "Check Out" button.
   - **Post-Check-Out State**: Summary of today's completed session (`7h 45m`), recorded arrival and departure times, and disabled check-in for the day with note: "Session Completed for Today".
   - **Incomplete Previous Session Recovery**: If a session was left open overnight, a prominent notification card appears alerting Arsalan Bhai of an incomplete session, offering a "Resolve Session" modal to enter the exact departure time.

3. **Attendance History Flow (`/attendance`)**:
   - Filterable data grid sorted newest first.
   - Filters: Date range picker (start date, end date), session status (All, Completed, Incomplete, Active).
   - Detailed record cards on mobile and tabular rows on desktop displaying Date, Check-In, Check-Out, Duration, and Status.
   - Single-record details view and controlled correction dialog with confirmation prompt.

4. **Analytics & Reports Flow (`/reports`)**:
   - Preset timeframes: Today, Yesterday, This Week, Last Week, This Month, Last Month, Last 7 Days, Last 30 Days, and Custom Range.
   - Summary metric strip: Total Completed Working Days, Total Recorded Hours, Average Daily Duration, and Incomplete Sessions Count.
   - Recharts visual bar chart showing daily hours against expected daily benchmark.
   - Filtered report preview table.
   - One-click native CSV Export (downloading formatted RFC 4180 CSV file) and browser Print mode (clean printable stylesheet hiding navigation bars).

5. **Preferences Flow (`/settings`)**:
   - Profile information display (Arsalan Bhai, email, UID).
   - Display format preferences: 12-hour (AM/PM) vs. 24-hour clock.
   - Timezone confirmation (Default: Asia/Karachi).
   - Work schedule setup: configurable working days (e.g. Mon–Fri) and expected daily hours (e.g. 8h 00m) for informational comparison in reports.
   - Theme toggle (System / Light / Dark).
   - Password reset trigger and secure account logout.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-end modern SaaS productivity dashboard; utilitarian clarity, restrained contrast, zero visual clutter, and zero decorative AI fluff.
- **Color Palette**:
  - *Light Canvas*: `#F8FAFC` (Slate 50), structural cards `#FFFFFF`, hairline border `#E2E8F0` (Slate 200), text `#0F172A` (Slate 900).
  - *Dark Canvas*: `#0B0F19` (Deep Slate), structural cards `#111827` (Gray 900), hairline border `#1F2937` (Gray 800), text `#F9FAFB` (Gray 50).
  - *Primary Accent (10% budget)*: Indigo 600 (`#4F46E5`), Indigo 500 hover (`#6366F1`), soft indigo focus rings.
  - *Semantic Tokens*: Emerald (`#10B981`) for completed sessions, Amber (`#F59E0B`) for active sessions, Rose/Crimson (`#EF4444`) for incomplete sessions.
- **Typography**:
  - Headings & Navigation: `Plus Jakarta Sans` / modern sans-serif with balanced kerning.
  - Body Prose & Labels: `DM Sans` / `Public Sans` for dense scannability.
  - Metrics, Timestamps, and Counters: `JetBrains Mono` / `tabular-nums` monospace figures to eliminate layout jitter.
- **Layout & Structure**:
  - Desktop: 260px collapsible sidebar navigation + sticky top bar with breadcrumbs, current Asia/Karachi date, theme toggle, and user profile avatar menu.
  - Mobile: Clean bottom navigation bar or slide-out sheet drawer, touch-friendly 44px+ interactive targets.
  - Zero-pill metadata discipline: dates, tags, and times rendered as clean unboxed text with `·` separators.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Deterministic Document IDs (`YYYY-MM-DD`)**:
  - *Chosen Approach*: Store daily attendance documents under `users/{uid}/attendance/{YYYY-MM-DD}`, where the ID is formatted in the user's local timezone (Asia/Karachi).
  - *Why*: Enforces the business rule of "maximum one attendance session per calendar day" at the database level, preventing duplicate writes or conflicting sessions without complex query scans.
  - *Alternatives Considered*: Auto-generated Firestore IDs with indexed queries. Rejected because they allow race conditions and duplicate check-ins for the same day.

- **Decision 2: Authoritative Server Timestamps vs. Live Timer**:
  - *Chosen Approach*: Check-in and check-out operations record Firestore `serverTimestamp()`. The live elapsed timer is purely an interface projection calculated from `Date.now() - checkInDate.getTime()`.
  - *Why*: Timestamps are tamper-proof and authoritative; local client clock shifts do not corrupt recorded work logs.

- **Decision 3: Flagging Incomplete Sessions with Recovery Dialog**:
  - *Chosen Approach*: A session opened on date $D$ that has not been checked out by the start of date $D+1$ is marked as `incomplete`. When Arsalan Bhai logs in, the dashboard detects the unfinished session and presents an explicit "Resolve Incomplete Session" dialog with time picker and reason notes.
  - *Why*: Never guesses an arbitrary checkout time (which violates business truth) while preventing the user from being locked out of checking in for the new day.

- **Decision 4: Real Client-Side CSV Generator & Print Stylesheet**:
  - *Chosen Approach*: Export reports via a robust RFC 4180 client-side CSV blob generator with sanitized cell escaping and a dedicated `@media print` CSS block that removes sidebars and headers for paper/PDF export.
  - *Why*: Instant generation, zero server latency, no 3rd-party dependencies, and zero sensitive data leakage.

---

### 4. Technical Architecture & Data Strategy

#### System & Component Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Application (Vite)                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     AuthContext & ThemeContext                   │  │
│  │      (Firebase Auth Observer · User Profile · Theme Mode)        │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
│  ┌──────────────────▼───────────────────────────────────────────────┐  │
│  │                    App Router (React Router DOM)                 │  │
│  │                                                                  │  │
│  │   /login ─────────── ProtectedRoute Wrapper                      │  │
│  │                            │                                     │  │
│  │              ┌─────────────┼─────────────┬─────────────┐         │  │
│  │              ▼             ▼             ▼             ▼         │  │
│  │         /dashboard    /attendance     /reports     /settings     │  │
│  └──────────────┬─────────────┬─────────────┬─────────────┬─────────┘  │
│                 │             │             │             │            │
│  ┌──────────────▼─────────────▼─────────────▼─────────────▼─────────┐  │
│  │                     Shared Layout & UI System                    │  │
│  │     - Collapsible Sidebar      - TopBar (Breadcrumbs & Date)     │  │
│  │     - LiveTimer Component      - AttendanceTable & Filters       │  │
│  │     - SummaryCards             - WorkHoursChart (Recharts)       │  │
│  │     - IncompleteSessionModal   - CSVExporter & PrintView         │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
│  ┌──────────────────▼───────────────────────────────────────────────┐  │
│  │             Firebase Services & Custom Hooks Layer               │  │
│  │   - useAttendanceSession: active state, live counter, check-in/out│  │
│  │   - useAttendanceHistory: query by range, status filters, limits │  │
│  │   - useAttendanceReports: aggregate hours, days, averages        │  │
│  │   - attendanceService: Firestore transaction & doc mutations     │  │
│  │   - timeUtils: Asia/Karachi timezone, duration formatting        │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
└─────────────────────┼──────────────────────────────────────────────────┘
                      │ WebChannel / TLS
┌─────────────────────▼──────────────────────────────────────────────────┐
│                     Google Firebase Cloud Platform                     │
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │     Firebase Authentication   │  │        Cloud Firestore        │  │
│  │   - Email / Password Login    │  │   - users/{uid}               │  │
│  │   - Password Reset Dispatch   │  │   - users/{uid}/attendance/   │  │
│  │   - Token & Session Security  │  │   - users/{uid}/settings/     │  │
│  └───────────────────────────────┘  │   - Hardened Security Rules   │  │
│                                     └───────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Firestore Data Model

```
users/{uid}
├── displayName: string ("Arsalan Bhai")
├── email: string ("user@worktrack.app")
├── timezone: string ("Asia/Karachi")
├── createdAt: timestamp
└── updatedAt: timestamp

users/{uid}/attendance/{YYYY-MM-DD}
├── localDate: string ("2026-10-14")
├── checkInAt: timestamp (authoritative server time)
├── checkOutAt: timestamp | null
├── totalMinutes: number | null
├── status: "active" | "completed" | "incomplete"
├── notes: string | null (correction notes if adjusted)
├── isCorrected: boolean
├── createdAt: timestamp
└── updatedAt: timestamp

users/{uid}/settings/preferences
├── timezone: string ("Asia/Karachi")
├── clockFormat: "12h" | "24h"
├── weeklySchedule: string[] (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
├── expectedDailyMinutes: number (480 = 8 hours)
├── theme: "system" | "light" | "dark"
└── updatedAt: timestamp
```

#### Security Rules Architecture (`firestore.rules`)
- **Default Deny**: `match /{document=**} { allow read, write: if false; }`
- **User Document**: Restricted strictly to `request.auth != null && request.auth.uid == userId`.
- **Attendance Subcollection**:
  - `allow read, list`: Permitted only if `request.auth.uid == userId`.
  - `allow create`: Permitted only if `request.auth.uid == userId`, document ID matches `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`, `status == "active"`, and `checkInAt == request.time`.
  - `allow update`: Permitted only if `request.auth.uid == userId`, status transitions from `active` to `completed` or `incomplete` to `completed`, immutable fields (`localDate`, `checkInAt`, `createdAt`) remain unchanged, and `updatedAt == request.time`.
  - `allow delete`: Disabled by default to preserve historical audit integrity.

#### Dependencies to Install
- `firebase`: Official Firebase Web SDK for Auth and Firestore.
- `react-router-dom`: Client-side single-page routing.
- `recharts`: Responsive visual charts for weekly/daily work hours.
- `date-fns` & `date-fns-tz`: Modern date manipulation and Asia/Karachi timezone boundary calculation.

---

### 5. Step-by-Step Implementation Strategy

1. **Step 1: Dependency Installation & Project Configuration**:
   - Install `firebase`, `react-router-dom`, `recharts`, `date-fns`, and `date-fns-tz`.
   - Configure Tailwind CSS v4 custom theme tokens and typography utilities.
   - Set up HTML title, meta tags, and `metadata.json` for WorkTrack.
2. **Step 2: Firebase Configuration & Security Rules**:
   - Create `src/lib/firebase.ts` with graceful initialization from environment variables.
   - Create `firebase-blueprint.json` and strict `firestore.rules` adhering to the Eight Pillars of Hardened Rules.
   - Set up `.env.example` with standard `VITE_FIREBASE_*` configuration variables.
3. **Step 3: Core Time, Timezone & Duration Utilities**:
   - Implement `src/utils/time.ts`: Asia/Karachi date conversions, local calendar day ID generator, elapsed duration math (`floor((out - in) / 60000)`), and human-friendly formatters (`8h 15m`).
4. **Step 4: Authentication & Context Layer**:
   - Implement `AuthContext` with Firebase Auth listener, user state, login, password reset, and logout methods.
   - Implement `ThemeContext` supporting System Auto, Light, and Dark modes.
   - Implement `ProtectedRoute` redirecting unauthenticated users to `/login`.
5. **Step 5: Shared Layout & Navigation**:
   - Modern collapsible desktop sidebar (260px) + mobile navigation.
   - Top header with Asia/Karachi live date display, breadcrumb navigation, and user profile menu.
   - Clean toast notification and modal dialog primitives.
6. **Step 6: Dashboard Page & Live Attendance Timer**:
   - Summary stat cards: Today's duration, This Week's total, This Month's total, Completed Days count.
   - Action Card: Check In, Live Elapsed Counter with animated indicator, and Check Out button.
   - Incomplete session warning banner and quick-resolution dialog.
   - Weekly working-hours bar chart (Recharts) and recent attendance records.
7. **Step 7: Attendance History Page**:
   - Comprehensive table with sortable columns: Date, Check-In, Check-Out, Duration, Status, Actions.
   - Filter controls: Date range picker and Status dropdown.
   - Session detail view and manual correction workflow.
8. **Step 8: Analytics & Reports Page**:
   - 9 preset timeframe filters (Today, Yesterday, This Week, Last Week, This Month, Last Month, 7d, 30d, Custom).
   - KPI aggregate metrics (Total Hours, Completed Days, Daily Average).
   - Working hours trend chart.
   - One-click RFC 4180 CSV export and dedicated `@media print` clean report layout.
9. **Step 9: Settings Page**:
   - User profile details, 12h/24h clock toggle, schedule configuration (active days, target hours), theme selector, and password change.
10. **Step 10: Verification, Testing & Polish**:
    - End-to-end flow verification, responsive layout validation on desktop and mobile, and production build compilation (`compile_applet`).
