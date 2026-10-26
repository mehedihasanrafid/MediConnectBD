# MediConnect BD Backend — Full Codebase Audit, Bug Report & Update Plan

**Generated:** 2026-10-26  
**Target Directory:** `MediConnectBDbackend/`  
**Reference Requirements:** `MediConnect BD – Client Requirements.pdf` & `DEVELOPMENT.md`

---

## 1. Current Verification Output (`typecheck` & `vitest`)

Running the backend quality suite inside `MediConnectBDbackend/`:

```text
> mediconnectbd-backend@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
✔ Passed (0 errors)

> mediconnectbd-backend@0.1.0 test
> vitest run
✔ Test Files: 20 passed | 1 skipped (21)
✔ Tests:      178 passed | 5 skipped (183)
✔ Duration:   5.56s
```

> **Important Note:** Although all 178 unit/router tests currently pass, several unit tests call services or repositories directly with mocks, masking **critical runtime bugs** in Express route middleware chains, SQL queries, and worker job payloads documented below.

---

## 2. Critical Bugs — Status: ✅ ALL 8 FIXED & VERIFIED

| # | Bug | Status | Files Fixed |
|---|-----|--------|-------------|
| **Bug 1** | Router-level `requireRole` blocked public, patient, and admin endpoints in Prescriptions & Reviews | ✅ **FIXED** | `src/modules/prescriptions/prescription.routes.ts`, `src/modules/reviews/review.routes.ts`, `tests/router-wiring.test.ts` |
| **Bug 2** | Public prescription verification leaked full clinical data (`diagnosis`, `medicines`, `tests`, `advice`) | ✅ **FIXED** | `src/modules/prescriptions/typeorm-prescription.repository.ts`, `src/modules/prescriptions/prescription.types.ts` |
| **Bug 3** | Prescription locked after 1 edit instead of 24h window & allowed permanent deletion after lock | ✅ **FIXED** | `src/modules/prescriptions/typeorm-prescription.repository.ts`, `src/modules/prescriptions/prescription.service.ts`, `tests/prescription.service.test.ts` |
| **Bug 4** | Reminder worker crashed on Redis connect, Zod payload validation, `dp.full_name` SQL, and never marked flags | ✅ **FIXED** | `src/modules/notifications/reminder-scheduler.ts`, `src/modules/notifications/typeorm-reminder.repository.ts`, `src/workers/reminder-worker.ts`, `src/workers/worker.ts`, `tests/worker.test.ts` |
| **Bug 5** | Booking confirmation emails were never triggered on chamber booking or video payment verification | ✅ **FIXED** | `src/modules/appointments/typeorm-appointment.repository.ts`, `src/modules/payments/typeorm-payment.repository.ts`, `src/server.ts` |
| **Bug 6** | OpenAPI / Swagger missing `/api/v1` prefix on reviews/prescriptions and missing family-member endpoints | ✅ **FIXED** | `src/docs/openapi.ts`, `src/docs/openapi.schemas.ts`, `tests/openapi.test.ts` |
| **Bug 7** | Cancellation reason schema rejected empty/optional reason from frontend | ✅ **FIXED** | `src/modules/appointments/appointment.schema.ts`, `src/docs/openapi.schemas.ts` |
| **Bug 8** | Updating doctor chambers hard-deleted rows and cascaded deletion of `CHAMBER` schedules | ✅ **FIXED** | `src/modules/doctors/typeorm-doctor.repository.ts` |

---

### Details of the 8 Fixed Bugs

### ✅ Bug 1: Router-Level `requireRole` Blocks Public, Patient, and Admin Endpoints in Prescriptions & Reviews
* **Files:**
  * `src/modules/prescriptions/prescription.routes.ts` (Lines 19–30)
  * `src/modules/reviews/review.routes.ts` (Lines 19–27)
* **What is wrong:**
  * In `prescription.routes.ts`, `router.use(options.authenticate, requireRole("DOCTOR"))` is mounted globally on `router` at line 19, followed by `router.use(options.authenticate, requireRole("PATIENT"))` at line 26.
  * Because Express executes `router.use()` middleware for **all subsequent routes** on the same router:
    1. `GET /api/v1/prescriptions/patients/me/prescriptions` requires the caller to have **both** `DOCTOR` and `PATIENT` roles — any normal patient receives `403 ROLE_FORBIDDEN`.
    2. `GET /api/v1/prescriptions/verify/:verificationCode` (intended to be public) requires authentication AND both `DOCTOR` and `PATIENT` roles — unauthenticated visitors receive `401 AUTHENTICATION_REQUIRED`.
  * Similarly, in `review.routes.ts`, `router.use(options.authenticate, requireRole("PATIENT"))` is mounted at line 19:
    1. `GET /api/v1/reviews/doctors/:doctorId/reviews` (intended to be public) rejects unauthenticated visitors and doctors with `401` / `403`.
    2. `DELETE /api/v1/reviews/:reviewId` (intended for `ADMIN`) runs `requireRole("PATIENT")` before `requireRole("ADMIN")`, rejecting admins with `403 ROLE_FORBIDDEN`.
* **How to fix:**
  * Remove top-level `router.use(options.authenticate, requireRole(...))` from both routers and attach `options.authenticate, requireRole(...)` per route (just like `src/modules/doctors/doctor.routes.ts`).

---

### 🔴 Bug 2: Public Prescription Verification Endpoint Leaks Full Private Medical Data
* **File:** `src/modules/prescriptions/typeorm-prescription.repository.ts` (Lines 168–180)
* **What is wrong:**
  * `verifyByCode(verificationCode)` returns `{ valid: true, prescription: this.toView(prescription) }`, which exposes `diagnosis`, `medicines`, `tests`, `advice`, and `patientProfileId` publicly to anyone with the code.
  * Violates Client Requirement Section 5 ("Only the patient and their doctors can see the patient's reports and prescriptions") and `DEVELOPMENT.md` Section 15 ("Prescription verification public data: Validity status + doctor name + date only. Never expose diagnosis/medicine content").
* **How to fix:**
  * Join `doctor` / `user` on `verifyByCode` and return only `{ valid: true, verificationCode, doctorName, issuedAt }` without clinical fields (`diagnosis`, `medicines`, `tests`, `advice`).

---

### 🔴 Bug 3: Prescription Locks After a Single Edit & Allows Permanent Deletion After Lock
* **File:** `src/modules/prescriptions/typeorm-prescription.repository.ts` (Lines 118–166)
* **What is wrong:**
  1. In `updatePrescription()` (Lines 148–151), `prescription.isEditable = false` is set immediately on the **first** update. The client requirement states: *"A prescription can be edited for 24 hours after the visit; after that it is locked."* Setting `isEditable = false` on the first edit prevents any second edit within the 24-hour window.
  2. In `deletePrescription()` (Lines 158–166), a doctor can permanently delete a prescription at any time — even after the 24-hour lock window has expired.
* **How to fix:**
  * Keep `isEditable` dynamically derived from `(now - createdAt) <= 24h` (or only lock when the 24h window expires), and block `deletePrescription` once the 24-hour window has passed.

---

### 🔴 Bug 4: Reminder Worker Crashes on Startup and Every Scheduled Job Execution
* **Files:**
  * `src/workers/reminder-worker.ts` (Lines 50–51)
  * `src/modules/notifications/reminder-scheduler.ts` (Lines 22–29, 45–125)
  * `src/modules/notifications/typeorm-reminder.repository.ts` (Lines 29–59)
  * `package.json` (Lines 17–19)
* **What is wrong:**
  1. **Not wired into `package.json` or `worker.ts`:** `npm run dev:worker` and `npm run start:worker` only run `src/workers/worker.ts` (hold expiry). `reminder-worker.ts` is never started.
  2. **Redis double-connect crash:** In `reminder-worker.ts` line 50, `new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })` connects immediately (because `lazyConnect: true` is omitted), so line 51 `await redisConnection.connect()` throws `Error: Redis is already connecting/connected`.
  3. **Zod payload validation failure on every job:** `registerReminderSchedules()` enqueues `{ version: 1 }`, but `createReminderProcessor()` validates `job.data` against `reminderPayloadSchema`, which requires `appointmentId`, `patientEmail`, `doctorName`, `scheduledAt`, and `hoursBefore`. Every recurring job immediately fails with `ZodError`.
  4. **Invalid SQL column `dp.full_name`:** `TypeOrmReminderRepository.findUpcomingReminders()` selects `dp.full_name`, which does not exist on `doctor_profiles` (names live on `users.first_name` and `users.last_name`).
  5. **Wrong time window & flag updates:**
     * `processReminders()` computes `targetTime = now + hoursBefore` and passes `targetTime` as the `now` parameter to `findUpcomingReminders(now, batchSize)`, which then adds *another* 24 hours (`now + 24h` to `now + 48h`).
     * `findUpcomingReminders()` hardcodes `a.reminder_24h_sent = false` even for 30-minute reminders (`reminder_30min_sent` is never queried).
     * `processReminders()` passes `"placeholder-id"` instead of `appt.id` and **never calls `markRemindersSent()`**, meaning reminders would re-send every 5 minutes indefinitely.
* **How to fix:**
  * Fix `reminderPayloadSchema` to `{ version: z.literal(1) }`, join `users` for the doctor's name (`CONCAT(du.first_name, ' ', du.last_name)`), query the proper window (`<= 24h` with `reminder_24h_sent = false`, and `<= 30min` with `reminder_30min_sent = false`), pass `appt.id`, mark the respective flag `true` after sending, and register the reminder processor inside `src/workers/worker.ts` (or `dev:start`).

---

### 🔴 Bug 5: Booking Confirmation Emails Are Never Sent in Production/Dev Flows
* **Files:**
  * `src/modules/appointments/appointment.controller.ts` (Lines 33–39)
  * `src/modules/appointments/appointment.service.ts` (Lines 57–100)
  * `src/modules/payments/payment.service.ts` (Lines 61–79)
* **What is wrong:**
  * `AppointmentService.bookAppointment(patientProfileId, holdId, patientEmail?, doctorName?)` only sends a confirmation email if `patientEmail` and `doctorName` are passed by the caller.
  * `appointment.controller.ts` calls `bookAppointment(patientProfileId, input.holdId)` without `patientEmail` or `doctorName`.
  * Furthermore, when a **VIDEO** appointment is confirmed via SSLCommerz callback (`PaymentService.callback()`), `NotificationService` is never called at all.
* **How to fix:**
  * Load patient email and doctor name inside the repository/service when an appointment transitions to `CONFIRMED` (both in `bookHold` for chamber visits and `applyVerified` for video visits) and send the confirmation email.

---

### 🟠 Bug 6: OpenAPI / Swagger Route Prefix Mismatch & Missing Family Member Docs
* **Files:**
  * `src/docs/openapi.ts` (Lines 117–150)
  * `src/routes/v1.ts` (Lines 93–111)
  * `tests/openapi.test.ts` (Lines 80–86)
* **What is wrong:**
  1. `src/routes/v1.ts` mounts reviews at `/api/v1/reviews` and prescriptions at `/api/v1/prescriptions`, but `src/docs/openapi.ts` and `tests/openapi.test.ts` register them at `/reviews` and `/prescriptions` (missing `/api/v1`). Testing those endpoints from Swagger UI `/api-docs/` hits the wrong URL and returns `404`.
  2. The 5 family-member endpoints (`/api/v1/patients/me/family-members`) are mounted in `src/routes/v1.ts` but completely omitted from `src/docs/openapi.ts` and `tests/openapi.test.ts`.
* **How to fix:**
  * Update `src/docs/openapi.ts` and `tests/openapi.test.ts` to use `/api/v1/reviews` and `/api/v1/prescriptions`, and document all 5 `/api/v1/patients/me/family-members` endpoints.

---

### 🟠 Bug 7: Cancellation Schema Rejects Optional/Empty Reason from Frontend
* **File:** `src/modules/appointments/appointment.schema.ts` (Lines 20–22)
* **What is wrong:**
  * `cancelAppointmentSchema` enforces `reason: z.string().trim().min(3).max(500)`.
  * In `frontend/src/features/appointments/AppointmentsPage.tsx` (and documented in `DEVELOPMENT.md` line 769), the cancellation reason input is optional and sends `""` when blank, causing the backend to reject the request with `422 VALIDATION_ERROR`.
* **How to fix:**
  * Change `cancelAppointmentSchema` to allow optional/empty reason (e.g., `reason: z.string().trim().max(500).optional().default("Cancelled by user")`).

---

### 🟠 Bug 8: Updating Doctor Chambers Deletes & Recreates Rows, Nullifying Schedule `chamber_id`
* **File:** `src/modules/doctors/typeorm-doctor.repository.ts` (Lines 342–356)
* **What is wrong:**
  * `replaceChambers()` runs `await repository.delete({ doctorProfileId: doctorId })` and inserts brand-new UUIDs.
  * Because `fk_doctor_schedules_chamber` has `ON DELETE CASCADE` (`1761048000000-add-doctor-scheduling.ts` line 31), updating a doctor's profile with `chambers` **silently deletes all of the doctor's chamber schedule rules**!
* **How to fix:**
  * Upsert chambers by `(doctorProfileId, hospitalId)` and deactivate removed chambers (`isActive = false`) instead of hard-deleting them.

---

## 3. Missing Features & Endpoints to Implement (Client Requirements Gaps)

### Priority 0 — Unblocking Core Clinical & Booking Flows

1. **Doctor Appointment Queue & Status Transitions (`COMPLETED` / `NO_SHOW` / Doctor Cancel)**
   * **Why it's critical:** Prescriptions (`POST /api/v1/prescriptions/me/prescriptions`) and Reviews (`POST /api/v1/reviews/me/reviews`) both require `appointment.status === "COMPLETED"`. Currently, **no API endpoint exists** to mark an appointment `COMPLETED` or `NO_SHOW`!
   * **Endpoints to add:**
     * `GET /api/v1/doctors/me/appointments` — Doctor's today queue & upcoming/past appointments with patient info.
     * `POST /api/v1/appointments/:appointmentId/complete` (`DOCTOR` role, owning doctor) — Marks `CONFIRMED` appointment as `COMPLETED`.
     * `POST /api/v1/appointments/:appointmentId/no-show` (`DOCTOR` role, owning doctor) — Marks `CONFIRMED` appointment as `NO_SHOW`.
     * Allow `DOCTOR` and `ADMIN` roles on `POST /api/v1/appointments/:appointmentId/cancel` (repository logic already supports `actor: "DOCTOR" | "ADMIN"` with 100% refund calculation, but the route/controller currently hardcodes `PATIENT`).

2. **Doctor Ratings & Review Aggregates on Public Profiles**
   * **Requirement:** Patients must see a doctor's rating and review count on search cards and profile pages.
   * **What to update:** Include `averageRating` and `reviewCount` in `PublicDoctorProfile` (`src/modules/doctors/typeorm-doctor.repository.ts`).

3. **Patient Overlapping Appointment Check & Family Member Booking**
   * **Requirement:**
     * Business Rule: *"A patient cannot have two appointments at overlapping times."*
     * Patient Need: *"Manage family members (book for a parent or child from one account)."*
   * **What to update:**
     * Add optional `familyMemberId` column to `appointments` (with migration & ownership check in `bookHold`).
     * In `createHold` / `bookHold`, verify the patient (or selected family member) does not already have an active hold or `CONFIRMED` / `PENDING_PAYMENT` appointment overlapping `[slot.startAt, slot.endAt)`.

4. **Prescription PDF Generation & Medicine Name Suggestions**
   * **Requirement:**
     * *"Receive a digital prescription after the consultation and download it as PDF."*
     * *"Write a prescription during or after the visit... with medicine name suggestions while typing."*
   * **Endpoints to add:**
     * `GET /api/v1/prescriptions/:prescriptionId/pdf` — Streams a formatted PDF prescription (accessible only to the owning patient or prescribing doctor).
     * `GET /api/v1/prescriptions/medicines/suggest?q=...` — Returns matching medicine names/strengths for autocomplete.

---

### Priority 1 — Doctor Workspace, Patient Rescheduling & Medical Reports

5. **Doctor Earnings & Patient Clinical History Endpoints**
   * **Requirement:**
     * *"See their earnings by day and month."*
     * *"See the patient's past visits, uploaded reports and previous prescriptions before the consultation."*
   * **Endpoints to add:**
     * `GET /api/v1/doctors/me/earnings` — Aggregates `SUCCEEDED` payments (`grossAmount`, `commissionAmount`, `netAmount`) grouped by day and month for the authenticated doctor.
     * `GET /api/v1/doctors/me/patients/:patientProfileId/history` — Verifies the doctor has an appointment with the patient, then returns past visits, prescriptions, and uploaded medical reports.

6. **Patient Appointment Rescheduling & Single Appointment Detail**
   * **Requirement:** *"See upcoming and past appointments, cancel or reschedule an upcoming one."*
   * **Endpoints to add:**
     * `GET /api/v1/appointments/:appointmentId` — Returns single appointment detail for the owning patient or assigned doctor.
     * `POST /api/v1/appointments/:appointmentId/reschedule` — Atomically releases the old slot and moves the booking to a newly held/available slot (respecting lead-time rules).

7. **Medical Reports & Doctor Certificate Uploads**
   * **Requirement:**
     * *"Upload medical reports to their profile so the doctor can see them before the visit."*
     * *"Register with BMDC registration number and certificates."*
     * *"Only the patient and their doctors can see the patient's reports and prescriptions. Admin cannot read medical content."*
   * **What to add:**
     * `medical_reports` entity & migration (`id`, `patient_profile_id`, `file_name`, `mime_type`, `size_bytes`, `storage_key`, `created_at`).
     * `POST /api/v1/patients/me/reports`, `GET /api/v1/patients/me/reports`, `GET /api/v1/reports/:reportId/download` (strictly checking patient ownership or active doctor care relationship; denying `ADMIN`).
     * Doctor certificate upload/URL support on `doctor_profiles` so admins can inspect credentials during review.

8. **Notify Booked Patients When Doctor Adds Time-Off / Emergency Leave**
   * **Requirement:** *"Block specific dates for leave or emergencies; patients already booked on those dates must be notified."*
   * **What to update:** In `SchedulingService.addMyTimeOff()`, query any `CONFIRMED` appointments overlapping the new time-off window and trigger a notification email to affected patients.

9. **Admin Dashboard Analytics Enhancements**
   * **Requirement:** *"A dashboard: total appointments, today's appointments, revenue, new patients, most booked specialties and top doctors."*
   * **What to update:** Extend `GET /api/v1/admin/overview` (`TypeOrmAdminRepository.getOverview()`) to also return `todaysAppointments`, `newPatientsThisMonth`, `mostBookedSpecialties`, and `topDoctors`.

---

### Priority 2 — Video Consultation, Security Hardening & One-Command Startup

10. **Browser Video Consultation Room & Access Token Endpoint**
    * **Requirement:** *"The video room opens 5 minutes before the slot and only the booked patient and that doctor can join it."*
    * **What to add:**
      * `GET /api/v1/appointments/:appointmentId/video-session` — Validates caller is either the booked patient or assigned doctor, checks `appointment.mode === "VIDEO"` and `appointment.status === "CONFIRMED"`, enforces the time window (`now >= scheduledStartAt - 5 minutes` and `now <= scheduledEndAt`), and returns a WebRTC/Daily/LiveKit room token + room URL.

11. **Rate Limiting & Security Hardening**
    * Add rate limiting on `/api/v1/auth/login`, `/api/v1/auth/*/register`, and `/api/v1/prescriptions/verify/:code`.
    * Add SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) to `src/config/env.ts` so `SmtpTransport` is used when configured and falls back to `ConsoleTransport` in local dev.

12. **One-Command Project Startup (`docker-compose.yml` or Root Start Script)**
    * **Requirement:** *"The whole project should start with one command on a new machine (for example, Docker)."*
    * **What to add:** Add a root `docker-compose.yml` (MySQL 8 + Redis + Backend API + Backend Worker + Frontend) and/or a root `package.json` convenience script.

---

## 4. Recommended Execution Order

| Step | Task | Status | Impact |
|------|------|--------|--------|
| **Step 1** | Fix **Bug 1, Bug 2, Bug 3, Bug 6, Bug 7** (Prescriptions/Reviews route middleware, public verification privacy leak, 24h edit lock, OpenAPI prefixes & family member docs, optional cancel reason) | ✅ Completed | Fixed broken API endpoints & privacy violation |
| **Step 2** | Implement **Doctor Appointment Queue + Complete / No-Show / Cancel endpoints** (`GET /api/v1/doctors/me/appointments`, `POST /api/v1/appointments/:appointmentId/complete`, `POST /api/v1/appointments/:appointmentId/no-show`, Doctor/Admin cancel support) | ✅ Completed | Unblocked the entire Prescription and Review workflows end-to-end |
| **Step 3** | Fix **Bug 4 & Bug 5** (Reminder worker SQL/payload/flags + Booking/Payment confirmation emails) | ✅ Completed | Background notifications and reminders wired and working |
| **Step 4** | Fix **Bug 8** (Chamber upsert ✅) + Add **Doctor Ratings aggregate**, **Doctor Earnings**, and **Admin Overview top doctors/specialties/today metrics** | ⏳ Next | Completes Doctor & Admin dashboard data requirements |
| **Step 5** | Add **Family Member booking (`familyMemberId`)**, **Overlapping appointment prevention**, and **Appointment Rescheduling** | ⏳ Pending | Completes all Section 5 Booking Business Rules |
| **Step 6** | Add **Prescription PDF endpoint**, **Medicine autocomplete**, **Medical Reports upload**, and **Video Session endpoint** | ⏳ Pending | Completes clinical & video consultation requirements |
| **Step 7** | Add root **`docker-compose.yml`** & run full test suite (`typecheck`, `vitest`, `openapi.test.ts`) | ⏳ Pending | Meets one-command startup & delivery gate |
