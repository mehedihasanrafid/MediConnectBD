# Decision Log

Record client decisions here before they become difficult to reverse.

| ID | Date | Decision | Status | Impact |
| --- | --- | --- | --- | --- |
| D001 | 2026-10-18 | Use a modular TypeScript monolith with separate API and worker processes. | Accepted for implementation | Keeps transactions and deployment manageable within 12 working days. |
| D002 | 2026-10-18 | MySQL is authoritative for booking, payment, and clinical metadata; Redis is not a source of truth. | Accepted for implementation | Worker delays cannot create duplicate bookings or lose confirmed state. |
| D003 | 2026-10-18 | Store timestamps in UTC and render user-facing appointment times in `Asia/Dhaka`. | Accepted for implementation | Booking/refund boundaries use one central policy. |
| D004 | 2026-10-18 | Day-12 delivery is a synthetic-data and sandbox-payment demonstration, not a production clinical launch. | Proposed; client confirmation required | No real patient data or production payments may be used. |
| D005 | 2026-10-18 | Use managed LiveKit for browser video rather than building WebRTC infrastructure. | Proposed; credentials required | Reduces delivery risk but creates a vendor dependency. |
| D006 | 2026-10-18 | Admin APIs must never return report, prescription, diagnosis, or consultation-message contents. | Accepted for implementation | Enforced through module boundaries and authorization tests. |

## Open decisions

1. Confirm whether the core demo requires only patient/doctor calls or invited group participants.
2. Confirm the exact family-member consent and guardian rules.
3. Confirm whether an equal-price reschedule preserves payment or uses cancel-and-rebook.
4. Confirm the hosting provider and obtain SSLCommerz, LiveKit, SMTP, and object-storage sandbox credentials.
5. Confirm the working-day calendar and final demonstration time.
