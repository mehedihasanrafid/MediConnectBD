# Local backend development

Last updated: 2026-10-19.

The backend runs directly with Node.js. MySQL and Redis run as local services. Docker is not needed; existing container files are retained for a later deployment phase.

## Where the code is

Project folder: `/home/mehedi/Desktop/MediConnectBD`.

The main backend is now in `MediConnectBDbackend`, following the DokanBDbackend folder layout. Start with its [README](../MediConnectBDbackend/README.md) and [CODE-MAP](../MediConnectBDbackend/CODE-MAP.md). Routes delegate to controllers; entities live in their owning feature modules.

| Location | Contents |
| --- | --- |
| `MediConnectBDbackend/src/modules/payments/` | Payment routes, validation, service, repository, and SSLCommerz adapter |
| `MediConnectBDbackend/src/modules/<feature>/*.entity.ts` | Database entities beside each feature |
| `MediConnectBDbackend/src/database/migrations/1761220800000-add-payments.ts` | Payment database migration |
| `MediConnectBDbackend/tests/payment*.test.ts` | Payment automated tests |
| `MediConnectBDbackend/src/modules/` | Authentication, doctors, scheduling, appointments, payments |
| `worker/src/worker.ts` | Background worker entry point |

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

The existing private profile uses MySQL port `3307`. Keep it if your server runs there. If switching to a system MySQL server on `3306`, update `DB_PORT` and ensure its database/user exist. Keep your existing private password.

Set `JWT_ACCESS_SECRET` to at least 32 random characters. Generate a value locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in private `.env`. Never commit `.env`.

## Database creation: fresh installations only

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

First terminal:

```bash
cd /home/mehedi/Desktop/MediConnectBD
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Second terminal:

```bash
cd /home/mehedi/Desktop/MediConnectBD
npm run dev:worker
```

`npm run dev` starts the API and watches source changes. `db:migrate` and `db:seed` build the API automatically. Apply migrations when new ones are added; rerunning seeds on every edit is unnecessary. Stop the API or worker with Ctrl+C.

## Verify and test

- API: `http://localhost:4000`
- Liveness: `http://localhost:4000/health/live`
- Readiness: `http://localhost:4000/health/ready`
- Doctor search: `http://localhost:4000/api/v1/doctors`

```bash
npm run typecheck
npm test
npm run build
```

Normal tests run 73 checks and skip four opt-in disposable-MySQL checks. The full 77-check suite separately passed against a temporary MySQL 8.0.46 instance. Ordinary unit/HTTP tests need neither Docker nor the project database.

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

On 2026-10-19 the existing project database on port `3307` refused connections, and a standalone Redis executable was not found in the shell path. A separate temporary MySQL server verified the payment migration and concurrency tests and was stopped afterward. Start/configure local MySQL and Redis before applying the project migration or expecting API readiness to pass.
