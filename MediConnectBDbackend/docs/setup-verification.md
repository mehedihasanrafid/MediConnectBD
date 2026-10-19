# Backend Setup Verification

Updated: 2026-10-19. Development uses local Node.js, MySQL, and Redis. Docker is deferred. Follow [Local development](./LOCAL_DEVELOPMENT.md).

## Verified

- Shared, API, and worker TypeScript checks and builds passed.
- Normal test run: 73 passed, four optional MySQL integration tests skipped.
- Full run with isolated local MySQL 8.0.46: all 77 tests passed.
- The full migration chain, including payment tables, succeeded in the temporary database.
- Parallel initiation, concurrent duplicate callbacks, rollback, and late-payment checks passed against real MySQL.
- The temporary test server was stopped afterward.

## Project setup remaining

1. Start/configure MySQL: the private profile uses `127.0.0.1:3307`, which refused connections during payment verification.
2. Start Redis: it is not in the default shell path, but local executables exist in `.local/bin`; data in `.local/redis-data` was preserved.
3. Run `npm run db:migrate` and `npm run db:seed`.
4. Start the API with `npm run dev` and the worker separately with `npm run dev:worker`.
5. Confirm `/health/ready` succeeds for both dependencies.
6. Set sandbox credentials and a public HTTPS callback for an end-to-end SSLCommerz test.

No Docker installation or Compose command is needed. Existing private settings were preserved. The project database was not migrated while unavailable.
