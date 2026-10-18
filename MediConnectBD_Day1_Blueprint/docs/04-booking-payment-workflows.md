# 04 — Concurrency, State Machines, Refunds and Background Jobs

## 1. Booking state machine

```text
Video:       AVAILABLE -> PAYMENT_PENDING (HELD) -> CONFIRMED -> IN_PROGRESS -> COMPLETED
                                              |            |              \
                                              |            |               -> NO_SHOW
                                              |            -> CANCELLED
                                              -> EXPIRED / CANCELLED
Chamber:     AVAILABLE -----------------------> CONFIRMED -> ...
```

An appointment history record remains after cancellation or expiry; the slot is made available by resetting its `current_appointment_id`, not deleting history. Use separate payment states: `INITIATED`, `PENDING`, `VALIDATED`, `FAILED`, `LATE_VALIDATED`, `REFUND_PENDING`, `REFUNDED`, `REFUND_SIMULATED`. Individual payment attempts remain auditable.

## 2. Transactionally reserve a slot

**Important:** Generate a single set of non-overlapping slots per doctor across all modalities. All slot generation/mutation serializes on its doctor's row and checks interval overlap. A slot can be sold in one modality only once.

Pseudocode for `POST /appointments`:

```text
require role PATIENT and active account
validate UUIDs, modality, idempotency key
begin MySQL transaction (READ COMMITTED for this operation)
  lock PATIENT_PROFILES row (managed_by_user_id must match auth user)
  lock APPOINTMENT_SLOTS row FOR UPDATE by unique slot ID
  load doctor profile and validate APPROVED + ACTIVE
  calculate now from backend clock
  ensure start_at >= now+60min and <= now+7*24h
  ensure slot not blocked and requested modality allowed
  if current_appointment_id != null:
    load pointed appointment; if hold expired, mark EXPIRED and clear pointer
    else reject 409 SLOT_UNAVAILABLE
  query all active patient appointments across *all* doctors whose
    time ranges overlap (existing.start < new.end AND existing.end > new.start)
    statuses CONFIRMED/IN_PROGRESS or non-expired PAYMENT_PENDING
  reject overlap
  create appointment record and append immutable status-event history:
    chamber -> CONFIRMED; fee source DOCTOR_CHAMBER
    video   -> PAYMENT_PENDING; holdExpiresAt=min(now+10min, startAt-60min)
  point APPOINTMENT_SLOTS.current_appointment_id at new appointment
  write APPOINTMENT_EVENTS and EMAIL_OUTBOX actions as appropriate
commit
return state and hold expiry
```

Locking the patient row serializes overlapping bookings made for the *same patient* with two different doctors. Locking the slot serializes competing requests for the *same doctor slot*. Use the same lock order in any path that acquires both: patient profile first, then slot. Booking attempts that lose a race return 409, not 500. On lock deadlock or timeout, perform a bounded retry keyed by `Idempotency-Key`, then return a safe retryable error.

Do **not** keep a database transaction open while calling SSLCommerz, sending email or contacting LiveKit. These external effects happen after commit and rely on durable outbox/event records.

## 3. Payment initiation and reconciliation

1. Patient initiates checkout for their own currently valid `PAYMENT_PENDING` appointment. Backend creates unique `payments.gateway_tran_id` and sandbox checkout session.
2. SSLCommerz redirects user. Browser return is for display only; it cannot confirm a booking.
3. IPN/callback handler validates notification against SSLCommerz's API and matches `tran_id`, gross amount, BDT, expected merchant and status.
4. Under a **short DB transaction**, lock the appointment slot and payment/appointment rows (use deterministic ordering within payment path, and avoid paths with inverted lock sequences); dedupe the gateway event.
5. If reservation is still current and unexpired (plus booking cutoff), move appointment to `CONFIRMED`, payment to `VALIDATED`, issue email/reminder outbox rows and credit provisional 10% commission.
6. If hold expired/reassigned/cancelled, mark payment `LATE_VALIDATED`, do **not** confirm or steal current slot, and create refund/reconciliation task.
7. Repeated notifications, browser returns, API retries and worker restarts must not duplicate payment confirmation, commission or emails.

In the demo, actual refund API behavior depends on sandbox capabilities. `REFUND_SIMULATED` is acceptable only if exposed as a simulation everywhere, with no settlement claim.

### Out-of-order callback case

If `FAILED` arrives and then verified `VALID` arrives, prioritize authenticated gateway validation and actual provider transaction lookup, not the order of browser callbacks. Once a transaction is validated/captured, do not revert it to `FAILED` because of a stale message. Investigation is needed for contradictory statuses.

## 4. Expiry workers

Use BullMQ delayed jobs for initial scheduling **and** a periodic DB reconciliation scan to recover jobs lost after outages.

```text
expireHold(appointmentId):
  DB transaction:
    lock slot then appointment
    if appointment.status != PAYMENT_PENDING: do nothing
    else if now >= hold_expires_at and slot.current_appointment_id == appointment.id:
      mark appointment EXPIRED
      clear slot.current_appointment_id
      write appointment event
  commit
```

The booking endpoint itself also checks and reclaims expired holds under the slot lock, so a delayed worker cannot keep a slot falsely unavailable. Successful but late payments go into manual/sandbox refund reconciliation; they cannot revive an expired appointment.

## 5. Cancellation and refund service

Compute against the scheduled UTC start at cancellation request time:

| Who initiates | Time before visit | Refund percent |
| --- | --- | ---: |
| Patient | More than 24 hours | 100% |
| Patient | Exactly 24h down to exactly 2h | 50% |
| Patient | Less than 2h | 0% |
| Doctor | Any time | 100% |

For chamber appointments, paid-at-chamber means no platform refund (0 collected by platform). For paid video, `refund_minor = paid_minor * percent / 100` with integer-safe currency rounding. Keep gateway fee adjustments separate from consultation gross; reserve finance review for provider charge policy.

Cancel transaction: lock subject patient profile as needed, slot then appointment/payment consistently; verify actor and state; mark cancellation with reason; clear slot pointer only if it points to this appointment; create refund row (even if 0? use event without a refund for zero), revoke video/grants and enqueue emails. Refund worker interacts with gateway *after commit*. No optimistic frontend-only refund update.

Reschedule MVP default: only equal-priced slots, transfer atomically after policy/availability validation, with original slot released, booking/payment trail preserved, and an immutable `appointment_events` record containing `old_slot_id`/`new_slot_id`. For different-fee moves, use cancel/refund and create new booking; do not invent a balance wallet.

## 6. Reminder scheduling

When appointment becomes `CONFIRMED`, create outbox rows with unique keys:

- `appointment:{id}:confirmation:{stateVersion}` immediately.
- `appointment:{id}:reminder24:{startTimestamp}` at start−24h only if future.
- `appointment:{id}:reminder30:{startTimestamp}` at start−30m only if future.

On cancel/reschedule, older outbox items become invalid; worker checks `appointment.status == CONFIRMED` and `appointment.slot.start == expectedStart` **before** sending. Job retries can deliver at least once, so dedupe by unique keys, provider message IDs when available, and a transactional claim in email_outbox. Never claim guaranteed exactly-once email transport.

## 7. Video access flow

Backend verifies session belongs to the booked account (guardian allowed for dependent) or the assigned and approved doctor; appointment is confirmed/in-progress and current time is `[start−5min, end+10min]` for demo. Mint short-lived LiveKit tokens with room UUID and opaque account identity; deny other users, including admin. Max room participant count is 2. A room server-side closing job disconnects participants at the final boundary. Tokens alone don't terminate existing connections; handle revocation explicitly. Chat uses LiveKit data/text streams. Durable file sharing uses the authenticated upload endpoint and restricted file grants; avoid sending protected medical records to unrestricted rooms.

## 8. Clinical-document flow

- Patient uploads *synthetic only* PDF/image -> MIME/type/size validation -> private quarantine storage -> malware-scanned status -> authorized clinician view.
- Booking produces scoped access grant for assigned doctor, subject to patient/guardian consent; cancellation revokes pre-visit access.
- Doctor creates prescription while appointment is IN_PROGRESS or after it is COMPLETED (and later revisions) -> validation ensures assigned doctor and valid locked_at window.
- `locked_at = completed_at + 24h`, not `created_at + 24h`; it remains null until the doctor marks the encounter complete. After deadline, edits denied, original revisions still downloadable.
- PDF includes random verification identifier and demo watermark. Public verification intentionally excludes diagnosis/medicines/patient identifiers.

## 9. High-priority race conditions to test

1. 50 distinct patients race for same slot: exactly one live reservation.
2. Same patient concurrently books two overlapping slots with different doctors: at most one.
3. Expiry job races payment validation: never two current reservations or a paid+confirmed invalid slot.
4. Late IPN after another patient books: old payment reconciles but old booking stays expired.
5. Browser success redirect without verified IPN: booking stays pending.
6. Duplicate gateway webhook: one capture, one commission, one confirmation.
7. Cancellation races reminder delivery: stale reminder not sent after cancellation if worker has not already dispatched; unavoidable in-flight emails documented.
8. Two schedule-rule edits create overlapping different-start slots: only one succeeds.
9. Prescription edit at `locked_at`: rejected; immediately before boundary: allowed, exactly once per idempotent request.
10. Admin attempts to download a report: HTTP 403/404, no signed URL leaked.
