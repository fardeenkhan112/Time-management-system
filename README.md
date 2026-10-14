# WorkTrack — Personal Office Time Management System

**WorkTrack** is a dedicated, production-grade personal office attendance tracking and working-hours management system created exclusively for **Arsalan Bhai**.

The application operates as an independent personal tracking platform:
- It has **zero integration** with office biometric machines or official corporate databases.
- It is architected for a **single authorized user** (Arsalan Bhai) with no employee management, multi-role HR modules, or public registrations.
- Features manual check-in upon arrival and check-out upon departure, a live real-time duration counter, automatic detection of unfinished sessions with manual correction dialogs, rich weekly/monthly reporting with Recharts, and RFC 4180 CSV export.

---

## 1. Technology Stack

- **Frontend Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React icons, Motion
- **Routing**: React Router DOM v7 (Client SPA with Protected Routes)
- **Backend & Cloud Platform**: Google Firebase (Authentication & Cloud Firestore)
- **Data Analytics & Charts**: Recharts, date-fns, date-fns-tz
- **Timezone**: Default authoritative timezone set to `Asia/Karachi` (UTC+05:00)

---

## 2. Folder Structure

```
├── .env.example                     # Environment template for Vite & Firebase
├── firebase-applet-config.json      # Provisioned Firebase client credentials
├── firebase-blueprint.json          # Intermediate schema blueprint for Firestore
├── firestore.rules                  # Hardened Zero-Trust ABAC Security Rules
├── firebase.json                    # Firebase deployment configuration
├── index.html                       # HTML entry point with Plus Jakarta Sans & DM Sans
├── metadata.json                    # AI Studio metadata
├── package.json                     # Project scripts and dependencies
├── src/
│   ├── App.tsx                      # Root application router and providers
│   ├── main.tsx                     # React root mount
│   ├── index.css                    # Tailwind CSS v4 theme layers & print media rules
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces for Attendance, User, Reports
│   ├── lib/
│   │   └── firebase.ts              # Centralized Firebase initialization & error handling
│   ├── context/
│   │   ├── AuthContext.tsx          # Firebase Auth observer, profile sync & methods
│   │   └── ThemeContext.tsx         # System Auto, Light, and Dark mode state
│   ├── services/
│   │   └── attendanceService.ts     # Firestore transactions, check-in/out, queries
│   ├── utils/
│   │   ├── time.ts                  # Asia/Karachi time math, presets & formatters
│   │   ├── time.test.ts             # Unit test suite for critical time calculations
│   │   └── csv.ts                   # RFC 4180 CSV generator with UTF-8 BOM
│   ├── components/
│   │   ├── ProtectedRoute.tsx       # Auth guard redirecting to /login
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Responsive collapsible desktop/mobile sidebar
│   │   │   ├── TopBar.tsx           # 3-zone header with live Asia/Karachi clock
│   │   │   └── AppLayout.tsx        # Shell layout for authenticated views
│   │   └── dashboard/
│   │       ├── AttendanceActionCard.tsx # Pre-checkin, active live timer & checkout
│   │       ├── SummaryCards.tsx         # Today, week, month, and completed days
│   │       ├── WeeklyHoursChart.tsx     # Recharts bar chart vs. daily target
│   │       └── IncompleteSessionModal.tsx# Manual recovery dialog for unfinished sessions
│   └── pages/
│       ├── LoginPage.tsx            # Secure email/password login & password reset
│       ├── DashboardPage.tsx        # Main live tracking & KPI overview
│       ├── AttendancePage.tsx       # Searchable & filterable history table
│       ├── ReportsPage.tsx          # 9 preset reports, metrics, CSV export & print
│       ├── SettingsPage.tsx         # Work schedule, target hours, timezone, themes
│       └── NotFoundPage.tsx         # 404 handler
```

---

## 3. Application Routes

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Secure email/password authentication & password reset modal |
| `/dashboard` | Protected | Live attendance action card, real-time counter, KPI cards & chart |
| `/attendance` | Protected | Complete searchable attendance history with date/status filters |
| `/reports` | Protected | 9 timeframe presets, aggregate metrics, trend chart, CSV download |
| `/settings` | Protected | Display preferences, target hours (4h–12h), weekly schedule, theme |
| `*` | Public | Professional 404 page |

---

## 4. One-Time Firebase Account Setup

WorkTrack is strictly gated to Arsalan Bhai's account. No public self-registration interface is provided.

To create the authorized user account:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your Firebase project (`gen-lang-client-0469409406`).
3. In the left navigation, click **Build** → **Authentication**.
4. Enable the **Email/Password** sign-in method under the **Sign-in method** tab.
5. In the **Users** tab, click **Add user**:
   - **Email**: Enter Arsalan Bhai's email (e.g. `arsalan@worktrack.app`).
   - **Password**: Set a secure initial password.
6. Share the credentials with Arsalan Bhai. On first sign-in, the system automatically initializes his user document (`users/{uid}`) and default preferences (`users/{uid}/settings/preferences`).

---

## 5. Firestore Data Model & Deterministic IDs

```
users/{uid}
├── displayName: string ("Arsalan Bhai")
├── email: string ("arsalan@worktrack.app")
├── timezone: string ("Asia/Karachi")
├── createdAt: timestamp
└── updatedAt: timestamp

users/{uid}/attendance/{YYYY-MM-DD}
├── localDate: string ("2026-10-14")
├── checkInAt: timestamp (authoritative serverTimestamp)
├── checkOutAt: timestamp | null
├── totalMinutes: number | null
├── status: "active" | "completed" | "incomplete"
├── notes: string | null
├── isCorrected: boolean
├── createdAt: timestamp
└── updatedAt: timestamp

users/{uid}/settings/preferences
├── timezone: string ("Asia/Karachi")
├── clockFormat: "12h" | "24h"
├── weeklySchedule: string[] (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
├── expectedDailyMinutes: number (480)
├── theme: "system" | "light" | "dark"
└── updatedAt: timestamp
```

### Deterministic Document Key: `YYYY-MM-DD`
Each attendance document key is strictly the calendar date in `Asia/Karachi` (e.g., `2026-10-14`). This guarantees:
- Maximum of **one attendance record per calendar day**.
- No duplicate records created under concurrent requests or double-clicks.
- Server-side validation enforcing `incoming().localDate == attendanceId`.

---

## 6. Firestore Security Rules

The application uses Attribute-Based Access Control (ABAC) in `firestore.rules`:
- **Default Deny Catch-All**: `match /{document=**} { allow read, write: if false; }`.
- **Identity Isolation**: Access is restricted strictly to `request.auth.uid == userId`.
- **Authoritative Timestamps**: `checkInAt` and `createdAt` must match server time on creation.
- **Immutable Fields**: `localDate`, `checkInAt`, and `createdAt` can never be modified during updates.
- **Controlled Transitions**: Status can only transition from `active` to `completed` or `incomplete` to `completed`.
- **No Unrestricted Deletes**: `allow delete: if false` prevents accidental loss of historical attendance records.

To deploy updated rules to Firebase:
```bash
firebase deploy --only firestore:rules
```

---

## 7. Local Development & Testing

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
The application dev server starts at `http://localhost:3000`.

### Running Automated Tests
WorkTrack includes automated tests verifying critical date math, elapsed minutes calculations (`floor((checkout - checkin) / 60000)`), timer formatters, and timezone range boundaries:
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## 8. Deployment to Firebase Hosting

To deploy the production build to Firebase Hosting:

1. Build the production assets:
   ```bash
   npm run build
   ```
2. Log in to Firebase CLI:
   ```bash
   npx firebase login
   ```
3. Deploy hosting and firestore rules:
   ```bash
   npx firebase deploy
   ```

---

## 9. Troubleshooting Common Issues

| Issue | Cause | Solution |
|---|---|---|
| "Invalid email or password" on login | Account has not been created yet in Firebase Console | Follow Section 4 to add Arsalan Bhai's email/password under Firebase Auth → Users. |
| Incomplete session warning banner | A check-in was left open overnight without checking out | Click **Resolve Session Now** on the dashboard to enter the actual departure time and notes. |
| Missing Firestore permission errors | Firestore security rules rejected an unauthenticated write | Ensure user is logged in and security rules are deployed (`firebase deploy --only firestore:rules`). |
