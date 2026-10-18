# 05 — Day-1 Work Package, Roadmap, Acceptance and Demo

**Day 1:** Thursday, 2026-10-15. **Working-day numbering** is authoritative until the client confirms weekend/holiday calendar.

## A. Day-1 deliverables

| Deliverable | Acceptance evidence | Status in this pack |
| --- | --- | --- |
| Requirements analysis and user stories | Scope matrix, exclusions, user stories and assumption register | **Drafted; awaiting client sign-off** |
| ERD | Source Mermaid diagram, table purposes and cardinalities | **Drafted; awaiting migration review** |
| API plan | Endpoint inventory, authorization, DTO examples, OpenAPI YAML | **Drafted; not implemented** |
| Booking/cancellation rules | State machine, invariant specification, concurrency test plan | **Drafted; not executed** |
| Single-command environment | Compose launches client, API, worker, MySQL, Redis | **Not built yet** |
| Role authentication | Patient, doctor, admin | **Not implemented yet** |

**Do not present these designs as finished application functionality.**

## B. Proposed Day-1 developer tasks (8-hour working day)

| Duration | Work | Concrete output |
| --- | --- | --- |
| 1h | Read brief, resolve conflicts, classify scope | `docs/01-requirements.md` plus question list |
| 1.5h | Domain boundaries and ERD | `spec/schema.mmd`, FK/index checklist |
| 1.5h | Booking state machine and transactional rules | workflow document and race test cases |
| 1h | API endpoint/design contract | draft OpenAPI YAML |
| 1.5h | Create monorepo skeleton, Compose and env templates | runnable local skeleton (to implement) |
| 1h | Run baseline boot/smoke checks and commit | documented results and commit |
| 0.5h | Send daily report and record client assumptions | communication/documentation |

The design pack supplies the first four outputs; the code setup and tests still require execution in a repository.

## C. Milestone gates (12 working days)

| Gate | Demonstration | Non-negotiable evidence |
| --- | --- | --- |
| **Day 3** | One-command local startup; patient/doctor/admin logins, ERD, API docs | Migration and login smoke tests; no secrets committed |
| **Day 6** | Doctor approval, speciality/hospital management, patient search, real 7-day slots | Overlap-aware slot generation tests; unapproved doctor hidden |
| **Day 9** | Exclusive booking, 10-minute hold, SSLCommerz sandbox, confirmation and reminders | 50-way booking race, hold expiry, duplicate callback and cancellation-tier tests |
| **Day 12** | Public HTTPS app, mobile two-party video, synthetic medical uploads, demo prescription PDFs, reviews, dashboard | Deny unauthorized join/download, demo watermark, end-to-end guided walk-through |

### Critical path

Database auth and role model -> doctor schedules -> canonical slots -> booking locking -> gateway reconciliation -> emails/jobs -> video token permissions -> demo prescription, PDF, dashboard -> deployment and demo.

### Time-risk controls

- Favor prebuilt LiveKit UI primitives over implementing custom WebRTC signaling.
- Reuse React form components and layouts across patient/doctor/admin.
- Show computed ratings rather than advanced recommendation/relevance ranking.
- Medicine autocomplete from *small static demo dictionary*, not clinical integration.
- No video recording or real sensitive data.
- Basic earnings report first: captured sandbox gross, 10% commission, refunds, day/month grouping.
- If time is short, keep lower-risk conveniences behind clear demo labels, but do **not** fake concurrency, authorization or payment confirmation.

## D. Tests to build first

| Priority | Test group | Assertion |
| --- | --- | --- |
| P0 | Same slot, 50 simultaneous requests | Exactly one 201, other 49 get 409; one active reservation DB row |
| P0 | Same patient, overlapping different doctors | One booking only |
| P0 | Payment callback duplication | One confirmation and no duplicated financial record |
| P0 | Hold expiry/payment race | Never confirm an expired/reallocated slot |
| P0 | Admin clinical file access | Forbidden; no signed links |
| P0 | Cancellation tiers | Exactly >24h 100%, 24h 50%, 2h 50%, <2h 0%, doctor 100% |
| P0 | Doctor status | Pending/rejected/suspended hidden, no schedules exposed |
| P1 | Reminder delivery | Scheduled at 24h/30m; stale jobs ignored after reschedule |
| P1 | Prescription revision deadline | Version grows, originals unchanged, locked at +24h |
| P1 | Review uniqueness | Second attempt on same completed appointment 409 |
| P1 | Video token auth | Correct participant/time gets token, third party/admin denied |
| P1 | Time zone and booking limits | Dhaka rendering + UTC cutoff boundaries |
| P2 | Browser/mobile UI | Layout usable at 360px and modern Android/iOS browsers |

## E. Seeded public-demo fixture set

- `patient.demo@mediconnect.example`: 1 SELF profile and 1 CHILD dependent (fictional names, synthetic records).
- `doctor.demo@mediconnect.example`: approved physician with 15-minute slots and two modalities, fictional BMDC string clearly labeled test-only.
- `admin.demo@mediconnect.example`: dashboard and doctor-approval privileges, no medical-content permissions.
- 5–8 entirely fictional doctors distributed across Medicine, Cardiology, Pediatrics and Dermatology, with fictional hospital/chamber entries.
- 1 previously completed consultation and verifiable *demo-only* prescription.
- A visible site-wide `SANDBOX / SYNTHETIC DATA` banner and no indexing of test private pages. Keep public doctor browsing open, but gate registrations with invite codes and restrict upload files to vetted synthetic fixtures.

Do not place plaintext demo credentials directly in the repository; document a secure way to obtain/reset passwords for the reviewer.

## F. Short Day-12 demo script

1. Open public doctor directory on a mobile browser; filter by specialty and fee.
2. Log in as patient, select synthetic dependent, view a seven-day calendar.
3. Open two sessions attempting the same slot; show one success and one 409 conflict.
4. Pay for video using sandbox payment, verify booking status changes only after backend validation.
5. Log in as approved doctor on a different device, view the day's queue and synthetic report.
6. Start and join a live video call from two browsers; try an unauthorized third session and show denial.
7. Complete the consultation, issue a synthetic prescription, download watermarked PDF and check public ID verification.
8. Submit a review from the completed booking; show admin dashboard/refund metadata, not clinical content.
9. Demonstrate an unpaid hold expiring and freeing the slot; show background-email job logs with private content redacted.
10. Show README setup, successful automated tests, Git commit history and public HTTPS URL.

## G. Questions to send for client confirmation

1. Is a public **synthetic-data, sandbox-only demonstration** acceptable on Day 12? (Assumed yes by project instruction.)
2. Is one canonical doctor schedule across video and physical visits correct?
3. Can family guardians join consultations for dependent patients?
4. Should equal-priced rescheduling preserve the existing payment, subject to cancellation policy?
5. Can the doctor view previous clinicians' reports when the booking patient gives consent?
6. Does the client want any actual refund transaction in sandbox, or is a visibly simulated refund acceptable?
7. What is the agreed calendar of working days and demo presentation time?

## H. GitHub commit guidance

- `docs: define demo scope, user stories and decision register`
- `docs: add domain ERD and initial MySQL entity constraints`
- `docs: add OpenAPI v1 contract and booking state machine`
- `chore: initialize compose-based React/Express/worker skeleton` (only once actually created)

Use small, reviewable commits. Do not commit `.env`, medical data, sandbox passwords or private keys.
