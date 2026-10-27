# MediConnect BD Frontend Structure

This guide defines the modular, role-domain frontend architecture for **MediConnect BD**, modeled directly after **DokanBD (`EASCA-project1`)**. The goal is to make each clinical, patient, public, and administrative feature easy to find, understand, test, and evolve.

## 1. The Core Rule

Use one module folder per business feature inside its role domain (`admin/`, `doctor/`, `patient/`, `public/`):

```text
<domain>/<module>/
├── <Module>Page.tsx       # thin page composition root (< 150 lines)
├── components/            # named UI sections (< 250 lines each)
├── hooks/                 # API loading and stateful workflows
├── utils/                 # pure calculations and status mappers
├── <Module>.module.css    # feature-scoped CSS Module (when needed)
└── index.ts               # the module's public barrel export
```

Authentication (`src/features/auth/`) intentionally remains in its dedicated folder.

## 2. Responsibilities

### Route Ownership (`src/routes/AppRouter.tsx`)
`AppRouter.tsx` imports domain modules from their barrel `index.ts` files:

```ts
import { AdminOverviewPage } from "../admin/dashboard";
import { DoctorAppointmentsPage } from "../doctor/appointments";
import { AppointmentsPage } from "../patient/appointments";
import { DoctorDetailPage, DoctorSearchPage } from "../public/doctors";
```

Compatibility re-exports in `src/features/*` remain as one-line aliases so older imports continue to resolve cleanly.

### Page (`<Module>Page.tsx`)
Reads route parameters, calls the module's custom hook, and composes visual sections. Pages do not embed raw `fetch` or multi-hundred-line inline tables/forms.

### Components (`components/`)
Created when a UI block has a clear name and responsibility (e.g., `OverviewSummaryCards`, `ActiveAppointmentCard`, `SlotHoldBanner`, `AvailabilityScheduleGrid`).

### Hooks (`hooks/`)
Own asynchronous loading, state transitions, and refresh callbacks (e.g., `useAdminOverview`, `useDoctorQueue`, `useDoctorDetail`, `usePatientAppointments`). Hooks never return JSX.

### Utilities (`utils/`)
Pure functions with no React state or network calls (e.g., `appointmentStatusTone`, `refundAmountFor`, `previewPatientRefund`).

### Styling (`src/styles/` + CSS Modules + Tailwind v4)
- `src/styles/tokens.css`: Brand color tokens (`--primary`, `--surface`, `--border`, `--radius-*`, `--shadow-*`).
- `src/styles/tailwind.css`: Tailwind v4 `@import "tailwindcss" source(none);` + `@source` directives.
- `src/styles/base.css`, `layout.css`, `components.css`: Global reset, typography, and shared UI primitives (`.btn`, `.btn-ghost`, `.btn-icon`, `.eyebrow`, `.card`).
- `*.module.css`: Scoped styles for shells and feature dashboards (`AdminLayout.module.css`, `AdminHeader.module.css`, `AdminSidebar.module.css`, `PublicHeader.module.css`, `AdminOverview.module.css`).

## 3. Application-Area Map

```text
frontend/src/
├── routes/                        # AppRouter.tsx and RoleRoute guards
├── layouts/                       # MainLayout.tsx and AdminLayout.tsx (+ CSS Module)
├── admin/                         # Administrator console modules
│   ├── layout/AdminHeader/        # Sticky top bar for /admin/*
│   ├── navigation/AdminSidebar/   # Collapsible dark sidebar (248px / 76px)
│   ├── dashboard/                 # Overview KPIs, commission totals, top doctors/specialties
│   ├── applications/              # BMDC doctor application review queue
│   ├── users/                     # Account search, role filter, status management
│   ├── catalog/                   # Specialties & hospitals CRUD
│   └── operations/                # Appointments, payments (15% split), and refunds
├── doctor/                        # Doctor clinical workspace modules
│   ├── dashboard/                 # Earnings, clinical profile, weekly schedule & time-off
│   ├── appointments/              # Active & past patient queue, video room, history
│   └── prescriptions/             # Issued prescriptions & 24h edit/delete window
├── patient/                       # Signed-in patient portal modules
│   ├── appointments/              # Upcoming/past visits, payment, reschedule, refund preview
│   ├── prescriptions/             # Digital prescriptions & PDF download
│   ├── reports/                   # Medical report upload (<= 2 MB) & download
│   └── family-members/            # Dependent profiles for family booking
├── public/                        # Public visitor & pharmacy verification modules
│   ├── shell/PublicHeader/        # Sticky role-aware navigation header
│   ├── doctors/                   # Public directory search & 7-day slot booking
│   └── verify-prescription/       # Public 16-char prescription verification
├── api/                           # Typed HTTP client and domain API modules
├── components/ui/                 # Shared UI primitives (Button, Card, Field, Badge, Alert)
├── shared/                        # Types, refund policy preview, Dhaka date/money formatters
└── features/auth/                 # Authentication context, LoginPage, RegisterPage
```
