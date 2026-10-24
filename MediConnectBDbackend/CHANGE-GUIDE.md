# How to change the backend

## Add or change a feature

1. Open `src/modules/<feature>`.
2. Define the request validation in `<feature>.schema.ts`.
3. Implement business rules in `<feature>.service.ts`.
4. Put persistence behind `<feature>.repository.ts` and `typeorm-<feature>.repository.ts`.
5. Handle request parsing and responses in `<feature>.controller.ts`.
6. Register URL/middleware/controller bindings in `<feature>.routes.ts`.
7. Register a new route group in `src/routes/v1.ts`; construct new dependencies in `src/server.ts`.
8. Add focused tests under `tests/`.

For any HTTP contract change, update `src/docs/openapi.ts` and `src/docs/openapi.schemas.ts` alongside the route/schema, then run `npm run test:docs`. This verifies documented method/path coverage and checks synthetic examples against real Zod inputs.

## Change a database table

1. Update the module's `.entity.ts` mapping.
2. Add a new migration under `src/database/migrations` and register it in `src/database/data-source.ts`.
3. Keep `synchronize: false`. Never rewrite an applied migration to change the live schema.
4. Run the migration against the local development database and verify the feature.

Moving an entity file does not rename its database table. The folder reorganization requires no new schema migration.

## Comments and structure

The 2026-10-19 handover pass added purpose/ownership notes across 80 backend, worker, and shared source files, plus detailed JSDoc on 59 key functions/methods. Comments cover HTTP boundaries, role versus ownership checks, refresh-token replay, Dhaka-to-UTC conversion, slot-locking/expiry, approval transitions, exact payment amounts, callback verification, idempotency, and incomplete worker/refund features.

Keep these notes aligned with behavior whenever changing a rule. Update a function's explanation in the same edit as its logic. Do not interpret a description of a planned feature as an implemented capability; the worker currently implements automatic unpaid-hold expiry, but provider reconciliation, reminders, email, and refunds remain future jobs.

- Document why a business or transaction rule exists.
- Keep comments for expiry, money, permissions, callback verification, and concurrency boundaries.
- Use meaningful method names; avoid comments that simply repeat the next line.
- Routes bind URLs; controllers handle HTTP; services handle business decisions.
- Keep password hashes, tokens, provider credentials, and private medical data out of logs and documentation.
- Give every worker job a stable name, versioned payload, bounded batch, retry policy, and idempotent database transition.

## Verify from the backend folder

```bash
npm run typecheck
npm test
npm run build
```

Use [the development control file](docs/DEVELOPMENT_CONTROL.md) to record completion and remaining work. Do not commit or push unless Mehedi asks.
