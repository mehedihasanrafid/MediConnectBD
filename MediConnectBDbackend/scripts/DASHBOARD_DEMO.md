# Local dashboard demo data

Uses only the existing `doctor.demo@mediconnect.example` and `patient.demo@mediconnect.example`
accounts on development MySQL `127.0.0.1:3306/mediconnect`. It preserves credentials and existing data.

Preview: `node scripts/seed-dashboard-demo.cjs`

Apply: `node scripts/seed-dashboard-demo.cjs --apply`

The demo creates eight non-overlapping appointments on the current Asia/Dhaka date (three completed,
five confirmed), two clearly named synthetic family beneficiaries, a harmless sample TXT report,
and a labelled message exchange. All visits have zero fees. No payment rows, prescription, medical
advice or provider call is created. Reminder flags suppress outgoing reminder email for these visits.

Run between 02:00 and 21:00 Dhaka time so the scenarios fit on the same day. The current video visit
starts one minute before the first run and lasts 45 minutes. Real Daily connectivity still requires
valid provider credentials. Readiness indicators remain unknown; seeded appointment data cannot
establish real online presence.

Reruns reuse the current day's fixtures. They do not reset a completed/cancelled demo appointment,
change existing times, or reopen an expired video window. Database writes happen only with `--apply`.
Any overlapping existing active booking aborts the fixture transaction without modifying that booking.
Only new dates create another day's fixture set. There is no automatic cleanup or deletion command.
