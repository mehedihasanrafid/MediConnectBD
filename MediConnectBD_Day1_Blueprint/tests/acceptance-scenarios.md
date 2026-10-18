# Acceptance Scenarios — MediConnect BD MVP

These are **planned tests**, not executed tests. Use Vitest + Supertest against an actual MySQL test database; never validate locking against an in-memory mock.

## Core booking concurrency test (P0)

**Given** one available doctor slot whose start is at least 2 hours away; 50 *distinct* patient users/profiles; valid independent access credentials.  
**When** all 50 users send `POST /api/v1/appointments` for the same `slotId` as near-simultaneously as practical with unique idempotency keys.  
**Then** exactly one request succeeds with HTTP 201; the other 49 return 409; the slot has exactly one `current_appointment_id` pointing to a `PAYMENT_PENDING` booking; no other active overlapping appointments exist for that doctor. Run several iterations and repeat for `CHAMBER` mode.

```ts
// Test sketch — adapt to actual application and test fixtures (not runnable yet).
const responses = await Promise.all(
  patientTokens.map((token, i) =>
    request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `booking-race-${testRunId}-${i}`)
      .send({ slotId, patientProfileId: patientProfileIds[i], modality: 'VIDEO' })
  )
);
expect(responses.filter(r => r.status === 201)).toHaveLength(1);
expect(responses.filter(r => r.status === 409)).toHaveLength(49);
expect(await countActiveReservationsForSlot(slotId)).toBe(1);
```

The `Promise.all` sketch provides concurrent network requests, not proof that the database is correctly serialized. The DB assertion is mandatory; intentionally add a delay inside the locking transaction in a test-only environment to widen the race window. Optionally use a barrier to synchronize starts.

## Same patient overlapping doctors (P0)

Given two independently available doctor slots with overlapping `start < otherEnd AND end > otherStart`, launch two simultaneous booking calls using the same patient profile. Exactly one should succeed, even if both slots are individually available.

## Hold expiration (P0)

Given a video hold created at `t0`, test no payment at `t0+10m`; the expiry worker releases it. Also test a booking attempt after expiry **before** worker run; the transaction itself releases the stale hold and may reserve the slot for a new patient.

## Payment callback ordering and duplicate delivery (P0)

- Browser redirect `success` without gateway validation -> not confirmed.
- Same valid IPN delivered three times -> appointment confirmed once, one payment validated event/commission and one logical confirmation notice.
- Valid IPN after expiry/new booking -> old appointment remains EXPIRED, new booking remains current; late capture flagged for refund.
- IPN with mismatched amount/currency/tran_id -> rejected, appointment not confirmed.
- A prior `FAILED` signal followed by validated genuine payment -> reconcile, never blindly trust callback order.

## Refund boundary table (P0)

Given sandbox-paid VIDEO visit with exactly BDT 800.00 gross (80000 minor units), assert:

| Cancellation offset | Actor | Refund minor units | Outcome |
| --- | --- | ---: | --- |
| 24h + 1ms | Patient | 80000 | 100% |
| Exactly 24h | Patient | 40000 | 50% |
| 6h | Patient | 40000 | 50% |
| Exactly 2h | Patient | 40000 | 50% |
| 2h − 1ms | Patient | 0 | 0% |
| 5min | Doctor | 80000 | 100% |

Assert no refund when platform collected nothing for pay-at-chamber booking.

## Authorization (P0)

- Pending doctor cannot access another doctor's schedule, see patients or issue video tokens.
- Admin requesting `GET /medical-files/{id}/download`, `GET /prescriptions/{id}` or `/prescriptions/{id}/pdf` gets 403/404 and no medical content.
- Patient A cannot enumerate or view Patient B's reports or appointment.
- Assigned doctor gains access only with active clinical consent grant; unrelated doctor denied.
- Third account and suspended user denied LiveKit join token even if appointment ID is known.

## Prescription audit (P1)

- Doctor creates prescription after a completed demo appointment; version=1, public verification includes demo status only.
- Before `completedAt+24h`, an edit creates version=2; version 1 remains queryable to authorized doctor/patient.
- At or after `completedAt+24h`, patch fails with `422 PRESCRIPTION_LOCKED`.
- Patient cannot modify prescription; admin cannot read it.
- PDF visibly states `DEMO / NOT VALID FOR CLINICAL USE`.

## Schedule and timezone (P1)

- Sunday 17:00 `Asia/Dhaka` = 11:00 UTC on that date; backend stores UTC and frontend renders Dhaka.
- Exactly 1h-before-start is allowed for chamber; video hold requires positive remaining time before the 1-hour payment-confirmation cutoff. Less than 1h is rejected.
- Exactly 7 days ahead is allowed; later rejected.
- Overlapping weekly rules/different-length slots for one doctor are rejected, not generated as simultaneous inventory.
- Blocking confirmed appointments triggers cancellation events, refund eligibility and notification intents.

## Review and reminder (P1)

- First review after completion succeeds; second on same appointment is rejected 409.
- No review after cancelled/no-show/pending appointment.
- On confirmation >24h before start, two reminders queued at exact offsets; if appointment <24h away, skip past 24h job.
- On reschedule, old reminder job is canceled/invalidated by slot-start comparison and new job is queued.
