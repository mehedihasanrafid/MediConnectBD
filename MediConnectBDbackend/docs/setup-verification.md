# Backend Setup Verification

Updated: 2026-10-19. Development uses local Node.js, MySQL, and Redis. Docker is deferred. Follow [Local development](./LOCAL_DEVELOPMENT.md).

## Verified

- Shared, API, and worker TypeScript checks and builds passed.
- Current normal test run: 99 passed, five optional MySQL integration tests skipped.
- Previous full run before the Swagger additions, with isolated local MySQL 8.0.46: all 77 then-existing tests passed.
- Swagger/OpenAPI: 35 operations across 33 paths validated against actual router bindings; browser rendering and same-origin assets checked. The temporary documentation-only preview server was stopped afterward.
- The full migration chain, including payment tables, succeeded in the temporary database.
- Parallel initiation, concurrent duplicate callbacks, rollback, and late-payment checks passed against real MySQL.
- The temporary test server was stopped afterward.
- System MySQL on port 3306: dedicated app account provisioned by the user; all seven migrations and catalog/synthetic demo seeds completed.
- Live API on port 4000: readiness returned HTTP 200 with MySQL and Redis up; Swagger UI, OpenAPI JSON, and seeded doctor search also returned HTTP 200.
- Synthetic journey: patient login, doctor search, 36-slot availability, active hold, video `PENDING_PAYMENT` appointment, and patient history succeeded.
- Worker expiry: a forced-expired synthetic hold was processed on the next recurring run; the appointment became `PAYMENT_EXPIRED`, the hold `EXPIRED`, and the matching slot `AVAILABLE`. The temporary worker was then stopped.

## Project setup remaining

1. Start the worker separately with `npm run dev:worker` during normal local operation; it is not kept running by the API process.
2. Set sandbox credentials and a public HTTPS callback for an end-to-end SSLCommerz test.

No Docker installation or Compose command is needed. Local system MySQL and the bundled Redis must be running when restarting the backend. Database provisioning, migrations, and seeding have now completed.
