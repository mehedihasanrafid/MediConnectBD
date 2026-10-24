# Test the backend with Swagger and OpenAPI

Swagger is the browser testing interface. OpenAPI is its machine-readable description of the implemented routes, inputs, responses, and authentication.

## Start and open

From the backend folder, with local MySQL and Redis running:

```bash
cd /home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend
npm run db:migrate
npm run dev
```

Open:

- Swagger UI: `http://localhost:4000/api-docs/`
- OpenAPI JSON: `http://localhost:4000/openapi.json`
- Alias for the same JSON: `http://localhost:4000/api-docs.json`

Use your configured `PORT` if it is not 4000. Swagger uses the same origin as the API, so its requests follow the host/port where you opened the page.

The regular server still needs MySQL/Redis to finish startup. Swagger does not start those services or bypass their connection requirements. Its route handlers themselves do not call readiness checks; this separation lets documentation tests run without real infrastructure.

## First patient test

1. Expand **Authentication → Register a patient and start a session**.
2. Click **Try it out**, edit the synthetic example email/password/name, and click **Execute**.
3. A successful registration returns `201`, `accessToken`, and the public account view. If the email exists, use the login endpoint instead.
4. Copy the returned `accessToken`.
5. Click **Authorize** near the top. Paste the token into **bearerAuth**, without the word `Bearer`, and authorize it.
6. Expand **Account → Read the authenticated account**, choose **Try it out → Execute**, and check the response.

The example passwords are sample inputs, not the password for any pre-existing account. Never copy a real production password into documentation.

JWT authorization is kept in the current Swagger page session, not persisted across a reload. When it expires, use your session refresh or log in again and replace the token in Authorize.

## Cookie behavior

Login/registration set an HTTP-only `mediconnect_refresh` cookie. Browsers cannot expose that cookie to Swagger JavaScript or manually set it from an Authorize field. Use the authentication endpoints on the same origin and let the browser manage it automatically.

- **Refresh session** has no request body and rotates the cookie.
- **Logout** has no request body and clears/revokes that refresh cookie.
- Authorize **bearerAuth** for normal protected endpoints; do not paste a value into **refreshCookie**.
- Logging in as another account replaces the browser's current refresh cookie. If you switch among patient, doctor, and admin, also replace the bearer token deliberately.
- Logging out revokes refresh access. An already-issued access JWT continues to follow its expiry/current-account checks.

## Test existing workflows

### Find a doctor and book

1. Read **Catalog** to get real specialty/hospital IDs or slugs.
2. Search **Doctors** and copy an approved doctor's `id`.
3. Read that doctor's **Scheduling → Find bookable slots**. Omit `from` to begin today or choose a date in the rolling seven-day window.
4. As a patient, create a hold using an actual returned `slotId`.
5. Create an appointment using the returned `holdId` before its ten-minute expiry.
6. Read your appointments to inspect the result.

Chamber visits confirm immediately. Video visits remain `PENDING_PAYMENT` until provider-verified payment. Slot timestamps in responses are UTC; schedule inputs are Dhaka local times.

### Doctor onboarding and scheduling

1. Register/log in as a doctor and replace the bearer token with that doctor's token.
2. Complete your profile with qualifications, actual specialty IDs, and a video fee or active chamber.
3. Submit the application.
4. An admin account reviews it through **Admin**. Public registration cannot create admin accounts; use the existing synthetic admin seed process and your private configured demo password.
5. Once approved, use the doctor schedule/time-off endpoints. `PUT` schedule replaces all weekly rules.

Editing an approved profile resets approval, and a pending application is frozen. Replace the time-off example date with a date appropriate for your current test.

### Sandbox video payment

1. Book a video appointment as a patient.
2. Open **Payments → Create a sandbox hosted checkout**.
3. Supply the real `appointmentId`, payer example values, and an `Idempotency-Key` such as `checkout_test_2026_001`.
4. Execute and open the returned `gatewayUrl` in your browser.
5. Complete the sandbox checkout, then read/reconcile your payment or read appointments.

The idempotency key and request body must stay the same for a retry. Price/currency come from the appointment on the server. Sandbox store credentials and a public HTTPS callback are required; see [payments](./payments.md).

**Provider callbacks** are documented for integration testing, but arbitrary values cannot create a successful payment: the backend verifies them with SSLCommerz. A forged `status` or calling the `/success` path has no authority. Refund execution is not implemented and has no documented public endpoint.

## Reading failures

| Status | Common reason |
| --- | --- |
| `401` | Missing/expired token or invalid/reused refresh session |
| `403` | Wrong role, suspended account, unapproved doctor, or wrong ownership |
| `404` | Resource absent or hidden from that account |
| `409` | Slot conflict, expired hold, invalid business state, or idempotency mismatch |
| `422` | Request fields or service validation failed |
| `502` | Provider request/verification failed; an uncertain checkout may return `details.paymentId` |
| `503` | Sandbox configuration or a health dependency is unavailable |

Use the exact response `code` and `message`. A Swagger page loading does not establish that a booking, payment, or dependency is healthy.

## OpenAPI outside Swagger

Import `http://localhost:4000/openapi.json` into an OpenAPI-compatible tool such as Postman, or download that JSON for a frontend developer. The JSON contains synthetic examples and public contracts; no private environment values are embedded.

## Maintain and verify

- `src/docs/openapi.ts`: implemented paths, roles, parameters, responses, and request examples.
- `src/docs/openapi.schemas.ts`: component schemas and synthetic example values.
- `src/docs/openapi.routes.ts`: JSON endpoints and local Swagger assets/configuration.
- `tests/openapi.test.ts`: specification validation, actual-router coverage, Zod example checks, and documentation HTTP/security behavior.

```bash
npm run test:docs
npm run typecheck
npm test
npm run build
```

Update the documentation when changing a route or schema. Swagger's UI adjustment for local HTTP is scoped to `/api-docs`; regular API security headers remain unchanged. The online Swagger validator is disabled so testing does not send the specification to an external validator.

Current verification: 99 tests passed and five disposable-MySQL checks were skipped. Payment responses may include `EXPIRED` after the background worker closes an unpaid hold.

Official references: [Bearer authentication](https://swagger.io/docs/specification/v3_0/authentication/bearer-authentication/), [Swagger UI configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/).
