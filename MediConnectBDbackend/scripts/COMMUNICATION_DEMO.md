# Local communication demo seeds

From `MediConnectBDbackend`:

```sh
npm run db:migrate
npm run seed:communication
```

This seeder is restricted to the explicitly configured localhost `mediconnect` development database.
It requires the existing demo patient and doctor accounts and does not reset their passwords.
Sign in with the existing Patient or Doctor demo button, then open Consultation Messages in the sidebar.
Refresh the conversation list after seeding.

Three synthetic scenarios are persisted for the demo pair:
- Completed chamber visit: active follow-up with two clearly labeled sample messages.
- Older completed chamber visit: expired communication, with readable sample history.
- Zero-fee synthetic confirmed video appointment: entry eligibility can be exercised during its 30-minute window.

The video appointment is synthetic development data, not a real payment or a guaranteed media call.
Daily still verifies room access and needs valid provider configuration for a real call.
No payment rows are created. No real clinical advice is seeded.

Records are marked `SYNTHETIC_COMM_<UTC date>_<scenario>`.
Rerunning on the same day reuses these appointments and sender-scoped message keys.
It does not refresh old appointment timestamps or reset entitlement windows.
A new UTC day creates a fresh set of development scenarios. Existing user records are preserved.

The messaging error on November 3 was caused by missing communication tables and `appointments.completed_at`
in the regular development database. Only the isolated test database had previously been migrated.
Both pending migrations were applied to the confirmed local development database; no production database was touched.
