# MediConnect BD backend

A standalone Express/TypeScript backend with the familiar DokanBDbackend folder structure. Run all npm commands here; there are no parent npm workspaces or sibling worker/shared packages.

## Folder structure

```text
MediConnectBDbackend/
├── src/
│   ├── modules/            Feature routes, controllers, schemas, services, entities
│   ├── routes/v1.ts        Registers /api/v1 feature routes
│   ├── database/           Connection, migrations, seeds
│   ├── config/env.ts       Validates this folder's private .env
│   ├── middlewares/        Request IDs, errors, not-found handling
│   ├── utils/              General helpers
│   ├── workers/worker.ts   BullMQ worker, run as a separate process
│   └── shared/index.ts     Shared constants within the backend
├── tests/
├── docs/
├── .local/                 Preserved local Redis executables/data (ignored)
├── .env                    Existing private credentials (ignored)
├── .env.example
├── package.json
├── package-lock.json
├── tsconfig.json
├── CODE-MAP.md
└── CHANGE-GUIDE.md
```

## Run locally

Node.js 24+, npm 11+, MySQL, and Redis are required. Keep the existing private `.env`; its credentials and local database port are preserved. The API and worker both load this backend folder's `.env` in source and compiled execution. Docker is not required.

```bash
cd /home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend
npm install
npm run db:setup:local
npm run db:migrate
npm run db:seed
npm run dev
```

Run the worker from the same folder in a second terminal:

```bash
npm run dev:worker
```

`db:setup:local` is a one-time Linux setup for the installed system MySQL on port 3306. Run it in your terminal and enter your computer login password at the sudo prompt. It reads database credentials from private `.env`, creates the database if needed, updates the dedicated app account password to match `.env`, and preserves database contents. It does not start MySQL or Redis. `db:migrate` and `db:seed` build the backend automatically. See [local development](docs/LOCAL_DEVELOPMENT.md) for service startup. Stop each Node process with Ctrl+C.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch/run the API |
| `npm run dev:worker` | Watch/run the background worker |
| `npm run typecheck` | Check all backend, shared, and worker source |
| `npm test` | Run backend tests; disposable MySQL checks are opt-in |
| `npm run build` | Compile all source into dist |
| `npm start` | Run compiled API after a build |
| `npm run start:worker` | Run compiled worker after a build |
| `npm run db:migrate` | Build and apply pending migrations |
| `npm run db:seed` | Build and seed catalogs/optional demo users |
| `npm run db:revert` | Build and revert the last migration, subject to its guards |

API: `http://localhost:4000`; readiness: `http://localhost:4000/health/ready`.

## Test in your browser

Open Swagger UI at `http://localhost:4000/api-docs/` after starting the API. Use registration/login, copy `accessToken`, click **Authorize → bearerAuth**, then test protected endpoints. Paste the token without `Bearer`.

OpenAPI JSON is available at `/openapi.json` and `/api-docs.json`. See [Swagger testing](docs/SWAGGER_TESTING.md) for the full patient/doctor/payment testing flow. `npm run test:docs` checks the specification and route coverage.

## Implemented features

- Patient/doctor registration, login, rotating refresh sessions, and role authorization.
- Doctor profiles, admin approval/rejection, public search, and catalogs.
- Weekly schedules, time off, generated slots, ten-minute holds, and appointments.
- SSLCommerz sandbox checkout, provider-verified callbacks, payment status/reconciliation, automatic unpaid-hold expiry, and refund-table foundation.

The worker registers a BullMQ job every 30 seconds to expire bounded batches of unpaid appointment holds. Automated provider reconciliation, notification jobs, refund execution, video, prescriptions, and frontend work remain pending. Real sandbox payment verification needs store credentials and a public HTTPS callback.

## Documentation

- [Code map](CODE-MAP.md)
- [Change guide](CHANGE-GUIDE.md)
- [Local setup](docs/LOCAL_DEVELOPMENT.md)
- [Development control](docs/DEVELOPMENT_CONTROL.md)
- [Architecture and code standard](docs/BACKEND_ARCHITECTURE_AND_CODE_STANDARD.md)
- [Database design](docs/DATABASE_DESIGN_AND_MIGRATIONS.md)
- [API and business flows](docs/API_AND_BUSINESS_FLOWS.md)
- [Payment setup](docs/payments.md)
- [Swagger and OpenAPI testing](docs/SWAGGER_TESTING.md)

Private settings/data and existing database tables were preserved during consolidation. The Git repository stays in the outer project folder so a frontend can be added beside this backend later.
