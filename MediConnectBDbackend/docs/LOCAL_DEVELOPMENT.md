# Local backend development

Last updated: 2026-10-19.

The backend runs directly with Node.js. MySQL and Redis run as local services. Docker is not needed; unused container configuration was removed from the active project during cleanup.

## Where the code is

Backend folder: `/home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend`.

The main backend is now in `MediConnectBDbackend`, following the DokanBDbackend folder layout. Start with its [README](../README.md) and [CODE-MAP](../CODE-MAP.md). Routes delegate to controllers; entities live in their owning feature modules.

| Location | Contents |
| --- | --- |
| `src/modules/payments/` | Payment routes, validation, service, repository, and SSLCommerz adapter |
| `src/modules/<feature>/*.entity.ts` | Database entities beside each feature |
| `src/database/migrations/1761220800000-add-payments.ts` | Payment database migration |
| `tests/payment*.test.ts` | Payment automated tests |
| `src/modules/` | Authentication, doctors, scheduling, appointments, payments |
| `src/workers/worker.ts` | Background worker entry point |
| `src/workers/system-jobs.ts` | Stable job names, schedules, payload validation, and processors |

## Prerequisites

- Node.js 24+ and npm 11+.
- Running local MySQL and Redis servers. Targets: MySQL 8.4 and Redis 7.4.

The application does not install or start these services. Start their installed units through your operating system. If Redis is not installed, install it locally before starting the API or worker. Both processes require Redis connectivity; booking and payment state belongs in MySQL.

## Private environment

Preserve an existing `.env`. Copy `.env.example` only for a fresh installation.

The template points to local services:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=mediconnect
DB_USER=mediconnect_app
DB_PASSWORD=your_local_database_password
REDIS_URL=redis://127.0.0.1:6379
```

The private profile uses MySQL port `3306`, matching the installed system server. The previous `3307` endpoint was unavailable. The dedicated application account is now provisioned, and the private password was adjusted to satisfy the installed MySQL password policy.

Set `JWT_ACCESS_SECRET` to at least 32 random characters. Generate a value locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in private `.env`. Never commit `.env`.

## Database creation: fresh installations only

On this Linux machine, run `npm run db:setup:local` in your terminal. Enter your **computer login password** at the sudo prompt. This reads private `.env`, creates the database if needed, aligns the dedicated local application account's password with `.env`, and grants access to the configured database. It does not drop database contents. It requires working `sudo mysql` administrator access. Then run migrations and seeds below.

If the database and user do not already exist, run this template through a MySQL administrator connection. Replace the password privately to match `.env`:

```sql
CREATE DATABASE IF NOT EXISTS mediconnect
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'mediconnect_app'@'127.0.0.1'
  IDENTIFIED BY 'replace_with_your_local_database_password';
GRANT ALL PRIVILEGES ON mediconnect.* TO 'mediconnect_app'@'127.0.0.1';
```

`CREATE USER IF NOT EXISTS` does not change an existing user's password. Use its existing credentials. Do not drop an existing database: migrations add payment tables to the current schema.

## Start the backend

If the bundled Redis is stopped, start it in a separate terminal (keep that terminal open):

```bash
cd /home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend
./.local/bin/redis-server --bind 127.0.0.1 --port 6379 --dir "$PWD/.local/redis-data" --appendonly yes
```

Do not start a second Redis if port 6379 is already in use.

First terminal:

```bash
cd /home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend
npm install
npm run db:setup:local
npm run db:migrate
npm run db:seed
npm run dev
```

Second terminal:

```bash
cd /home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend
npm run dev:worker
```

`npm run dev` starts the API and watches source changes. `db:migrate` and `db:seed` build the API automatically. Apply migrations when new ones are added; rerunning seeds on every edit is unnecessary. Stop the API or worker with Ctrl+C.

## Verify and test

- API: `http://localhost:4000`
- Liveness: `http://localhost:4000/health/live`
- Readiness: `http://localhost:4000/health/ready`
- Doctor search: `http://localhost:4000/api/v1/doctors`
- Swagger UI: `http://localhost:4000/api-docs/`
- OpenAPI JSON: `http://localhost:4000/openapi.json`

```bash
npm run typecheck
npm test
npm run build
```

Normal tests now run 99 checks and skip five opt-in disposable-MySQL checks. The earlier 77-check suite (before the documentation and worker-expiry tests were added) separately passed against temporary MySQL 8.0.46. Ordinary unit/HTTP tests need neither Docker nor the project database. Follow [Swagger testing](./SWAGGER_TESTING.md) to test requests in your browser.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| MySQL connection refused | Start MySQL and match `DB_HOST`/`DB_PORT` to its listener |
| MySQL access denied | Check the database user, host grant, and private password |
| Unknown database | Create the configured database once, then run migrations |
| Redis connection refused | Start/install Redis and check `REDIS_URL` |
| Hostname `mysql` or `redis` cannot resolve | Use local addresses from `.env.example` |
| Payment table missing | Run `npm run db:migrate` |
| Payment returns `PAYMENTS_NOT_CONFIGURED` | Follow [payment configuration](./payments.md) |
| Port 4000 in use | Stop the previous API or change `PORT` |

Readiness passes only when MySQL and Redis respond. Passing automated tests does not establish that local services are running.

## Current machine status

On 2026-10-19 the user completed administrator provisioning on system MySQL at `127.0.0.1:3306`. All seven migrations and the catalog/synthetic demo user seed completed successfully. The API on port 4000 returns HTTP 200 readiness with database and Redis up. Patient login, doctor search, availability, hold creation, and video appointment creation were verified with synthetic data. A temporary worker run automatically expired a forced-expired synthetic hold and released its slot; the worker was stopped afterward. Redis uses preserved `.local/redis-data`. The separate disposable MySQL server used earlier for integration tests is not the project database.
