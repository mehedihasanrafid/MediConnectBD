# MediConnect BD free cloud deployment

Prepared November 5, 2026. The target is a low-traffic demo on Cloudflare Pages, a Render Free Web Service, and Aiven Free MySQL. GitHub supplies both deployments. The existing BullMQ worker also needs **one free Render Key Value instance** in the same region as the API.

## Single Render Web Service

For the one-service setup, use the following overrides. The Pages instructions below apply to the separate frontend setup.

| Render setting | Value |
| --- | --- |
| Runtime and plan | Node, Free Web Service |
| Root directory | Leave blank so both packages are available at the repository root |
| Build command | `npm --prefix frontend ci --include=dev && npm --prefix MediConnectBDbackend ci --include=dev && npm run build` |
| Start command | `FRONTEND_DIST_DIR=frontend/dist node MediConnectBDbackend/scripts/start-render.cjs` |
| Health check path | `/health/ready` |
| Pre-deploy command | Leave empty |

Use the backend environment checklist below, with `APP_URL` set to the exact Render HTTPS origin. Set the public build variable `VITE_API_BASE=/api/v1`. Omit `PAGES_PROXY_KEY` and the Pages bindings. `FRONTEND_DIST_DIR` in the start command enables static React serving and the browser-route fallback. The API and React share the Render origin, so the existing session cookie stays same-origin. Keep the same free Render Key Value dependency for the worker.

The manual Aiven migration command is unchanged. Review the empty target first and keep `sql_require_primary_key` enabled. After deployment, verify `/health/ready`, `/`, `/api/v1/catalog/specialties`, and a refresh on a protected portal route.

## Repository and deployment design

| Part | Existing entry point | Cloud configuration |
| --- | --- | --- |
| React, Vite, TypeScript and BrowserRouter | `frontend/` | Pages builds `dist/`. Only `/api/v1/*` invokes the Pages Function. Pages' SPA fallback handles direct navigation to portal routes. |
| Node.js, Express and TypeORM | `MediConnectBDbackend/` | Render runs the compiled API and existing worker. The API binds `0.0.0.0` on Render's `PORT`. |
| MySQL schema | `MediConnectBDbackend/src/database/` | Aiven holds relational data, refresh sessions, medical reports and uploaded doctor photos. Migrations are manual. |
| BullMQ | `MediConnectBDbackend/src/workers/worker.ts` | Use the Render Key Value internal URL. The worker runs while the web service is awake and restores its recurring schedules after Redis reconnects. |

The browser uses `/api/v1` on the Pages domain. The Pages Function forwards it to the configured Render HTTPS origin. This keeps the existing host-only `HttpOnly; Secure; SameSite=Strict` refresh cookie on the frontend origin. JWT signing, database access, and payment verification stay on the backend. Existing Vite development proxy, file-backed local photos, and local server commands still work.

Render Free idles and restarts. Reminders and scheduled hold cleanup may be delayed while asleep. Free Key Value does not preserve queued data across a restart. Render also restricts SMTP ports 25, 465, and 587, and applies limits to traffic to external services such as Aiven. This setup suits a low-traffic demo using test accounts and synthetic inputs. [Render Free limits](https://render.com/docs/free) · [Render private networking](https://render.com/docs/private-network) · [Aiven Free MySQL](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier)

## 1. Prepare GitHub and provider accounts

1. Create or sign in to your Cloudflare, Render, and Aiven accounts. Choose their free plans. Connect the Cloudflare and Render GitHub integrations only to this repository.
2. Review the diff and confirm that only source, configuration templates, and documentation will be staged. Check `git status --short`, `git diff --check`, and `git ls-files -- '.env*' ':(glob)**/.env*'` from the repository root. The tracked environment files should be examples. Keep CA and key files, backups, account credentials, and local database directories out of Git.
3. When you approve the reviewed changes, commit and push them to GitHub or merge the approved branch into `main`. Use the same GitHub branch in both dashboards. Record the commit with `git rev-parse HEAD`. This preparation does not create a commit, push, or connect an account.
4. Pick an intended Pages project name and a Render service name so you can identify their eventual URLs. The examples below use `https://your-project.pages.dev` and `https://your-api.onrender.com`. Replace both with the actual dashboard URLs. If the Pages project receives a different hostname, update Render `APP_URL` and Pages `APP_ORIGIN` together.

[Cloudflare Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/) · [Render web service setup](https://render.com/docs/web-services)

## 2. Provision Aiven and run the schema migrations

1. Create a dedicated **Aiven for MySQL Free** service. Use its empty `defaultdb` or a new database created in Aiven Console. Copy the host, port, username, and database name from **Overview → Connection information**. Download that project's CA certificate. Use the hostname supplied by Aiven so TLS can validate its identity. The API limits its TLS connection pool to five connections per process.
2. Create a private environment file outside the repository from [the backend template](MediConnectBDbackend/.env.production.example). Use a fresh shell and remove any inherited backend credentials first because exported variables take precedence over the private file. Set `NODE_ENV=production`, the real Aiven `DB_*` values, and a random `JWT_ACCESS_SECRET`. Paste the CA PEM into a quoted multiline `DB_SSL_CA` value. Migrations use MySQL only, so the local migration file can omit Redis and provider credentials.
3. Before running migrations, verify the server and schema from a MySQL client using the **new** Aiven database and its certificate. Let the client prompt for the password.

   ```sh
   mysql --host='<Aiven host>' --port='<Aiven port>' --user='<Aiven user>' \
     --password --ssl-mode=VERIFY_IDENTITY --ssl-ca='/absolute/private/path/ca.pem' \
     --database='<new Aiven database>'
   ```

   Run `SELECT DATABASE();` and `SHOW TABLES;`. Confirm the database is the intended empty cloud database. If Aiven IP filtering is available and enabled, allow your migration workstation temporarily and the Render service's documented outbound ranges for runtime.

4. Run from `MediConnectBDbackend/` on your workstation with Node **24.17.0** and npm **11**. Inspect the pending migration files in `src/database/migrations/` before applying them.

   ```sh
   npm ci --include=dev
   npm run build
   MEDICONNECT_ENV_FILE=/absolute/private/path/mediconnect-aiven.env npm run migration:run
   MEDICONNECT_ENV_FILE=/absolute/private/path/mediconnect-aiven.env npm exec -- typeorm migration:show -d dist/database/data-source.js
   ```

   Expect 19 recorded migrations for this revision. Confirm that every entry is marked applied. The migration runner uses compiled JS. The new photo migration only creates `doctor_photo_assets`. Both `synchronize` and `migrationsRun` are off. The Render start command checks the migration ledger by reading it and refuses to start when it is missing or incomplete. Render Free has no pre-deploy command for this workflow. Keep migrations out of the Render build and start commands.

5. Skip the repository's demo seeding commands for this setup. Registration works after the role migration. A fresh schema has no catalog or admin accounts. To test doctor approval and booking, create your own designated operator account through patient registration, then explicitly grant ADMIN to **that account only** on the new demo database. Review the email and UUID first. Execute the following only as the database operator after verifying the target. Replace the placeholder with the verified UUID.

   ```sql
   START TRANSACTION;
   SET @operator_id = '<verified registered user UUID>';
   SELECT id, email, status FROM users WHERE id = @operator_id;
   INSERT INTO user_roles (user_id, role_id)
   SELECT u.id, r.id FROM users u CROSS JOIN roles r
   WHERE u.id = @operator_id AND u.status = 'ACTIVE' AND r.name = 'ADMIN'
     AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);
   SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = @operator_id;
   ```

   Enter `COMMIT;` only after verifying the account and resulting roles. Enter `ROLLBACK;` if the result is unexpected. Sign out and back in, open `/admin/catalog`, and enter your authorized catalog data. Register a separate doctor and a separate patient for the booking checks.

[Aiven CA and identity verification](https://aiven.io/docs/platform/concepts/tls-ssl-certificates) · [Aiven database and user setup](https://aiven.io/docs/products/mysql/howto/connect-from-mysql-workbench) · [Render deploy steps](https://render.com/docs/deploys) · [Render outbound IPs](https://render.com/docs/outbound-ip-addresses)

## 3. Set up Render

Create a **free Key Value** instance in your chosen Render region first. Use the internal connection URL from its dashboard. Choose `noeviction` for the queue's eviction policy if the dashboard exposes that setting. Leave external access closed. Create a GitHub-connected **Free Web Service** in the same region.

| Render setting | Value |
| --- | --- |
| Runtime | Node |
| Branch | `main` |
| Root directory | `MediConnectBDbackend` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `node scripts/start-render.cjs` |
| Pre-deploy command | Leave empty |
| Health check path | `/health/ready` |
| Auto-deploy | Enable On Commit after the first smoke test |

The equivalent package start script is `npm run start:render`. It starts `dist/server.js` and then the existing `dist/workers/worker.js` after the API has bound its port. Ordinary local compiled API startup is still `npm start`. The supervisor starts compiled JS with production settings and stops both children on shutdown. Render provides `PORT` (default 10000); leave it managed by Render. `GET /health` and `/health/live` are unauthenticated liveness checks. `/health/ready` also checks MySQL and Redis.

| Render variable | Value |
| --- | --- |
| `NODE_VERSION` | `24.17.0` |
| `NODE_ENV` | `production` |
| `APP_URL` | Exact browser origin, e.g. `https://your-project.pages.dev`, with no trailing slash |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Values from the dedicated Aiven database |
| `DB_SSL_CA` | Aiven CA PEM including both boundary lines. Real or escaped newlines are accepted. CA and hostname checks stay enabled. |
| `REDIS_URL` | Render Key Value internal URL, in the same region |
| `JWT_ACCESS_SECRET` | New random secret of at least 32 characters. Keep it stable across redeployments. |
| `PAGES_PROXY_KEY` | A different random secret of at least 32 characters. Put the same value in Pages **as a secret**. It authenticates the proxy's client IP for rate limiting. |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `LOG_LEVEL` | Optional. Defaults are `900`, `30`, `info`. |
| `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `PUBLIC_API_URL` | Set together for checkout. Use **sandbox** credentials and the exact Render HTTPS origin for `PUBLIC_API_URL`. SSLCommerz calls Render directly; it does not need a browser session. Missing credentials return a payment-unavailable response. |
| `DAILY_API_KEY`, `DAILY_DOMAIN` | Optional. Use the Daily key and domain subdomain for real calls. Perform a real two-account call before presenting it as verified. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional. Use a reachable SMTP port offered by your provider and the provider's corresponding TLS settings. Without SMTP, no emails are sent. |
| `MEDICONNECT_ENV_FILE` | Workstation migration option only. Private absolute file path. Leave unset on Render. |

Generate separate secrets privately (for example, run `openssl rand -hex 32` twice), then paste directly into the relevant dashboards. Leave `SEED_DEMO_PASSWORD` and `DOCTOR_PHOTO_DIRECTORY` unset on Render. The compiled API uses MySQL for newly uploaded cloud photos. If importing an older database with file-backed photos, reupload those assets intentionally through the profile page. No local files are copied automatically.

[Render Node settings](https://render.com/docs/node-version) · [Render Key Value](https://render.com/docs/key-value) · [Render health checks](https://render.com/docs/health-checks)

## 4. Set up Cloudflare Pages

After Render returns 200 at `https://your-api.onrender.com/health/ready`, create a Pages project using **Git integration** and the same GitHub repo.

| Pages build setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `frontend` |
| Framework preset | None or Vite, with the exact commands below |
| Build command | `npm ci --include=dev && npm run build` |
| Output directory | `dist` |
| `NODE_VERSION` | `24.17.0` |
| `SKIP_DEPENDENCY_INSTALL` | `true` so the build command owns the lockfile install |
| `VITE_API_BASE` | `/api/v1` |
| `VITE_PUBLIC_DEMO` | `false` for a new database without the existing demo shortcut accounts |

For public login shortcuts, set `VITE_PUBLIC_DEMO=true` and supply
`VITE_DEMO_PATIENT_PASSWORD` and `VITE_DEMO_DOCTOR_PASSWORD` for the synthetic
patient and doctor accounts in the Pages build environment. Vite exposes these
demo passwords to visitors. Configure only accounts intended for public use.
Set `VITE_DEMO_ADMIN_PASSWORD` only for a synthetic demo with sandbox or disabled
payments. A public Admin shortcut gives visitors administrative access to that demo.

Add these **Production** variables in **Settings → Variables and Secrets**:

- `API_ORIGIN=https://your-api.onrender.com` (plain text, no path or slash).
- `APP_ORIGIN=https://your-project.pages.dev` (plain text, exact same value as Render `APP_URL`).
- `PAGES_PROXY_KEY` (secret, same value as Render). Only `VITE_*` values are bundled into public browser code. Do not give the secret a `VITE_` prefix.

Disable automatic preview branch deployments. The proxy serves the configured frontend origin and uses a fixed upstream. It forwards the existing session cookie and Bearer authorization, rejects other origins and unexpected upstream redirects, and marks proxied responses `no-store`. The backend keeps credentialed CORS for the exact `APP_URL`. Static assets bypass the Function through `public/_routes.json`. Keep the output free of a top-level `404.html` so the default Pages SPA fallback serves nested routes.

When adding your own domain later, configure HTTPS on Pages, update both origin variables together, redeploy, and sign in again at the new hostname. Use one canonical frontend hostname for this deployment.

[Pages build environment](https://developers.cloudflare.com/pages/configuration/build-image/) · [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/) · [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/) · [SPA routing](https://developers.cloudflare.com/pages/configuration/serving-pages/)

## 5. Verify the deployed demo

1. Check Render's `/health` and `/health/ready`. Then open the Pages home page, refresh a nested route such as `/doctor/profile`, and check that the expected page or sign-in screen renders.
2. In the browser Network panel, check that `/api/v1/auth/login` and `/api/v1/auth/refresh` go to Pages. Sign in, refresh the tab, then sign out and verify the protected route redirects to sign-in. Inspect the cookie attributes without copying its value.
3. Create an authorized doctor schedule and check booking, cancellation, communication and profile photo retrieval with your test accounts. Upload a small test photo, redeploy the API, and verify the image still loads. Check that users outside a conversation cannot open it.
4. When the SSLCommerz sandbox is configured, complete a sandbox checkout and verify the callback and resulting appointment state on the app. Confirm payment status before retrying an ambiguous checkout. Test Daily calls and mail separately if those providers are configured.
5. After an idle window, open the app again. The first request can take longer. If the provider returns an outage page or times out, the UI shows a retry message. The proxy does not automatically resubmit write requests.
6. Turn on GitHub automatic production deploys in Pages and On Commit in Render after these checks pass. Confirm which GitHub commit is deployed in each dashboard.

## Troubleshooting and rollback

| Symptom | Check or recovery |
| --- | --- |
| Render fails before opening a port | Check the startup stage in Render logs. Verify Aiven connection settings and CA, run the reviewed migrations from the workstation if pending, and check the internal Key Value URL. |
| MySQL certificate or hostname error | Download the CA from the correct Aiven project and use the provider's hostname and port. Keep verification enabled. |
| `/health` is 200 and readiness is 503 | Check which dependency is down in the readiness response. Verify both services are running. If Key Value lost its state, the worker re-registers schedules on reconnect. A Render restart reruns initialization if needed. |
| Login works but refresh loses the session | Verify the browser uses relative `/api/v1`, both frontend origins match, and HTTPS is active. Check that the Pages Function passes the host-only cookie. A direct `pages.dev` to `onrender.com` browser configuration cannot rely on the Strict cookie. |
| API returns HTML or Pages says the server is starting | Confirm the Pages Function deployed and its production bindings are present. Verify the Render origin and wait for readiness. Check the active Pages output contains `_routes.json`. |
| 404 on a nested route | Confirm `frontend` is the Pages root, `dist` the output and there is no root `404.html`. |
| API returns 429 | Wait for the reported retry window. Check that both dashboards have the same proxy key so the verified client IP is used. |
| Checkout or email unavailable | Review the sandbox variables or SMTP settings above. Check provider logs without including credentials or patient data. |
| Migration fails partway | Stop the rollout. MySQL DDL can commit independently of the migration transaction. Inspect the ledger and actual schema before retrying. Avoid resetting or reverting the database. |

For a code-only update, push the approved commit to the connected branch and verify both builds. For changes needing schema updates, pause automatic deployments, back up the cloud database, review and run forward migrations manually, then release the matching code. For a rollback, pause automation and select the last known good compatible deployments in Render and Pages. A code rollback does not undo database changes. Keep additive schema and restore a backup only into an isolated database first. Re-enable automatic deploys after resolving the Git branch and the running versions.

[Render rollback](https://render.com/docs/rollbacks) · [Cloudflare Pages rollback](https://developers.cloudflare.com/pages/configuration/rollbacks/)

## Local verification

Run from each package root:

```sh
# frontend/
npm run build
npm test
npm run lint
npm run lint:css

# MediConnectBDbackend/
npm run build
npm run typecheck
npm test
```

Verification on November 5:

- Both clean lockfile installs and production builds passed on Node 24.17.0. The frontend output contains the route manifest and static assets. Both TypeScript checks passed.
- Frontend unit tests passed (203). Backend tests passed (252), with 5 optional payment MySQL cases skipped because their test socket was unset. All 17 selected synthetic browser cases passed.
- A compiled production smoke test used disposable TLS MySQL and Redis. All 19 migrations applied, rerunning was a no-op, an untrusted CA was rejected, and startup on an empty schema created no tables. Both health endpoints, the supervised worker, and photo retrieval after restart passed.
- Local proxy and browser checks covered secure login, refresh and logout, rejected origins, nested routes, and cold-start retry. Hosted routing and real payment, video, and email providers still need the checks above.
- JavaScript lint passed with existing warnings. CSS lint reports a pre-existing blank-line rule failure in `frontend/src/shared/navigation/PortalHeader/PortalHeader.module.css:16`. Vite reports its existing large-bundle warning.

The deployment needs account setup, a new Aiven database, the Render Key Value and API instances, and the Pages project. Live provider checkout, live calls, and the hosted browser checks above are separate from local verification.

## Changed files

| File | Purpose |
| --- | --- |
| `DEPLOYMENT.md` | Provider setup, deployment commands, verification, and rollback. |
| `.gitignore` | Track production examples and exclude local Pages credentials and certificate/key files. |
| `frontend/.env.production.example` | Public Vite settings and the separate Pages bindings. |
| `frontend/functions/api/v1/[[path]].js` | Same-origin API proxy with fixed upstream, session forwarding, and outage handling. |
| `frontend/public/_routes.json` | Invoke the Function on API paths only. |
| `frontend/src/api/client.ts` | Normalize the configured API base, bound requests, and preserve outage errors through session refresh. |
| `frontend/src/api/httpResponse.ts` | Parse API responses and translate gateway HTML or unreachable API errors into actionable messages. |
| `frontend/src/features/auth/AuthContext.tsx` | Distinguish a failed session check from an unauthenticated user. |
| `frontend/src/features/auth/LoginPage.tsx` | Keep local demo shortcuts and remove the default demo password from production bundles. |
| `frontend/src/routes/guards.tsx` | Offer retry on an unavailable API without losing the current protected URL. |
| `MediConnectBDbackend/.env.example` | Correct the local seed-password guidance. |
| `MediConnectBDbackend/.env.production.example` | Render, Aiven, Key Value, and optional provider variables. |
| `MediConnectBDbackend/.gitignore` | Allow the backend's safe production template to be tracked. |
| `MediConnectBDbackend/package.json` | Add the `start:render` script for the compiled service. |
| `MediConnectBDbackend/scripts/start-render.cjs` | Supervise the compiled API and worker and forward shutdown signals. |
| `MediConnectBDbackend/src/config/env.ts` | Validate Render settings, the trusted CA, and the explicit private migration environment file. |
| `MediConnectBDbackend/src/database/data-source.ts` | Enable strict MySQL TLS when a CA is supplied, limit cloud connections, and register the additive migration. |
| `MediConnectBDbackend/src/database/check-schema.ts` | Read the migration ledger at startup and fail if migrations are pending. |
| `MediConnectBDbackend/src/database/migrations/1762000000000-add-doctor-photo-assets.ts` | Create the durable public photo table. |
| `MediConnectBDbackend/src/database/seeds/run-seeds.ts` | Reject the built-in demo password when running the seeder in production mode. |
| `MediConnectBDbackend/src/server.ts` | Bind Render's port, check schema, wire durable photo storage, and use the sandbox only when configured. |
| `MediConnectBDbackend/src/app.ts` | Verify proxy client IPs with the shared key and omit request header and query data from logs. |
| `MediConnectBDbackend/src/middlewares/rate-limit.ts` | Use the verified client IP for API rate limits. |
| `MediConnectBDbackend/src/middlewares/error-handler.ts` | Avoid raw unexpected error stacks in production logs. |
| `MediConnectBDbackend/src/modules/health/health.routes.ts` | Add the unauthenticated `/health` liveness alias. |
| `MediConnectBDbackend/src/docs/openapi.ts` | Document the liveness alias in OpenAPI. |
| `MediConnectBDbackend/src/routes/v1.ts` | Pass the selected photo storage to the doctor router. |
| `MediConnectBDbackend/src/modules/doctors/doctor.routes.ts` | Pass the storage selection to the existing photo routes. |
| `MediConnectBDbackend/src/modules/doctors/photos/doctor-photo.routes.ts` | Accept either storage implementation while retaining upload validation and authorization. |
| `MediConnectBDbackend/src/modules/doctors/photos/doctor-photo.store.ts` | Keep local file storage and share the storage contract and photo ID validation. |
| `MediConnectBDbackend/src/modules/doctors/photos/mysql-doctor-photo.store.ts` | Store and retrieve normalized cloud photos in MySQL using existing public URLs. |
| `MediConnectBDbackend/src/modules/notifications/console-transport.ts` | Keep recipient details out of the production fallback logs. |
| `MediConnectBDbackend/src/workers/worker.ts` | Restore schedules on Render Redis reconnect and sanitize worker errors. |
