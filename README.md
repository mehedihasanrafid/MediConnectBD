# MediConnect BD

MediConnect BD is a browser-based healthcare platform for doctor discovery, appointment booking, video consultations, and digital prescriptions. The current implementation is the backend/database foundation for a synthetic-data demonstration.

## Current milestone

- Express 5 and TypeScript API foundation.
- Separate BullMQ worker process.
- MySQL 8 with explicit TypeORM migrations; schema synchronization is disabled.
- Redis for background-job transport.
- Initial entities for users, roles, patient profiles, doctor profiles, specialties, and hospitals.
- Idempotent seed process for catalogs and optional synthetic demo users.
- API liveness/readiness checks for MySQL and Redis.
- Docker Compose startup and automated health-route tests.
- Patient and doctor registration, login, refresh-token rotation, logout, and `/api/v1/me`.
- Reusable role authorization and immediate suspended-account denial.

Booking, payment, video, prescriptions, and frontend screens are not implemented yet.

## Prerequisites

- Docker Engine with the Compose plugin, or Node.js 24+, npm 11+, MySQL 8.4, and Redis 7.4.
- Never use real patient data or production payment credentials in this development environment.

## Run with Docker

1. Copy `.env.example` to `.env`.
2. Replace both database password placeholders with local-only values.
3. Replace `JWT_ACCESS_SECRET` with at least 32 random characters.
4. Start the base platform:

```bash
docker compose up --build
```

The migration service runs before the API. Once healthy:

- API: `http://localhost:4000`
- Liveness: `http://localhost:4000/health/live`
- Readiness: `http://localhost:4000/health/ready`

Stop services with `docker compose down`. Add `--volumes` only when intentionally deleting all local MySQL and Redis data.

## Seed data

Roles, specialties, and fictional hospitals can be seeded without user credentials:

```bash
docker compose --profile tools run --rm seed
```

To add the fictional patient, doctor, and admin accounts, set `SEED_DEMO_PASSWORD` in your private `.env` first, then run the same command. The password is never committed to the repository.

Demo account identifiers:

- `patient.demo@mediconnect.example`
- `doctor.demo@mediconnect.example`
- `admin.demo@mediconnect.example`

These accounts and the `DEMO-BMDC-NOT-REAL` identifier are synthetic and must never be presented as real people or credentials.

## Run without Docker

Create a private `.env` whose database and Redis hosts are reachable from your machine. Then run:

```bash
npm install
npm run build
npm run db:migrate
npm run db:seed
npm run dev:api
```

Run the worker in a second terminal with `npm run dev:worker`.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```

## Authentication

Authentication routes are under `/api/v1/auth`. Access tokens are short-lived bearer JWTs; refresh tokens are hashed in MySQL and rotated through an HTTP-only cookie. See `docs/authentication.md` for requests, responses, and error codes.

## Repository structure

```text
apps/
  api/       Express API, TypeORM entities/migrations/seeds, health checks
  worker/    BullMQ background worker
packages/
  shared/    Shared application constants and types
infra/
  docker/    Runtime image
docs/        Decisions and technical documentation
compose.yaml
```

## Safety defaults

- TypeORM `synchronize` is disabled; every schema change requires a reviewed migration.
- MySQL stores timestamps in UTC. User-facing times will use `Asia/Dhaka`.
- Readiness fails closed when MySQL or Redis is unavailable.
- Logs redact authorization and cookie headers.
- No real secrets, medical documents, or demo passwords belong in Git.
- Admin access to clinical content will be denied by API policy and tested before those modules are enabled.

## Next milestone

Add Redis-backed authentication rate limits, email verification/password reset, session management, and audit events. Then implement admin doctor approval and the public doctor directory before scheduling and booking.
