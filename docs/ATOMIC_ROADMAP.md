# MediConnect BD - Current State and Atomic Implementation Roadmap

> **Updated:** October 27, 2026
> **Project root:** `/home/mehedi/Desktop/MediConnectBD`
> **Source of truth:** actual source code, tests, and the client requirements PDF. This file is a coding plan, not proof that a feature works.

---

## 1. Read This Before Coding

This roadmap is deliberately written for a low-context coding model.

### Rules for every step

1. Complete **one numbered step only**. Do not begin the next step in the same task.
2. Read the files named by that step before editing.
3. Change only the files named by that step unless TypeScript requires one directly related import or test change.
4. Run the stated verification command after editing.
5. If verification fails, fix only that failure. Do not refactor unrelated code.
6. Do not claim a feature works unless its stated verification passed.
7. Do not read, print, commit, or replace private values in `MediConnectBDbackend/.env`.
8. Stop and ask the project owner when a step says **Decision required**. Do not invent payment, email, video, domain, or production credentials.

### Commands used by this roadmap

```bash
# Run frontend tests
npm --prefix frontend test

# Run backend tests
npm --prefix MediConnectBDbackend test

# Validate both applications
npm run build

# Show only intentional changes before finishing a step
git status --short
git diff --check
```

---

## 2. Verified Current State

### Implemented foundation

- React 19 + TypeScript frontend in `frontend/`.
- Express + TypeORM + MySQL backend in `MediConnectBDbackend/`.
- Redis/BullMQ worker for unpaid-hold expiry and email-reminder scheduling.
- Patient, doctor, and admin authentication with JWT access tokens and rotating HTTP-only refresh cookies.
- Doctor application approval, public doctor directory, schedules, slot holds, booking, family-member booking, cancellation, rescheduling, reviews, medical reports, prescriptions, and admin operations.
- Docker Compose local-development setup in `docker-compose.yml`.

### Validation completed on October 27, 2026

- Frontend tests: **28 passed** in 12 test files.
- Backend tests: **199 passed**; the optional disposable-MySQL integration suite is skipped when its dedicated test socket is unavailable.
- Frontend production build: passed.
- Backend typecheck and build: passed.
- Frontend lint: no errors; one existing Fast Refresh warning in `frontend/src/features/auth/AuthContext.tsx`.

### Do not assume these services are running

The documentation must not claim that the frontend, backend, Redis, or worker is running. Start services only when a task needs them.

---

## 3. Known Product Gaps (Priority Order)

| Priority | Gap | Why it matters |
| --- | --- | --- |
| P0 | The payment page hides the SSLCommerz checkout link after the backend creates it. | A patient cannot complete a video-payment flow from the UI. |
| P0 | The UI labels commission as 15%, but the payment ledger calculates 10%. | Earnings and admin reporting are misleading. |
| P0 | The video room is a visual mock, not a real video call. | It does not meet the core teleconsultation requirement. |
| P1 | Refund submission changes a database status only. | No actual provider refund is executed. |
| P1 | The public doctor UI exposes only name and specialty filters. | The backend already supports hospital, area, and fee filters. |
| P1 | Email falls back to console output when SMTP is not configured. | Real patients will not receive notifications. |
| P1 | The Docker setup is development-only. | It is not safe to deploy directly to the public internet. |

---

## 4. Atomic Next Coding Steps

### Phase A - Fix existing broken behavior

### Completed - Step 01 - Correct visible commission labels

**Completed:** 2026-10-27
- Changed:
  - `frontend/src/doctor/dashboard/components/DoctorEarningsSection/DoctorEarningsSection.tsx`
  - `frontend/src/admin/operations/components/AdminPaymentsTable.tsx`
  - `frontend/src/admin/dashboard/components/OverviewSummaryCards.tsx`
  - `frontend/src/admin/dashboard/components/TopSpecialtiesAndDoctors.tsx`
  - `frontend/src/admin/operations/hooks/useAdminOperations.ts`
  - `frontend/src/admin/operations/AdminOperationsPage.tsx`
- Verified:
  - `npm --prefix frontend test`: 28 tests passed in 12 test files.
  - `npm --prefix frontend run build`: build succeeded cleanly with 0 errors.

---

### Completed - Step 02 - Correct the legacy earnings fallback

**Completed:** 2026-10-27
- Changed:
  - `MediConnectBDbackend/src/modules/doctors/typeorm-doctor.repository.ts`
  - `MediConnectBDbackend/tests/commission.test.ts`
  - `MediConnectBDbackend/tests/doctor.service.test.ts`
- Verified:
  - `npm --prefix MediConnectBDbackend test`: 200 tests passed in 22 test files (1 integration file skipped).
  - `npm --prefix MediConnectBDbackend run typecheck`: passed with 0 errors.

---

### Completed - Step 03 - Show the payment gateway link

**Completed:** 2026-10-27
- Changed: `frontend/src/patient/appointments/components/PaymentPanel/PaymentPanel.tsx`
- Verified: `npm --prefix frontend test` passed (28 tests), `npm --prefix frontend run build` succeeded cleanly with 0 errors.

---

### Completed - Step 04 - Add a payment-panel regression test

**Completed:** 2026-10-27
- Changed: `frontend/src/patient/appointments/components/PaymentPanel/PaymentPanel.tsx`, `frontend/src/patient/appointments/tests/PaymentPanel.test.tsx`
- Verified: `npm --prefix frontend test` passed (30 tests in 13 test files); regression test confirmed failing when checkout link was temporarily restricted to `INITIATED` only.

---

### Completed - Step 05 - Make payment completion understandable

**Completed:** 2026-10-27
- Changed: `frontend/src/patient/appointments/components/PaymentPanel/PaymentPanel.tsx`, `frontend/src/patient/appointments/components/PaymentPanel/PaymentPanel.module.css`, `frontend/src/patient/appointments/tests/PaymentPanel.test.tsx`
- Verified: `npm --prefix frontend test` passed (32 tests in 13 test files); `npm --prefix frontend run build` passed with zero errors. Clear server-reconciliation feedback messages (success, pending, error) and explicit "I completed payment - verify now" action added without trusting client redirects.

---

### Completed - Step 06 - Make the manual refund workflow honest

**Completed:** 2026-10-27
- Changed: `frontend/src/admin/operations/components/AdminRefundsTable.tsx`, `frontend/src/admin/operations/hooks/useAdminOperations.ts`, `frontend/src/admin/operations/tests/AdminRefundsTable.test.tsx`
- Verified: `npm --prefix frontend test` passed (34 tests in 14 test files); `npm --prefix frontend run build` passed with zero errors. Clarified that automated payment provider refunds do not exist, renamed action button to "Mark for manual refund", updated success notice to "Refund recorded for manual processing", and added on-page guidance explaining manual provider/bank reconciliation.

---

### Phase B - Complete core client requirements

### Completed - Step 07 - Decision required: choose the video provider

**Completed:** 2026-10-27
- **Selected Provider:** Daily.co (WebRTC) — provides 10,000 participant-minutes/month permanently free for development with zero infrastructure maintenance.
- **First Release Scope:** Teleconsultation 1-on-1 audio/video call, camera/mic toggle, device selectors, network quality indicators, and screen sharing. Built-in chat included.
- **Security & Storage:**
  - `DAILY_API_KEY` and optional `DAILY_DOMAIN` configured via validated environment variables.
  - Ephemeral private rooms created via Daily REST API with automated expiry (30 minutes after consultation end).
  - Meeting tokens (`token`) generated per participant: doctor as room owner/moderator (`is_owner: true`), patient as authenticated attendee (`is_owner: false`).
  - Fallback local loopback mock driver when `DAILY_API_KEY` is omitted, so offline dev and test suites remain green.

---

### Completed - Step 08 - Create a real video-session backend contract

**Completed:** 2026-10-27
- Changed: `MediConnectBDbackend/src/modules/appointments/video-provider.ts`, `MediConnectBDbackend/src/modules/appointments/appointment.service.ts`, `MediConnectBDbackend/src/modules/appointments/typeorm-appointment.repository.ts`, `MediConnectBDbackend/src/config/env.ts`, `MediConnectBDbackend/src/modules/appointments/appointment.types.ts`, `MediConnectBDbackend/src/modules/appointments/appointment.repository.ts`, `MediConnectBDbackend/src/server.ts`, `MediConnectBDbackend/tests/video-provider.test.ts`
- Verified: `npm --prefix MediConnectBDbackend test` passed (206 passed, 5 skipped across 24 test suites); `npm --prefix MediConnectBDbackend run typecheck` passed with zero errors. Provider secrets, fixed signing keys, and Jitsi URLs removed from repository class; validated `DAILY_API_KEY` and `DAILY_DOMAIN` in `env.ts`; created `DailyVideoProvider` with fallback `MockVideoProvider` for test and offline dev; validated 5-minute video window and actor ownership.

---

### Completed - Step 09 - Embed the real video call in the frontend

**Completed:** 2026-10-27
- Changed: `frontend/src/patient/appointments/components/VideoSessionPanel/VideoSessionPanel.tsx`, `frontend/src/patient/appointments/components/VideoSessionPanel/VideoSessionPanel.module.css`, `frontend/src/patient/appointments/tests/VideoSessionPanel.test.tsx`
- Verified: `npm --prefix frontend test` passed (36 passed across 15 test suites); `npm --prefix frontend run build` passed with zero errors. Replaced fake room screen and non-functional mock toggle buttons with Daily.co Prebuilt secure iframe embed (`camera; microphone; fullscreen; display-capture; autoplay`) using the tokenized session URL from Step 08. Removed misleading "Secure WebRTC / Twilio-backed room" heading; added clear error handling, leave/exit actions, and explicit development mock mode indicator when Daily keys are omitted.

---

### Completed - Step 10 - Add video chat and file sharing, if approved

**Completed:** 2026-10-27
- Changed: `frontend/src/patient/appointments/components/VideoSessionPanel/VideoSessionPanel.tsx`, `frontend/src/patient/appointments/components/VideoSessionPanel/VideoSessionPanel.module.css`, `frontend/src/patient/appointments/tests/VideoSessionPanel.test.tsx`, `MediConnectBDbackend/tests/medical-report.service.test.ts`
- Verified: `npm --prefix MediConnectBDbackend test` passed (207 passed, 5 skipped across 24 test suites); `npm --prefix frontend test` passed (36 passed across 15 test suites); `npm --prefix frontend run build` passed with zero errors. Configured built-in text chat and screen sharing in Daily.co Prebuilt call window (`enable_chat: true`); added dedicated in-call clinical file-sharing drawer to `VideoSessionPanel` enforcing appointment patient-doctor relationship on uploads and downloads, with strict backend authorization regression tests blocking unrelated third parties.

---

### Completed - Step 11 - Add the missing public doctor filters

**Completed:** 2026-10-28
- Changed: `frontend/src/public/doctors/hooks/useDoctorSearch.ts`, `frontend/src/public/doctors/components/DoctorSearchFilters/DoctorSearchFilters.tsx`, `frontend/src/public/doctors/components/DoctorSearchFilters/DoctorSearchFilters.module.css`, `frontend/src/public/doctors/DoctorSearchPage.tsx`, `frontend/src/public/doctors/utils/doctorSearch.utils.ts`, `frontend/src/public/doctors/tests/doctorSearch.utils.test.ts`, `frontend/src/public/doctors/tests/DoctorSearchFilters.test.tsx`
- Verified: `npm --prefix frontend test` passed (41 passed across 16 test suites); `npm --prefix frontend run build` passed with zero errors. Loaded hospital catalog; exposed hospital, area, minimum fee, and maximum fee filters; constructed debounced query parameters containing only non-empty parameters; and implemented a "Clear filters" action returning the default search.

---

### Completed - Step 12 - Add a safe medical-report upload policy

**Completed:** 2026-10-28
- Changed: `MediConnectBDbackend/src/modules/patients/medical-report.schema.ts`, `MediConnectBDbackend/src/modules/patients/medical-report.service.ts`, `MediConnectBDbackend/tests/medical-report.service.test.ts`, `frontend/src/patient/reports/components/ReportUploadForm.tsx`, `frontend/src/patient/reports/tests/ReportUploadForm.test.tsx`
- Verified: `npm --prefix MediConnectBDbackend test` passed (208 passed, 5 skipped across 24 test suites); `npm --prefix MediConnectBDbackend run build` passed with zero errors; `npm --prefix frontend test` passed (43 passed across 17 test suites); `npm --prefix frontend run build` passed with zero errors. Enforced explicit allowlist of supported document MIME types (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `text/plain`) on Zod ingress schema and domain service layer; updated client form with file format guidance and client-side validation; verified API-level and client-level rejection of disallowed types (`.sh`, `.exe`, `.bin`, `.zip`, `.html`, `.mp4`).

---

### Phase C - Improve usability without changing business rules

### Completed - Step 13 - Add a global toast system

**Completed:** 2026-10-28
- Changed: `frontend/src/App.tsx`, `frontend/src/components/ui.tsx`, `frontend/src/styles/components.css`, `frontend/src/patient/appointments/AppointmentsPage.tsx`, `frontend/src/patient/appointments/hooks/usePatientAppointments.ts`, `frontend/src/components/tests/Toast.test.tsx`
- Verified: `npm --prefix frontend test` passed (48 passed across 18 test suites); `npm --prefix frontend run build` passed with zero errors. Created `ToastProvider`, `useToast` hook, and visible `ToastContainer` with accessible live region (`role="region"`, `aria-label="Notifications"`, `aria-live="polite"`, `aria-atomic="false"`); styled responsive dismissible toasts with tokenized semantic colors; migrated patient appointments feature (rescheduling, cancellation refund, review publishing) to trigger global toasts and replaced temporary inline success alerts.

---

### Completed - Step 14 - Add mobile navigation to the public header

**Completed:** 2026-10-28
- Changed: `frontend/src/public/shell/PublicHeader/PublicHeader.tsx`, `frontend/src/public/shell/PublicHeader/PublicHeader.module.css`, `frontend/src/public/shell/PublicHeader/tests/PublicHeader.test.tsx`
- Verified: `npm --prefix frontend test` passed (52 passed across 19 test suites); `npm --prefix frontend run build` passed with zero errors; `npm --prefix MediConnectBDbackend test` passed (208 passed, 5 skipped across 24 test suites). Added keyboard-accessible mobile menu toggle button (`aria-expanded`, `aria-controls="mobile-navigation"`), backdrop, and slide-out navigation drawer with dedicated close action; implemented Escape-key dismissal and automatic closure on route transitions; preserved all desktop navigation layouts and actions.

---

### Completed - Step 15 - Migrate one remaining simple feature to scoped CSS modules

**Completed:** 2026-10-28
- Changed: `frontend/src/public/verify-prescription/VerifyPrescriptionPage.tsx`, `frontend/src/public/verify-prescription/VerifyPrescriptionPage.module.css`, `frontend/src/public/verify-prescription/tests/VerifyPrescriptionPage.test.tsx`
- Verified: `npm --prefix frontend test` passed (54 passed across 20 test suites); `npm --prefix frontend run build` passed with zero errors; `npm --prefix MediConnectBDbackend test` passed (208 passed, 5 skipped across 24 test suites). Created `VerifyPrescriptionPage.module.css` with responsive layout, monospace verification code styling, card containers, and privacy notice block; scoped all page layout rules to the local CSS module while keeping shared primitives intact.

---

### Completed - Step 16 - Add focused browser-level acceptance tests

**Completed:** 2026-10-28
- Changed: `frontend/playwright.config.ts`, `frontend/e2e/critical-journeys.spec.ts`, `frontend/package.json`, `package.json`, `.gitignore`
- Verified: `npm --prefix frontend run test:e2e -- -c playwright.config.ts` passed (all 4 critical end-to-end browser journeys passed in 8.7s); `npm --prefix frontend test` passed (54 passed across 20 test suites); `npm --prefix frontend run build` passed with zero errors; `npm --prefix MediConnectBDbackend test` passed (208 passed, 5 skipped across 24 test suites). Configured Playwright with isolated browser test environment; executed 4 end-to-end user journeys:
  1. Patient login, doctor catalog search, available slot hold, and chamber appointment booking.
  2. Doctor queue viewing, consultation completion, and prescription issuance.
  3. Patient digital prescription inspection with verified medication details, and public 16-character prescription verification protecting patient diagnosis.
  4. Access control enforcement blocking unauthorized patient report disclosure with 403 Forbidden handling.

---

### Phase D - Prepare a safe production release

### Step 17 - Split development and production Docker configuration

**Goal:** Prevent development Docker configuration from becoming production configuration by accident.

**Read first:**

- `docker-compose.yml`
- `frontend/Dockerfile`
- `MediConnectBDbackend/Dockerfile`
- `.gitignore`

**Do:** Keep the current file for local development. Add separate production Compose configuration and production Dockerfiles or build targets. Use environment-variable references for secrets.

**Do not:** Commit real passwords, API keys, JWT secrets, or SMTP credentials.

**Verify:**

```bash
docker compose config
docker compose -f docker-compose.prod.yml config
```

**Done when:** Production configuration has no development-only passwords and does not run the Vite development server.

---

### Step 18 - Add continuous integration

**Goal:** Run checks on every pull request.

**File to create:** `.github/workflows/ci.yml`

**Do:** Use a supported Node version and run frontend tests, backend tests, frontend build, backend typecheck, and backend build.

**Do not:** Add deployment credentials or deploy production from this first workflow.

**Done when:** A pull request fails automatically on a test, typecheck, or build error.

---

### Step 19 - Decision required: production infrastructure

**Project owner must provide:**

- A domain name and hosting provider.
- MySQL backup and restore policy.
- Redis persistence policy.
- SMTP provider and sender identity.
- SSLCommerz production credentials and callback URL.
- Video-provider production credentials.
- Where medical-report files will be stored and encrypted.

**Do not code this step.** These are infrastructure and compliance decisions.

---

### Step 20 - Add reverse proxy, TLS, health checks, and deployment runbook

**Goal:** Make approved production infrastructure deployable and supportable.

**Prerequisite:** Step 19 is complete.

**Do:** Add Nginx or the approved platform equivalent, HTTPS redirect, health-check routing, secure cookie settings, environment configuration, backup instructions, rollback instructions, and a deployment checklist.

**Verify:**

1. HTTPS is valid.
2. `/health/live` and `/health/ready` work through the proxy.
3. Secure login and refresh work on the production domain.
4. Payment callbacks reach the public HTTPS API.
5. A backup restore is tested in a non-production environment.

**Done when:** The system is live, monitored, and recoverable without relying on a developer's local machine.

---

## 5. How to Update This Document After Every Step

For the completed step only:

1. Change its heading to start with `Completed -`.
2. Add the completion date.
3. Add one short bullet with the files changed.
4. Add one short bullet with the exact verification result.
5. Do not rewrite later steps unless the completed step changed a dependency or revealed a blocker.

Example:

```md
### Completed - Step 01 - Correct visible commission labels

**Completed:** 2026-10-28
- Changed: `frontend/src/...`
- Verified: `npm --prefix frontend test` - 28 tests passed.
```
