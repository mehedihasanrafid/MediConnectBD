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

### Step 01 - Correct visible commission labels

**Goal:** Change every user-facing `15%` commission label to `10%`.

**Read first:**

- `frontend/src/doctor/dashboard/components/DoctorEarningsSection/DoctorEarningsSection.tsx`
- `frontend/src/admin/operations/components/AdminPaymentsTable.tsx`
- `frontend/src/admin/dashboard/components/OverviewSummaryCards.tsx`
- `frontend/src/admin/dashboard/components/TopSpecialtiesAndDoctors.tsx`

**Do:** Replace labels, headings, and comments that describe platform commission as 15%. Do not change calculations in this step.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Done when:** No visible frontend text says `15%` commission.

---

### Step 02 - Correct the legacy earnings fallback

**Goal:** Ensure old payment rows without saved commission values use the required 10% rate.

**Read first:**

- `MediConnectBDbackend/src/modules/payments/payment.types.ts`
- `MediConnectBDbackend/src/modules/doctors/typeorm-doctor.repository.ts`
- `MediConnectBDbackend/tests/commission.test.ts`
- `MediConnectBDbackend/tests/doctor.service.test.ts`

**Do:** Replace the hard-coded `0.15` fallback in the doctor earnings repository with the same 10% rate used by the payment ledger. Add or update a regression test.

**Do not:** Change already-persisted payment records or create a migration.

**Verify:**

```bash
npm --prefix MediConnectBDbackend test
npm --prefix MediConnectBDbackend run typecheck
```

**Done when:** A payment without stored commission reports 10% commission and 90% doctor net.

---

### Step 03 - Show the payment gateway link

**Goal:** Let a patient open SSLCommerz after checkout creation.

**Read first:**

- `frontend/src/patient/appointments/components/PaymentPanel/PaymentPanel.tsx`
- `frontend/src/api/payments.ts`
- `MediConnectBDbackend/src/modules/payments/typeorm-payment.repository.ts`

**Do:** Show the checkout link whenever `payment.gatewayUrl` exists for an active checkout. The backend changes a created payment from `INITIATED` to `PENDING`; account for that real state.

**Do not:** Change backend payment state transitions during this step.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Done when:** A `PENDING` payment with a gateway URL renders an "Open SSLCommerz portal" link.

---

### Step 04 - Add a payment-panel regression test

**Goal:** Prevent the checkout-link bug from returning.

**Read first:**

- `frontend/src/patient/appointments/components/PaymentPanel/PaymentPanel.tsx`
- `frontend/src/api/client.test.ts`
- `frontend/vitest.config.ts`

**Do:** Add one focused frontend test for a pending payment with a gateway URL. Assert that the checkout link is present.

**Do not:** Add browser automation or a large new test dependency in this step.

**Verify:**

```bash
npm --prefix frontend test
```

**Done when:** The new test fails if the checkout link is restricted to `INITIATED` again.

---

### Step 05 - Make payment completion understandable

**Goal:** Give the patient a clear action after returning from SSLCommerz.

**Read first:**

- `frontend/src/patient/appointments/components/PaymentPanel/PaymentPanel.tsx`
- `frontend/src/api/payments.ts`
- `MediConnectBDbackend/src/modules/payments/payment.service.ts`

**Do:** Add an explicit "I completed payment - verify now" action, clear success/failure text, and refresh appointments after successful reconciliation.

**Do not:** Trust a browser redirect or URL parameter as proof of payment. Keep server-side reconciliation.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Done when:** The UI never marks an appointment paid without a successful backend response.

---

### Step 06 - Make the manual refund workflow honest

**Goal:** Stop implying that a button sends money to a payment provider.

**Read first:**

- `frontend/src/admin/operations/components/AdminRefundsTable.tsx`
- `frontend/src/admin/operations/hooks/useAdminOperations.ts`
- `MediConnectBDbackend/src/modules/admin/typeorm-admin.repository.ts`

**Do:** Rename the admin action and notices to make the manual workflow explicit, for example "Mark for manual refund" and "Refund recorded for manual processing." Add a short explanatory note on the page.

**Do not:** Claim that a provider refund exists.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Done when:** An admin can understand that the current action records operational progress only.

---

### Phase B - Complete core client requirements

### Step 07 - Decision required: choose the video provider

**Goal:** Record one approved provider before writing real video code.

**Project owner must choose:**

- Daily, Twilio, Vonage, self-hosted Jitsi, or another provider.
- Whether chat and file sharing are included in the first release.
- Where provider keys are stored and how production rooms are secured.

**Do not code this step.** Stop after recording the decision in this file or in a decision log.

---

### Step 08 - Create a real video-session backend contract

**Goal:** Replace the hard-coded Jitsi URL/token placeholder with a provider-backed room credential.

**Prerequisite:** Step 07 is complete.

**Read first:**

- `MediConnectBDbackend/src/modules/appointments/appointment.service.ts`
- `MediConnectBDbackend/src/modules/appointments/typeorm-appointment.repository.ts`
- `MediConnectBDbackend/src/config/env.ts`
- `MediConnectBDbackend/src/modules/appointments/appointment.types.ts`

**Do:** Introduce a small video-provider interface. Keep current ownership checks and the five-minute room window. Read provider credentials only from validated environment variables.

**Do not:** Put provider secrets, a fixed signing key, or provider SDK calls in a repository class.

**Verify:**

```bash
npm --prefix MediConnectBDbackend test
npm --prefix MediConnectBDbackend run typecheck
```

**Done when:** The API returns credentials that the chosen provider accepts only for the booked patient or doctor.

---

### Step 09 - Embed the real video call in the frontend

**Goal:** Replace the fake room screen and fake microphone/camera buttons.

**Prerequisite:** Step 08 is complete.

**Read first:**

- `frontend/src/patient/appointments/components/VideoSessionPanel/VideoSessionPanel.tsx`
- `frontend/src/doctor/appointments/components/ActiveAppointmentCard/ActiveAppointmentCard.tsx`
- The API contract created in Step 08

**Do:** Use the chosen provider SDK or secure embed. Join with the API credential from Step 08. Implement real join, leave, and error states.

**Do not:** Display "Secure WebRTC" unless a real connection is running.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Manual acceptance:** A booked patient and their assigned doctor can join the same room; another account cannot.

---

### Step 10 - Add video chat and file sharing, if approved

**Goal:** Meet the optional in-call collaboration requirement.

**Prerequisite:** Step 07 explicitly includes chat and file sharing.

**Do:** Implement these only through the chosen provider or a separately approved secure storage design. Enforce appointment ownership on every upload and download.

**Stop rule:** If the provider does not support either feature, stop and ask before introducing a second service.

**Verify:** Add backend authorization tests and frontend component tests before calling this complete.

---

### Step 11 - Add the missing public doctor filters

**Goal:** Expose existing API support for hospital, area, minimum fee, and maximum fee.

**Read first:**

- `frontend/src/public/doctors/hooks/useDoctorSearch.ts`
- `frontend/src/public/doctors/components/DoctorSearchFilters/DoctorSearchFilters.tsx`
- `frontend/src/api/doctors.ts`
- `MediConnectBDbackend/src/modules/doctors/doctor.schema.ts`

**Do:** Load hospitals, add the four filter inputs, include only non-empty parameters in the request, and add a clear-filters action.

**Do not:** Change backend query semantics in this frontend step.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Done when:** The browser request contains selected filter values and clearing filters returns the default search.

---

### Step 12 - Add a safe medical-report upload policy

**Goal:** Make report uploads safer before production use.

**Read first:**

- `MediConnectBDbackend/src/modules/patients/medical-report.schema.ts`
- `MediConnectBDbackend/src/modules/patients/medical-report.service.ts`
- `frontend/src/patient/reports/components/ReportUploadForm.tsx`

**Do:** Define an explicit allowlist of supported document MIME types, validate it in the backend, show the same list in the frontend, and test rejected files.

**Do not:** Move files to cloud storage in this step.

**Verify:**

```bash
npm --prefix MediConnectBDbackend test
npm --prefix frontend test
```

**Done when:** Unsupported MIME types are rejected by the API even when a caller bypasses the browser UI.

---

### Phase C - Improve usability without changing business rules

### Step 13 - Add a global toast system

**Goal:** Replace temporary success alerts with accessible toast notifications.

**Read first:**

- `frontend/src/App.tsx`
- `frontend/src/components/ui.tsx`
- `frontend/src/styles/components.css`

**Do:** Add one toast provider, one `useToast` hook, and a visible live region. Migrate one feature first: patient appointments.

**Do not:** Convert every page in the same step.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Done when:** One completed patient action displays a dismissible, accessible toast.

---

### Step 14 - Add mobile navigation to the public header

**Goal:** Make public and patient navigation usable on small screens.

**Read first:**

- `frontend/src/public/shell/PublicHeader/PublicHeader.tsx`
- `frontend/src/public/shell/PublicHeader/PublicHeader.module.css`

**Do:** Add a keyboard-accessible menu button, a close action, and mobile breakpoints. Preserve desktop navigation.

**Do not:** Change routes, authorization, or the admin layout.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Manual acceptance:** At a narrow viewport, navigation opens, closes with Escape, and links remain usable.

---

### Step 15 - Migrate one remaining simple feature to scoped CSS modules

**Goal:** Continue frontend architecture cleanup in small pieces.

**Use this exact target:** `frontend/src/public/verify-prescription/`.

**Read first:**

- `frontend/src/public/verify-prescription/VerifyPrescriptionPage.tsx`
- `frontend/src/styles/features.css`
- `docs/FRONTEND_STRUCTURE.md`

**Do:** Create `VerifyPrescriptionPage.module.css`, move only this page's specific styles into it, and keep shared styles shared.

**Do not:** Move or rename unrelated public-doctor files.

**Verify:**

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

**Done when:** The page has a local CSS module and no visual regression in its form/result layout.

---

### Step 16 - Add focused browser-level acceptance tests

**Goal:** Test critical journeys across the frontend and backend.

**Decision required:** Choose Playwright or another approved browser-test tool before adding a dependency.

**First tests after approval:**

1. Patient login, doctor search, hold, and chamber booking.
2. Doctor completes an appointment and creates a prescription.
3. Patient views and downloads that prescription.
4. An unauthorized account cannot read another patient's report.

**Done when:** These tests run against an isolated test environment and do not use production credentials.

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
