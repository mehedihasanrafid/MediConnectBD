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
npm run db:migrate
npm run db:seed
npm run dev
```

Run the worker from the same folder in a second terminal:

```bash
npm run dev:worker
```

`db:migrate` and `db:seed` build the backend automatically. MySQL/Redis startup is separate; the current database profile uses port 3307. The local Redis installation and its data are under `.local`. Stop each Node process with Ctrl+C.

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

## Implemented features

- Patient/doctor registration, login, rotating refresh sessions, and role authorization.
- Doctor profiles, admin approval/rejection, public search, and catalogs.
- Weekly schedules, time off, generated slots, ten-minute holds, and appointments.
- SSLCommerz sandbox checkout, provider-verified callbacks, payment status/reconciliation, and refund-table foundation.

The worker currently handles only healthcheck jobs. Automated reconciliation/cleanup, notification jobs, refund execution, video, prescriptions, and frontend work remain pending. Real sandbox payment verification needs store credentials and a public HTTPS callback.

## Documentation

- [Code map](CODE-MAP.md)
- [Change guide](CHANGE-GUIDE.md)
- [Local setup](docs/LOCAL_DEVELOPMENT.md)
- [Development control](docs/DEVELOPMENT_CONTROL.md)
- [Architecture and code standard](docs/BACKEND_ARCHITECTURE_AND_CODE_STANDARD.md)
- [Database design](docs/DATABASE_DESIGN_AND_MIGRATIONS.md)
- [API and business flows](docs/API_AND_BUSINESS_FLOWS.md)
- [Payment setup](docs/payments.md)

Private settings/data and existing database tables were preserved during consolidation. The Git repository stays in the outer project folder so a frontend can be added beside this backend later.
