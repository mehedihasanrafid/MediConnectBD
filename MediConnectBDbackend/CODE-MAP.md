# Backend code map

Follow a request through:

```text
src/server.ts
  -> src/app.ts
  -> src/routes/v1.ts
  -> src/modules/<feature>/<feature>.routes.ts
  -> <feature>.controller.ts
  -> <feature>.schema.ts + <feature>.service.ts
  -> typeorm-<feature>.repository.ts
  -> <feature>.entity.ts
  -> MySQL
```

| Work | Open this location |
| --- | --- |
| Register/login/session cookies | [Auth controller](src/modules/auth/auth.controller.ts) |
| Session validation and roles | [Auth middleware](src/modules/auth/auth.middleware.ts) |
| Current user's `/me` response | [User controller](src/modules/users/user.controller.ts) |
| Doctor profile, search, approval | [Doctor controller](src/modules/doctors/doctor.controller.ts) |
| Schedule, time off, availability | [Scheduling controller](src/modules/scheduling/scheduling.controller.ts) |
| Hold/book/list appointments | [Appointment controller](src/modules/appointments/appointment.controller.ts) |
| Sandbox payments and callbacks | [Payment controller](src/modules/payments/payment.controller.ts) |
| Liveness/readiness | [Health controller](src/modules/health/health.controller.ts) |
| Add a versioned route group | [Versioned router](src/routes/v1.ts) |
| Connect infrastructure or inject a service | [Server](src/server.ts) |
| Change environment validation | [Environment](src/config/env.ts) |
| Register an entity or migration | [Data source](src/database/data-source.ts) |
| Error responses | [Error handler](src/middlewares/error-handler.ts) |

For a database model, open the entity in its owning module: `users`, `role`, `patients`, `doctors`, `specialties`, `hospitals`, `auth`, `scheduling`, `appointments`, or `payments`. For an existing schema change, create a new migration; keep applied migration history unchanged.

The full documentation remains in [Source code map](docs/SOURCE_CODE_MAP.md).

Background jobs are in `src/workers/worker.ts`; shared constants are in `src/shared/index.ts`. Both belong to this single backend package. Private `.env`, `.local`, dependencies, and documentation are also inside this folder. Run all npm commands here.
