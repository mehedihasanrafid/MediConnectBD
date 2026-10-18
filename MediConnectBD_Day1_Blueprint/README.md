# MediConnect BD — Day 1 Engineering Blueprint

**Planning date:** 2026-10-15 (Asia/Dhaka)  
**Client brief:** 2026-10-14  
**Target:** Publicly accessible demo by working day 12; synthetic patient data; SSLCommerz sandbox only.  
**Status:** Architecture and API **design artifacts**, not a working codebase or a claim of deployed software.

## File map

| File | Purpose |
| --- | --- |
| `docs/01-requirements.md` | Scope, personas, requirements, user stories, acceptance criteria, ambiguity register, security and demo definition of done |
| `docs/02-database-and-erd.md` | Full Mermaid ERD, entities, data dictionary, keys, indexes, constraints, privacy boundaries |
| `docs/03-api-design.md` | REST contracts, RBAC, sample requests/responses, errors, pagination, webhooks |
| `docs/04-booking-payment-workflows.md` | Concurrency, booking and payment state machines, cancellation/refund, video permission and background job flows |
| `docs/05-day1-delivery-and-tests.md` | Day-1 task breakdown, 12-working-day milestone gates, prioritized tests and demo script |
| `spec/openapi.yaml` | Draft, machine-readable OpenAPI 3.0.3 specification (not a generated server) |
| `spec/schema.mmd` | Standalone Mermaid ER diagram |
| `tests/acceptance-scenarios.md` | BDD-style acceptance scenarios and concurrent booking test plan |

## Project-wide decisions (proposed, not client-approved)

- Modular monolith: React + TypeScript / Express + TypeScript / TypeORM / MySQL 8, Redis + BullMQ and private object storage.
- Browser video via LiveKit Cloud with server-issued, narrowly scoped room tokens.
- All appointment timestamps stored in UTC, rendered in `Asia/Dhaka`; MySQL `DATETIME(3)` values treated as UTC by the application.
- One canonical, non-overlapping doctor slot inventory across chamber/video modalities; choosing a modality consumes the same doctor slot.
- Video appointment reserves a slot for **up to** 10 minutes, never beyond the one-hour booking cutoff.
- SSLCommerz server-side validation required before confirming a video booking; callbacks and retries are idempotent.
- Patient and doctor actions involving sensitive records are authorized at the resource/relationship level; admin has no content-access API.
- Demo includes only synthetic medical records, clearly flagged test accounts, invitation-gated signups, allowlisted synthetic document uploads, and prescriptions labeled **DEMO / NOT VALID FOR CLINICAL USE**.
- Refund simulation must be shown as `SIMULATED`, not as provider-settled money.

## Recommended implementation order

1. Freeze assumptions and sign off the data model, auth/permissions and invariant list.
2. Create repository and Docker Compose baseline with frontend, API, worker, MySQL and Redis; `docker compose up --build` should be the local startup command after `.env` setup.
3. Write initial TypeORM migrations and seeds; start Swagger from `spec/openapi.yaml`.
4. Implement auth and role checks before exposing medical endpoints.
5. Implement slot generation, bookings and DB-level concurrency tests before payment or video.
6. Implement sandbox payment reconciliation, background jobs and non-production demo flows.

## Vendor documentation used

- SSLCommerz: https://developer.sslcommerz.com/docs.html and https://developer.sslcommerz.com/doc/v4/
- MySQL locking reads: https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html
- MySQL deadlocks: https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html
- LiveKit token security: https://docs.livekit.io/frontends/reference/tokens-grants/

## Quality disclaimer

This is a planning package. Neither the OpenAPI draft nor the ERD has been converted to a runnable backend. Clinical/legal compliance, patient consent, data retention, vendor contracts, production infrastructure and live payment settlement require additional review before onboarding real patients.
