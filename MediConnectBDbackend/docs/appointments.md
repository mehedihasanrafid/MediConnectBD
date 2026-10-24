# Appointment holds and booking

The appointment module protects each concrete slot with a database row lock. A patient
first creates a ten-minute hold, then converts that hold into an appointment. This
prevents two concurrent requests from reserving the same doctor and start time.

All routes require a patient bearer token. The current milestone books for the
authenticated user's own patient profile; family/dependent selection will be added
later.

## Booking flow

1. Load an approved doctor's public availability.
2. Create a ten-minute hold for one available slot.
3. Create an appointment from that hold.
4. For chamber visits, the appointment becomes `CONFIRMED` immediately.
5. For video visits, it becomes `PENDING_PAYMENT` until the payment module confirms it.

Appointments must be selected at least one hour before their start time.

## Create a hold

```http
POST /api/v1/appointments/holds
Authorization: Bearer <patient-access-token>
Content-Type: application/json
```

```json
{
  "slotId": "appointment-slot-uuid"
}
```

The response contains the hold expiry and a snapshot of the selected slot. Repeating
the request from the same patient returns the same active hold. A different patient
receives `409 SLOT_UNAVAILABLE`.

## Create the appointment

```http
POST /api/v1/appointments
Authorization: Bearer <patient-access-token>
Content-Type: application/json
```

```json
{
  "holdId": "slot-hold-uuid"
}
```

Important response fields:

- `status`: `CONFIRMED` for chamber or `PENDING_PAYMENT` for video.
- `paymentRequired`: `true` only while a video appointment awaits payment.
- `feeAmount`: immutable fee copied from the selected slot.
- `scheduledStartAt` and `scheduledEndAt`: UTC timestamps.

## Release a hold

```http
DELETE /api/v1/appointments/holds/{holdId}
Authorization: Bearer <patient-access-token>
```

Releasing an active video-payment hold cancels its pending appointment and makes the
slot available again. The background worker checks every 30 seconds and expires up to
100 overdue holds per run. Expired holds are also reclaimed transactionally when another
patient attempts to claim the slot. Public availability treats an expired hold as
available even before that cleanup occurs.

Worker cleanup rechecks the hold, slot, appointment, and optional payment under MySQL
write locks. It changes a pending video appointment to `PAYMENT_EXPIRED`, marks an
unconfirmed payment `EXPIRED`, and releases only a slot whose reservation timestamp
still matches that hold. A confirmed appointment or successful payment is never released.

## Patient appointment history

```http
GET /api/v1/appointments/me
Authorization: Bearer <patient-access-token>
```

The endpoint returns only appointments belonging to the authenticated patient.

## Concurrency guarantee

Slot selection locks the `appointment_slots` row inside a MySQL transaction. The
transaction checks the current slot state, expires a stale hold when necessary,
creates the new hold, and marks the slot held before committing. Competing requests
serialize on that row, so only one patient can receive a new hold.
