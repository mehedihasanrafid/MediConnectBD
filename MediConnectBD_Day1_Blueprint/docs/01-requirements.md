# 01 — Software Requirements Specification (SRS): MediConnect BD

**Baseline:** DEMO-1 • **Date:** 2026-10-15 • **Owner:** Engineering • **Approval:** Pending client review

## 1. Product definition

MediConnect BD connects patients and approved doctors for doctor discovery, confirmed chamber/video appointments, browser-based consultations, synthetic clinical documents and platform administration. The 12-working-day output is a **public, non-clinical demonstration**; all clinical data is fabricated and all SSLCommerz transactions run in sandbox. **Public viewing is allowed, but registration and medical-file uploads are gated to invited demo testers and preapproved synthetic fixtures**; no open real-patient intake.

### Success conditions

1. A visitor can search and filter only approved, active doctors.
2. A new patient can log in, create a dependent profile, select an available slot and reserve a chamber appointment.
3. A video appointment is held for at most 10 minutes and confirmed only after verified sandbox payment.
4. Simultaneous attempts at the same slot result in exactly one active reservation.
5. Doctor can join browser video with the authorized booking account while a different user is denied.
6. Doctor can see synthetic authorized reports and create a labeled demo prescription PDF during or after the visit.
7. Admin can approve doctors, moderate public reviews and see aggregate statistics, but clinical-content APIs deny admin access.
8. A new developer can boot an environment with one Docker command after obtaining `.env` values; a public HTTPS demo is deployed by Day 12.

## 2. Actors and authorization

- **Visitor:** anonymous public catalogue search and approved doctor profiles.
- **Patient account:** registered `PATIENT` user; manages their own patient profile and dependents; books, pays, cancels, reviews, uploads reports.
- **Doctor:** registered `DOCTOR` user; remains in `PENDING` until verified; schedules and treats only assigned patients.
- **Admin:** manages verification, reference data, booking/payment metadata and moderation, **not** clinical document contents.
- **Worker/system:** runs expiry, reminders, payment reconciliation, scheduled regeneration and notification jobs using service credentials.

### Proposed permissions matrix

| Function | Visitor | Patient | Approved doctor | Admin |
| --- | --- | --- | --- | --- |
| Search approved doctors | Yes | Yes | Yes | Yes |
| Register/login | Yes | Yes | Yes | Yes (login only) |
| Manage own/dependent profiles | No | Yes | No | No |
| Reserve/cancel own appointment | No | Yes | No | Metadata support only |
| Change own weekly schedule | No | No | Yes | No |
| Approve doctor registration | No | No | No | Yes |
| Read a patient's reports | No | Owner/guardian | **Assigned and authorized treating doctor** | **No** |
| Read prescription content | No | Owner/guardian | Prescribing/authorized doctor | **No** |
| Write/modify prescription | No | No | Assigned doctor | No |
| Join video room | No | Booking account/authorized guardian | Assigned doctor | No |
| Review after completed visit | No | Booking account | No | Moderate only |
| View payment metadata/dashboard | No | Own payments | Own earnings | Yes |

Important: role checks alone are insufficient. Every clinical request must additionally check patient ownership, appointment/doctor relationship, status and access revocation.

## 3. In-scope features

### 3.0 User-interface sitemap (mobile first)

- **Public:** Home, Find Doctors, Search Results, Doctor Profile, Login, Patient Signup, Doctor Apply.
- **Patient:** Dashboard, Family Profiles, Doctor Slots, Checkout, Upcoming/Past Appointments, Video Room, Medical Reports, Prescription Detail/PDF, Write Review.
- **Doctor:** Pending Approval, Professional Profile, Credentials Upload, Chambers, Weekly Schedule, Leave Blocks, Today's Queue, Patient History (consent-gated), Video Room, Demo Prescription Editor, Earnings.
- **Admin:** Verification Queue, Doctor Credentials Review, Specialties, Hospitals, Users, Appointments, Payments/Refunds, Review Moderation, Analytics Dashboard.
- **Shared feedback:** Loading/empty/error states; fixed sandbox-data banner; Dhaka date/time format; mobile camera/mic permission prompts; unauthorized/expired links page.

### 3.1 Identity and profile management

- Registration and login for patient/doctor using an operator-issued *demo invite code*; seeded admin for demo, not public self-registration. Uninvited registration is disabled.
- Password hashing; short-lived access JWT; revocable refresh sessions; logout; password reset if time permits.
- Patient profiles can represent SELF, CHILD, PARENT or OTHER dependents, each with individual appointment/record history.
- Doctor application includes BMDC number, qualification files, specialty, experience and approval status.
- Admin approves/rejects with reason and may suspend any account; audit each action.

### 3.2 Directory and availability

- Search approved doctors by name, specialty, hospital, area and fee. Filter by appointment modality and sort by fee/name where practical.
- Doctor profile includes photo, degrees, experience, languages, offered modalities, chamber addresses, fees, rating aggregates and reviews.
- Weekly recurring schedules keyed by day of week, local times, slot length (10/15/20 min), chamber and modality policy.
- Generate non-overlapping inventory for next seven rolling days; blocked dates suppress availability.
- Doctor cannot offer conflicting schedule intervals across multiple chambers or modalities.
- Existing confirmed bookings are retained in history if doctor blocks/cancels; system emits patient notification and refund action.

### 3.3 Bookings and finance

- Book one canonical slot; a single doctor slot cannot serve video and chamber simultaneously.
- For video, create payment-pending reservation with expires_at = min(now + 10min, appointment starts − 1hour); a positive hold interval is required, so a video booking cannot begin exactly at the 1-hour cutoff. Chamber booking at the exact 1-hour cutoff remains allowed.
- For chamber, immediately confirm and mark the fee as `PAY_AT_CHAMBER` (not platform revenue).
- Booking windows: between now + 1 hour and now + 7×24 hours, evaluated in UTC.
- Prevent patient-profile appointment time overlaps; for dependent visits the selected patient profile is the subject.
- SSLCommerz sandbox initiation, IPN/callback handling and authoritative gateway validation, including amount/currency/order matching.
- Cancellations use refund policy: >24 hours 100%; 2–24 hours inclusive 50%; <2 hours 0%; doctor-initiated always 100% (for paid visits).
- Reschedule as an auditable transfer to a new slot; do not create an overlapping reservation or lose payment history.
- Commission = 10% of paid video consultation gross; model fees and refund reversals separately. Net doctor payable must account for refunds and processor charges according to later finance decisions.

### 3.4 Communication and clinical-demo functions

- Send booking confirmation and updates by email; reminders at 24h and 30min before start (past reminder thresholds skipped).
- Join room from five minutes before appointment. No recordings in Day-12 demo.
- Only booked account/authorized guardian and assigned doctor receive join tokens; physician cannot access a different doctor's room.
- In-call text chat and sharing through temporary LiveKit data channels or uploading to controlled private storage with a chat attachment link.
- Demo testers may upload only preapproved synthetic report fixtures (e.g., by checksum allowlist) before visit; no unrestricted real-record uploads on the public demonstration. Authorized doctor can subsequently view them under the clinical authorization policy.
- Prescription contains diagnosis, medication entries, tests and advice; medicine suggestions from a curated *demo* dictionary only.
- PDF includes unique verification ID and a visible **DEMO / NOT VALID FOR CLINICAL USE** watermark; public verification exposes authenticity metadata only (no clinical content).
- Revision deadline = appointment.completed_at + 24 hours; revisions are immutable and append-only.
- Review exactly once per completed appointment, with admin moderation state.

### 3.5 Admin, ops and deployment

- Admin sees doctor queue, suspensions, appointments, payment/refund *metadata*, specialty/hospital catalogue and dashboard aggregates.
- Dashboard cards: total appointments, today's count, completed, new patients, sandbox-captured revenue, gross commissions, popular specialties and top doctors.
- API docs, seeded demo accounts, GitHub history, automated high-risk tests, containerized local environment and HTTPS demo.

## 4. Explicit exclusions

Native Android/iOS apps; SMS; lab booking; pharmacy delivery; insurance claims; live bKash/Nagad; localization; multi-tenant hospital billing; real payment settlement; real-world clinical prescriptions; visit recording; AI-assisted diagnosis; production EHR interoperability.

## 5. User stories with acceptance criteria

| ID | Story | Acceptance criteria |
| --- | --- | --- |
| US-01 | As visitor I filter cardiologists near a hospital | Only `APPROVED` active doctors returned; fee and specialty filters compose |
| US-02 | As doctor I apply with BMDC documents | Status `PENDING` until admin decision; rejected reason visible only to applicant/admin |
| US-03 | As admin I approve doctor | Approval event logged; public doctor search now includes doctor |
| US-04 | As doctor I configure availability | Reject intervals overlapping other weekly rules or conflicting confirmed bookings |
| US-05 | As patient I view 7-day openings | All timestamps rendered Dhaka; blocked/reserved intervals omitted |
| US-06 | As patient I reserve a video slot | Only one hold succeeds; other caller receives 409 conflict |
| US-07 | As patient I complete payment | Appointment `CONFIRMED` only after validated sandbox status, amount, currency and reserved slot |
| US-08 | As worker I expire unpaid holds | Expired slot released; delayed payment cannot steal replacement booking |
| US-09 | As patient I book for my child | Appointment patient_profile_id is child's profile, manager is authenticated account |
| US-10 | As patient I cancel | Correct 100/50/0% policy, refund record, freed slot and notification |
| US-11 | As doctor I block a day | Future affected appointments cancelled with patient notification and eligible full refund |
| US-12 | As patient/doctor I join video | Token only allowed from start−5min through configured consultation end/grace |
| US-13 | As patient I upload a medical report | Private object, MIME/size checks and ownership; unapproved doctor/admin denied |
| US-14 | As doctor I prescribe | Only assigned doctor after valid consultation; immutable revisions; editing locks at 24h |
| US-15 | As patient I review a doctor | Appointment must be `COMPLETED`, review unique by appointment ID |
| US-16 | As admin I see revenue | Count validated sandbox captures; no medical content or paid-at-chamber amounts as captured revenue |
| US-17 | As operator I boot services | One `docker compose up --build` launches app, API, worker, database, cache with explicit env requirements |

## 6. Non-functional requirements / measurable demo targets

- **Privacy:** all medical/demo-content routes require resource authorization; no admin medical reading API; sensitive request data omitted from application logs.
- **Security:** TLS/HTTPS, strict CORS, validation with Zod, JWT refresh rotation, rate limiting, CSRF defenses when cookies are used, file-type and size limits, upload quarantine/scanning, signed short-lived downloads.
- **Data integrity:** InnoDB foreign keys and transactions, migration history, provider idempotency, unique identifiers, append-only money/event history.
- **Time:** persist UTC; render `Asia/Dhaka`; all endpoints return ISO 8601 UTC timestamps (`Z`).
- **Performance acceptance:** doctor catalogue median under 500 ms on seeded demo data; booking transaction under 2s under normal load; measure rather than claim.
- **Accessibility:** mobile-first (360px width), labeled inputs, keyboard navigability and readable error states.
- **Reliability:** workers retry idempotently; restart must not lose job intent; reminders are at-least-once delivery with dedupe keys.
- **Recovery:** database backup/restore runbook for demo and redacted operational logging.
- **Observability:** correlation IDs, request/worker errors, payment reconciliation warnings, demo health endpoint.
- **Deployment:** no secrets in Git; `.env.example` only; controlled demos; sandbox banner and seeded accounts.

## 7. Open questions, decisions and assumptions

| ID | Client clarification | Default for Day-12 demo | Risk if changed |
| --- | --- | --- | --- |
| Q-01 | Define working days and holidays | Milestones by working-day number, no calendar dates promised | Scheduling |
| Q-02 | Can schedule rows be in both modalities? | Yes, but a booked slot is consumed once across modes | High |
| Q-03 | Can a doctor own multiple chambers? | Yes, only one chamber per individual availability window | Medium |
| Q-04 | Can minor join room via guardian? | Booking/guardian account joins for dependent; consent displayed | High |
| Q-05 | Do doctors have access to all past patient reports? | Only for an authorized assigned care relationship; no unrelated history | High |
| Q-06 | What happens after a hold expires but IPN arrives late? | Payment needs refund/reconciliation; never reassign currently taken slot | High |
| Q-07 | Does one-hour cutoff apply at request or payment validation? | Enforce at payment confirmation; video hold must have positive time before the cutoff, chamber can book exactly at 1h | Medium |
| Q-08 | Does exact 2h/24h cancellation boundary get partial refund? | Yes, both are 50% bracket endpoints | Medium |
| Q-09 | Rescheduling price changes and refund policies? | Rebook equivalent-priced slot only; otherwise cancel and book anew | Medium |
| Q-10 | Payment gateway charge absorbed by whom? | Track separately; earnings estimate excludes unconfirmed fees | Medium |
| Q-11 | Live room latest permitted close time? | Until appointment end plus 10-minute demo grace | Medium |
| Q-12 | Doctor access after consultation? | Only authored records and expressly authorized patient data; retention unresolved | High |
| Q-13 | Notifications with appointments <24h away? | Skip passed threshold, still schedule 30-minute reminder | Low |
| Q-14 | Is public verification meant to show clinical data? | No, verification returns non-sensitive validity/issue metadata | High |
| Q-15 | Should chamber fees affect platform revenue? | No: chamber paid offline, not money collected by platform | Medium |
| Q-16 | Are instant live refunds mandatory for demo? | Internal simulated refund status if sandbox refund is unavailable | Medium |
| Q-17 | Can anyone sign up or upload files on publicly accessible demo? | Only invited test accounts; only approved synthetic file fixtures | High |

## 8. Definition of done for Day 12 (not production readiness)

- Staging deployment reachable over HTTPS from a phone and laptop.
- Three seeded role accounts and at least five realistic fake doctors/specialties, one test patient and one dependent.
- Working 1:1 video demo from separate browsers/devices, with an unauthorized third login denied.
- Sandbox checkout or reproducible payment-simulator fallback clearly labelled as such, with no claim of real settlement.
- Prescription PDF and public verification page both indicate demo status, with no genuine patient identity.
- 50 concurrent booking requests / one slot -> exactly one active reservation.
- Automated cancel/refund rule tests; expired hold test; repeated IPN test; admin medical-access denial test.
- README, API docs, source repository, demo script, issue list of non-production work.

## 9. Production gap (must remain open)

Before handling real patient medical information, obtain clinical/legal review, doctor credential verification procedures, patient consent policies, security audit, incident response, data retention and deletion policy, clinical prescribing restrictions, processor contracts and refund operations. A Day-12 public demo must never be represented as clinical production readiness.
