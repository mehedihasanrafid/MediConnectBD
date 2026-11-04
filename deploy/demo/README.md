# Public demo launch package — November 4, 2026

Status: source prepared; not deployed. Docker execution and public-domain verification are still required.
The user selected free hosting, synthetic data and SSLCommerz sandbox payments, and owns a domain.
Domain hostname and hosting account are not yet supplied.

## Hosting decision

Recommended candidate: an Oracle Always Free VM, if the account can provision one within its free allowance.
It can run the existing Express, MySQL, Redis, worker and static frontend together without a platform rewrite.
Oracle explicitly documents capacity shortages; account signup/provisioning may prevent a same-day launch.
Do not upgrade to paid resources or accept a paid trial as a substitute for the user's free-only requirement.
Render free web services sleep, so they are not sufficient for continuously running reminder/expiry workers.
A local tunnel is a temporary presentation option only, dependent on the user's computer; it is not permanent cloud hosting.

Sources checked November 4:
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://render.com/docs/free
- https://caddyserver.com/docs/automatic-https
- https://docs.docker.com/compose/how-tos/production/

## What this package changes

- `compose.demo.yml`: separate named demo stack with private MySQL/Redis and persistent volumes.
- `frontend/Dockerfile.demo`: static Vite production build served by Caddy, not the Vite development server.
- `frontend/deploy.Caddyfile`: same-origin API proxy, SPA route fallback, and automatic HTTPS for the configured domain.
- `MediConnectBDbackend/Dockerfile.demo`: compiled backend, runtime dependencies and non-root application user.
- `.dockerignore` files: exclude private environment files, local databases, dependencies and uploads from image build contexts.
- `.env.demo.example`: environment template only; no real deployment credentials are created or uploaded.
- `validate-env.mjs`: rejects missing/placeholder settings and missing sandbox payment configuration.
- `PublicDemoNotice`: demo-only build notice asking users not to upload real medical records.

The existing local Docker Compose setup remains a development setup. Do not deploy it unchanged.

## Server preparation

1. Obtain a free VM in the chosen account without enabling paid resources.
2. Install Docker Engine and Compose from Docker's official instructions for that server OS.
3. Keep SSH restricted and expose only HTTP/HTTPS for the app. MySQL, Redis and API have no host ports in this stack.
4. Choose a demo subdomain and point its DNS A record to the VM. Do not change unrelated DNS or email records.
5. Copy the project source and lockfiles, excluding Git metadata, local `.env` files, `.local`, uploads and database directories.
   Do not copy the local development database. Do not commit or push without the user's separate authorization.

## Configure on the server

Copy `.env.demo.example` to `.env.demo`, restrict file permissions to the server operator, and fill it there.
Generate independent random database passwords and a random JWT secret; use a separate demo-only sign-in password.
Do not reuse local development, production or personal credentials.

Configure the user's SSLCommerz SANDBOX credentials and `PUBLIC_API_URL=https://<demo domain>`.
The existing provider adapter uses SSLCommerz sandbox URLs; an absent configuration falls back to a local mock.
The launch validator rejects absent sandbox configuration, so mock checkout cannot silently count as sandbox verification.
Configure Daily and email credentials only if those features will be included in the public demo.
Account/provider credentials must not be pasted into committed files, commands or reports.

Validate environment values without printing them:

```sh
docker run --rm --env-file .env.demo -v "$PWD/deploy/demo:/validate:ro" node:24-alpine node /validate/validate-env.mjs
```

## Build, migrate and start

Run from the project root on the demo server:

```sh
docker compose --env-file .env.demo -f compose.demo.yml config --quiet
docker compose --env-file .env.demo -f compose.demo.yml build
docker compose --env-file .env.demo -f compose.demo.yml up -d
```

The migration service runs against the new `mediconnect_demo` database before API startup.
The worker starts only after the API is ready. Caddy obtains HTTPS after DNS and ports 80/443 are reachable.
Do not seed automatically at every restart. Seed once, intentionally:

```sh
docker compose --env-file .env.demo -f compose.demo.yml run --rm --no-deps backend npm run seed
docker compose --env-file .env.demo -f compose.demo.yml run --rm --no-deps backend npm run seed:public-demo-communication
```

The existing baseline seeder inserts synthetic platform records and uses `SEED_DEMO_PASSWORD`.
Review its records and prepare current demo appointments before presenting booking/video flows.
The local `seed:communication` script intentionally rejects this production-mode demo database; do not remove its guard.
Do not import real patient records or copy the development database just to populate messaging.
The separate `seed:public-demo-communication` command permits only the explicitly marked Docker public-demo database.
It adds labeled active, expired and video fixtures without importing the local database.

## Required public smoke test

- HTTPS loads; doctor/patient deep links load through SPA fallback.
- Session refresh works over HTTPS and secure cookies; no mixed HTTP origins remain.
- Synthetic patient/doctor/admin sign-in works with the intended demo password.
- Doctor discovery, slot availability, booking and cancellation work.
- A real SSLCommerz SANDBOX checkout returns to the correct public origin and has a validated payment callback.
- Patient/doctor messages persist after refresh and unrelated users cannot access them.
- Scheduled hold expiry/reminder worker stays running and retries appropriately.
- If video is advertised, perform a real two-device Daily call over HTTPS.
- If email is advertised, verify delivery to an agreed test mailbox.
- Label optional unconfigured capabilities unavailable; never present mock behavior as verified provider integration.

## Maintenance

Use `docker compose ... logs --tail=100 backend worker` for diagnosis, keeping logs private.
Back up the demo database before upgrades; rehearse restoring only into a separate demo database.
Never run `down -v` unless intentionally discarding demo data with the user's approval.
For a source update, rebuild images, apply reviewed forward migrations, then repeat the smoke tests.

## Current verification limits

No Docker engine is installed in the current local environment, so images, Compose startup and Caddy TLS have not been executed here.
Local application tests/builds do not establish cloud deployment readiness.
The public hostname, VM provisioning, provider credentials and remote smoke tests remain outstanding.
