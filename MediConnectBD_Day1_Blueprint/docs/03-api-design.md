# 03 — REST API Contract: MediConnect BD

**Version:** v1 • **Base URL:** `/api/v1` • **Schema:** [`../spec/openapi.yaml`](../spec/openapi.yaml) (draft)

## API conventions

- JSON request/response bodies except multipart uploads, PDFs, and SSLCommerz gateway form callbacks.
- All API times are ISO-8601 **UTC** strings (`2026-10-20T11:00:00.000Z`); user interface converts to **Asia/Dhaka**.
- All currency amounts are integer **minor units** (e.g., BDT 800.00 -> `80000`). Never accept fees or discount percentages from the frontend as authoritative.
- Authentication: `Authorization: Bearer <access_token>`; refresh token held in Secure/HttpOnly/SameSite cookie, CORS and CSRF protections configured appropriately.
- Responses use `{ "data": ... }` for success and `{ "error": { "code": "...", "message": "...", "requestId": "...", "details": ... } }` for errors.
- Mutation requests for appointment/payment/refund should use `Idempotency-Key: <uuid>`; server stores key + user + endpoint + request hash + response for a bounded TTL.
- Standard pagination: `page=1&limit=20`, maximum 100; `meta: {page,limit,total}`; public endpoints never expose unapproved/suspended doctors.
- All rate-limit and upload validation failures use `429`/`413` respectively.

## Routes and access

Legend: V=Visitor, P=Patient, D=Approved Doctor, A=Admin, S=trusted system callback/worker.

| Method | Path | Role | Outcome |
| --- | --- | --- | --- |
| POST | `/auth/register/patient` | V (invite required) | Create demo patient account and SELF profile |
| POST | `/auth/register/doctor` | V (invite required) | Create demo doctor account in PENDING state |
| POST | `/auth/login` | V | Access token + refresh session |
| POST | `/auth/refresh` | session | Rotate refresh token |
| POST | `/auth/logout` | signed in | Revoke session |
| GET | `/auth/me` | P/D/A | Current user + status |
| GET | `/specialties` | V | Active specialties |
| GET | `/hospitals` | V | Hospital list |
| GET | `/doctors` | V | Filter approved doctors by name/specialty/hospital/area/maxFeeMinor/modality |
| GET | `/doctors/{doctorId}` | V | Public doctor profile |
| GET | `/doctors/{doctorId}/slots` | V | 7-day slots; `from`,`to`,`modality` |
| GET | `/patients/me/profiles` | P | Own and family profiles |
| POST | `/patients/me/profiles` | P | Create dependent profile |
| PATCH | `/patients/me/profiles/{profileId}` | P | Update owned profile |
| POST | `/doctor/documents` | D (pending allowed) | Upload proof/credential document |
| GET | `/doctor/me` | D | Private doctor profile and approval status |
| PATCH | `/doctor/me` | D | Update profile and fees (approval rules apply) |
| PUT | `/doctor/availability` | D | Replace weekly rules, reject overlapping intervals |
| GET | `/doctor/availability` | D | Own weekly schedule |
| POST | `/doctor/blocks` | D | Block leave/emergency period; trigger cancellations |
| GET | `/doctor/chambers` | D | Own chamber addresses |
| POST | `/doctor/chambers` | D | Add a chamber |
| PATCH | `/doctor/chambers/{chamberId}` | D | Update own chamber |
| GET | `/doctor/earnings` | D | Daily/monthly paid-video earnings and commission |
| GET | `/doctor/appointments` | D | Own today/upcoming/past appointments |
| POST | `/appointments` | P | Hold video slot or confirm chamber slot |
| GET | `/appointments/me` | P | Booked account history |
| GET | `/appointments/{appointmentId}` | P/D | Authorized appointment metadata |
| POST | `/appointments/{appointmentId}/cancel` | P/D | Policy-based cancellation and refund request |
| POST | `/appointments/{appointmentId}/reschedule` | P | Move booking through audited transaction |
| POST | `/doctor/appointments/{appointmentId}/complete` | D | Complete encounter |
| POST | `/doctor/appointments/{appointmentId}/no-show` | D | Mark no-show after slot start |
| POST | `/payments/appointments/{appointmentId}/initiate` | P | Create SSLCommerz sandbox session |
| POST | `/payments/sslcommerz/ipn` | S | Unauthenticated gateway webhook; validated server-side |
| POST | `/payments/sslcommerz/return/{outcome}` | S | Browser-return landing, **never** authoritative |
| GET | `/payments/me` | P | Own payment history / statuses |
| POST | `/appointments/{appointmentId}/video-token` | P/D | Restricted participant token and server URL |
| GET | `/patients/{profileId}/visits` | P/D | Consent-gated prior appointment history |
| GET | `/patients/{profileId}/prescriptions` | P/D | Consent-gated previous prescriptions |
| GET | `/medicines/suggest` | D | Demo medicine-name autocomplete |
| POST | `/medical-files` | P | Upload synthetic medical report |
| GET | `/medical-files` | P/D | Authorized list by patient profile |
| GET | `/medical-files/{fileId}/download` | P/D | Authorized expiring download |
| POST | `/appointments/{appointmentId}/prescriptions` | D | First prescription after consultation |
| PATCH | `/prescriptions/{prescriptionId}` | D | New immutable revision before lock time |
| GET | `/prescriptions/{prescriptionId}` | P/D | Authorized prescription content |
| GET | `/prescriptions/{prescriptionId}/pdf` | P/D | Authorized PDF file |
| GET | `/prescriptions/verify/{verifyId}` | V | Public NON-clinical validity metadata |
| POST | `/appointments/{appointmentId}/review` | P | One review after completed appointment |
| GET | `/doctors/{doctorId}/reviews` | V | Public moderated doctor reviews |
| GET | `/admin/doctor-applications` | A | Applicant list with verification status |
| GET | `/admin/doctors/{doctorId}/documents` | A | Private doctor-credential documents, not patient files |
| GET | `/admin/doctor-documents/{documentId}/download` | A | Authorized verification-document download |
| POST | `/admin/doctors/{doctorId}/decision` | A | Approve/reject with reason |
| PATCH | `/admin/users/{userId}/status` | A | Suspend/reactivate account |
| POST | `/admin/specialties` | A | Create specialty |
| PATCH | `/admin/specialties/{specialtyId}` | A | Edit specialty |
| POST | `/admin/hospitals` | A | Create hospital |
| PATCH | `/admin/hospitals/{hospitalId}` | A | Edit hospital |
| GET | `/admin/appointments` | A | Appointment metadata only |
| GET | `/admin/payments` | A | Payments/refunds metadata only |
| POST | `/admin/refunds/{refundId}/reconcile` | A | Mark sandbox refund simulated/reconciled, audited |
| PATCH | `/admin/reviews/{reviewId}/moderation` | A | Hide/reinstate review |
| GET | `/admin/dashboard` | A | Aggregates and top specialties/doctors |
| GET | `/health` | V | Service status (no secrets) |

**OpenAPI coverage:** The machine-readable YAML includes full core booking/payment/prescription/security contracts and paths for other MVP modules. Day-1 sign-off requires validating parameter types and statuses; implementation must later generate Swagger and match tests against the spec.

## Detailed request/response examples

### 1. Search by specialty and max video fee

`GET /api/v1/doctors?specialty=cardiology&area=Dhanmondi&maxFeeMinor=100000&modality=VIDEO&page=1&limit=10`

**200 OK**
```json
{
  "data": [
    {
      "id": "demo-doctor-uuid",
      "displayName": "Dr. Demo Physician",
      "specialties": ["Cardiology"],
      "area": "Dhanmondi",
      "videoFeeMinor": 80000,
      "chamberFeeMinor": 60000,
      "approvalStatus": "APPROVED",
      "averageRating": 4.7
    }
  ],
  "meta": {"page": 1, "limit": 10, "total": 1}
}
```

### 2. Available slot inventory

`GET /api/v1/doctors/{doctorId}/slots?from=2026-10-20&to=2026-10-26&modality=VIDEO`

**200 OK**
```json
{
  "data": [
    {"slotId": "slot-uuid", "startsAt": "2026-10-20T11:00:00.000Z", "endsAt": "2026-10-20T11:15:00.000Z", "available": true, "modePolicy": "BOTH", "feeMinor": 80000}
  ],
  "timeZone": "Asia/Dhaka"
}
```

### 3. Book video and reserve 10-minute hold

`POST /api/v1/appointments` with `Idempotency-Key: 3fe8...`

```json
{"slotId": "slot-uuid", "patientProfileId": "profile-uuid", "modality": "VIDEO"}
```

**201 Created**
```json
{
  "data": {
    "appointmentId": "appointment-uuid",
    "status": "PAYMENT_PENDING",
    "holdExpiresAt": "2026-10-20T10:10:00.000Z",
    "feeMinor": 80000,
    "currency": "BDT",
    "nextAction": "INITIATE_SANDBOX_PAYMENT"
  }
}
```

**409 Conflict** if slot held/booked, patient overlaps, doctor unavailable, duplicate contrary booking; `422` for invalid booking horizon.

### 4. Initiate SSLCommerz sandbox checkout

`POST /api/v1/payments/appointments/{appointmentId}/initiate`

**201 Created**
```json
{"data": {"paymentId": "payment-uuid", "gateway": "SSLCOMMERZ_SANDBOX", "checkoutUrl": "https://sandbox.sslcommerz.com/...", "expiresAt": "2026-10-20T10:10:00.000Z"}}
```

Gateway checkout URL is provided by SSLCommerz. Backend validation of IPN and transaction amount/currency is mandatory. If payment clears after expiration, record paid-but-unfulfilled and queue reconciliation/refund; **never resurrect a slot already rebooked**.

### 5. Obtain a consultation token

`POST /api/v1/appointments/{appointmentId}/video-token`

**200 OK**
```json
{"data": {"wsUrl": "wss://livekit-project.example", "token": "short-lived-room-token", "room": "opaque-room-uuid", "validUntil": "2026-10-20T11:15:00.000Z"}}
```

Backend enforces authenticated booking account/doctor, appointment `CONFIRMED` / `IN_PROGRESS`, time window from slot start−5min, allowed roles, exactly one bound participant identity per role and room-specific grants. A token TTL by itself does not disconnect active participants: the server must close the room at its permitted end and enforce capacity.

### 6. Create demo prescription

`POST /api/v1/appointments/{appointmentId}/prescriptions`

```json
{
  "diagnosis": "Synthetic example diagnosis",
  "medicines": [{"name": "Sample medicine (fictional)", "dose": "Demo dose", "timing": "After meal", "durationDays": 3}],
  "tests": ["Demo blood test"],
  "advice": "This is a synthetic demonstration, not medical advice"
}
```

**201 Created** returns `prescriptionId`, `verifyId`, `version: 1`, `lockedAt` (nullable until the visit is completed), `demoOnly: true`. `PATCH` appends version 2, never overwrites version 1. `GET /prescriptions/verify/{verifyId}` exposes only `valid`, `demoOnly`, `issuedAt`, `revisionNumber`, not medicines or diagnosis.

## Error codes and state-based responses

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Invalid payload shape/syntax |
| 401 | `UNAUTHENTICATED` | No valid session |
| 403 | `FORBIDDEN` | Role/resource relationship denied, including admin medical access |
| 404 | `NOT_FOUND` | Unknown or concealed resource |
| 409 | `SLOT_UNAVAILABLE` | Already held/booked or overlapping interval |
| 409 | `ALREADY_REVIEWED` | Second review for same appointment |
| 409 | `STATE_CONFLICT` | Wrong appointment/payment state |
| 410 | `HOLD_EXPIRED` | Reservation window elapsed |
| 422 | `BOOKING_WINDOW_INVALID` | Fewer than 60 min or more than 7 days before visit |
| 422 | `PRESCRIPTION_LOCKED` | Edit attempted after completion+24h |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Sanitized server error with correlation ID |

## Cross-cutting endpoint security

- Reject inactive accounts on authenticated requests and prohibit unapproved doctors from working, except application/profile endpoints.
- Doctor detail and slot queries exclude pending, rejected or suspended practitioners.
- Medical-file content is never returned in public, doctor-search, dashboard, appointment list or admin list payloads.
- For the publicly accessible demo, registration requires an invite code and file uploads are limited to preapproved synthetic fixtures (content hash allowlist); no uncontrolled collection of real documents. Every download or join request independently checks appointment/owner relationship; never trust a `doctorId`/`patientId` supplied by client.
- Implement explicit HTTP method allowlists, signed/multipart upload limits, safe MIME sniffing, anti-malware step, private bucket, and time-limited downloads.
- Treat IPN as an *untrusted signal* until provider validation succeeds. Gateway callback must be safe to repeat and arrive out of order.
- Generate service-level `requestId` and avoid logging report filenames, diagnoses, JWTs, room tokens or payment credentials.
