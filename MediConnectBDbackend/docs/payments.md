# SSLCommerz sandbox payments

Last updated: 2026-10-19.

## Scope and current status

The API can create a sandbox checkout for an owned video appointment, read payment status, reconcile status with SSLCommerz, receive verified provider callbacks, and automatically expire unpaid holds. MySQL stores payment records, deduplicated verification events, and the refund-table foundation.

This module follows MediConnect's existing route → controller → schema/service → repository structure. DokanBD's configuration, token-generation, and provider-separation patterns informed the implementation. Its ecommerce tables, roles, authentication contract, and public uploads were not imported.

Automatic hold/payment expiry is implemented through the BullMQ worker. Refund execution, automated provider reconciliation, admin review actions, and real provider end-to-end testing remain pending. The adapter always uses the sandbox hostname; live payments are not supported by this version.

## Configuration

Add these values to the private backend `.env` together:

```dotenv
SSLCOMMERZ_STORE_ID=your_sandbox_store_id
SSLCOMMERZ_STORE_PASSWORD=your_sandbox_store_password
PUBLIC_API_URL=https://your-public-https-api.example.com
```

`PUBLIC_API_URL` is the public origin of the API, without `/api/v1`, a path, query, or fragment. It must use HTTPS and be reachable by SSLCommerz; a provider cannot call localhost. Use an approved development tunnel or a test deployment. Do not put credentials in frontend code, URLs shared with users, documentation, or Git.

For the remaining sandbox verification:

1. Obtain the sandbox Store ID and Store Password and place them only in private `.env`.
2. Expose port 4000 through a stable public HTTPS origin and set that origin as `PUBLIC_API_URL`.
3. Allow form-encoded POST callbacks to `${PUBLIC_API_URL}/api/v1/payments/sslcommerz/{success|fail|cancel|ipn}`. Enable HTTP IPN in the sandbox merchant panel with the `/ipn` URL.
4. Restart the API so it loads the three values, and run the worker separately for expiry handling.
5. Create a fresh synthetic video appointment, initiate one checkout with a new idempotency key, finish the hosted sandbox payment, then verify the callback and patient payment/appointment states.
6. Preserve safe evidence such as internal transaction ID, HTTP result, final statuses, and timestamps; never copy the Store Password, card details, access token, or callback credential URLs into logs or documentation.

Without credentials the rest of the backend still starts; payment initiation and provider verification return `503 PAYMENTS_NOT_CONFIGURED`. Reading existing payment records remains available to their owner.

After starting local MySQL and Redis:

```bash
npm run db:migrate
npm run dev:api
npm run dev:worker
```

Run the API and worker in separate terminals; each command stays active until stopped.

The payment migration adds tables only. It does not replace the existing database. Its rollback refuses to delete payment history if records exist.

## Initiate a payment

`POST /api/v1/appointments/:appointmentId/payments`

Requires a `PATIENT` bearer token and `Idempotency-Key` header (16–100 letters, numbers, underscores, or hyphens). The appointment must belong to the current patient, be a video appointment in `PENDING_PAYMENT`, and retain its active ten-minute hold.

The request supplies contact/billing details required by the provider, rather than inventing patient data:

```json
{
  "name": "Synthetic Patient",
  "email": "patient@example.com",
  "phone": "01700000000",
  "address": "Test Road",
  "city": "Dhaka",
  "postcode": "1200"
}
```

The patient, price, appointment, currency, and transaction ID are derived by the server. Price is copied from the appointment using an exact decimal string. Sandbox checkout currently accepts 10–500000 BDT.

The response is `200` with a payment view:

```json
{
  "id": "payment-uuid",
  "appointmentId": "appointment-uuid",
  "patientProfileId": "patient-profile-uuid",
  "transactionId": "MC-server-generated-reference",
  "amount": "800.00",
  "currency": "BDT",
  "status": "PENDING",
  "gatewayUrl": "https://sandbox.sslcommerz.com/...",
  "expiresAt": "2026-10-19T09:10:00.000Z"
}
```

Redirect the browser to `gatewayUrl`. The URL is returned only while the payment is pending and its original hold has not expired.

There is one payment per appointment in this first implementation. Repeating the same idempotency key and payload returns its existing record. A changed payload/key returns `409`; book a fresh slot after cancellation or expiry. A hash of the initiation payload is stored for conflict detection; the raw billing payload is not persisted by this module.

If session creation times out, the gateway may already have accepted it. The local record remains `INITIATED`, and the API refuses to issue a second checkout for that transaction. The error includes `details.paymentId` so the client can read/reconcile the existing payment before any further action.

## Read and reconcile

- `GET /api/v1/payments/:paymentId`: read an owned payment from MySQL.
- `POST /api/v1/payments/:paymentId/reconcile`: query SSLCommerz for that owned payment and apply the verified state.

Both require the patient role and resource ownership. An unrelated patient receives `404`. Reading does not contact the provider. Reconciliation may return `502` if the provider has no record yet or returns ambiguous multiple transactions; this leaves the database unchanged.

## Provider callbacks

SSLCommerz sends form-encoded `POST` requests to:

- `/api/v1/payments/sslcommerz/ipn`
- `/api/v1/payments/sslcommerz/success`
- `/api/v1/payments/sslcommerz/fail`
- `/api/v1/payments/sslcommerz/cancel`

Enable HTTP IPN in the sandbox merchant panel and set the IPN URL. These callbacks do not need a patient session. They accept a transaction reference and optional validation ID; every mutation depends on a fresh server-to-server provider response. A forged `status=VALID`, callback URL name, amount, or browser redirect has no authority.

With a validation ID the API uses the Order Validation API; otherwise it queries the provider using the stored transaction reference. The verified transaction ID, amount, currency, and supplied validation ID must match. A successful charge must include a bank transaction reference. Gateway URLs are limited to HTTPS on the sandbox hostname; TLS verification stays enabled and provider requests time out after 15 seconds.

Callbacks return JSON `{ "received": true, "status": "..." }`. A frontend result-page redirect is not implemented yet.

## Booking transitions

| Verified result | Payment result | Booking result |
| --- | --- | --- |
| `VALID`/`VALIDATED`, risk `0`, active owned hold | `SUCCEEDED` | Appointment confirmed, hold converted, slot booked |
| Success after expiry/cancellation or with nonzero/unknown risk | `REVIEW_REQUIRED` | Booking unchanged; reconciliation/refund needed |
| Verified `FAILED`/`CANCELLED` | Corresponding terminal state | Pending appointment cancelled and its active hold released |
| `PENDING` | Current state retained | No booking mutation |
| Worker reaches an expired unconfirmed hold | `EXPIRED` for `INITIATED`/`PENDING` | Appointment `PAYMENT_EXPIRED`, hold expired, matching slot released |
| Repeated successful event | Existing result | No repeated transition |
| Failure after success | `SUCCEEDED` retained | Confirmed booking preserved |

The repository locks hold, slot, appointment, and payment rows before changing state. Confirmation and its event record commit together. The recurring worker scans through the `(status, expires_at)` index every 30 seconds, processes at most 100 candidates, and rechecks each candidate under locks. It does not release a confirmed appointment or successful payment, and it releases a slot only when the slot's reservation timestamp still matches the expiring hold. Existing booking logic remains a second stale-hold recovery path.

`REVIEW_REQUIRED` is deliberately sticky and needs a future operational workflow. It never silently confirms an expired booking or releases another patient's hold. A refund row alone does not send money back; provider refund execution is a separate feature.

## Persistence

- `payments`: unique appointment, unique transaction reference, unique patient/idempotency key, payload hash, exact amount/currency, status, checkout metadata, provider references, and original hold expiry.
- `payment_events`: append-only allowlisted verification evidence and a unique fingerprint per payment. `VALID` and `VALIDATED` share the same success fingerprint.
- `refunds`: payment reference, unique refund transaction reference, exact amount, status, reason, provider reference, timestamps. No refund API is enabled yet.

Raw callback bodies, card numbers, passwords, provider credential URLs, and clinical content are never persisted as payment-event payloads.

## Verification and remaining checks

Automated tests cover service verification, amount/currency/reference mismatch, duplicate initiation, uncertain initiation, private payment ownership, provider HTTP behavior, form callbacks, exact decimal handling, worker scheduling/payload validation, unpaid expiry, paid-booking protection, newer-hold protection, and booking decisions for success, failure, duplicates, late payments, and risk flags.

Repository workflow unit tests use an in-memory persistence double. A separate opt-in MySQL integration suite runs the full migration chain, parallel checkout preparation, five concurrent duplicate callbacks, transaction rollback, late-payment handling, and atomic unpaid expiry against a disposable local server. On 2026-10-19, the current normal suite passed 99 tests and skipped the five disposable-MySQL checks. Earlier database checks passed on MySQL 8.0.46; repeat the expanded suite against the target MySQL 8.4 environment before deployment. The project database now has all seven migrations, including the hold-expiry index. A real sandbox transaction additionally requires store credentials and a public HTTPS callback.

The opt-in test reads `MYSQL_PAYMENT_TEST_SOCKET` and only accepts a socket under a `/tmp/mediconnect-payment-mysql-*` directory; it always uses the separate `mediconnect_payment_verification` database. Ordinary `npm test` skips these five tests unless that disposable server is supplied.

Before enabling this for external users, complete callback/checkout rate limiting, automated provider reconciliation, target MySQL 8.4 verification, the admin review/refund workflow, and the browser result page.

Official integration reference: [SSLCommerz hosted checkout, validation, and transaction query API](https://developer.sslcommerz.com/doc/v4/index.html).
