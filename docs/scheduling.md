# Doctor scheduling and seven-day availability

The scheduling module stores recurring weekly rules in `Asia/Dhaka`, expands them
into concrete UTC appointment slots, and publishes only slots belonging to approved
doctors. Public availability enforces a one-hour minimum booking lead time and never
returns dates outside the next seven days.

## Day numbers

Weekly rules use JavaScript day numbers:

| Value | Day |
|---:|---|
| 0 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |

## Doctor schedule endpoints

All schedule-management routes require an approved doctor bearer token.

```http
GET /api/v1/doctors/me/schedule
PUT /api/v1/doctors/me/schedule
POST /api/v1/doctors/me/time-off
DELETE /api/v1/doctors/me/time-off/{timeOffId}
POST /api/v1/doctors/me/slots/generate
```

`PUT /api/v1/doctors/me/schedule` replaces the complete weekly schedule and
automatically refreshes the next seven days of available slots.

Example:

```json
{
  "rules": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "12:00",
      "slotDurationMinutes": 20,
      "mode": "VIDEO"
    },
    {
      "dayOfWeek": 3,
      "startTime": "15:00",
      "endTime": "18:00",
      "slotDurationMinutes": 20,
      "mode": "CHAMBER",
      "chamberId": "doctor-chamber-uuid"
    }
  ]
}
```

Supported durations are 10, 15, 20, and 30 minutes. Video rules require a video
consultation fee. Chamber rules require one of the doctor's active chambers. Rules
cannot overlap, even when one is video and another is chamber.

## Time off

Omit `startTime` and `endTime` for a full day:

```json
{
  "date": "2026-10-21",
  "reason": "Personal leave"
}
```

Provide both fields for partial-day leave:

```json
{
  "date": "2026-10-22",
  "startTime": "10:00",
  "endTime": "11:00",
  "reason": "Hospital meeting"
}
```

Adding or removing time off refreshes upcoming slots automatically. Existing future
slots with a non-available state are preserved so future booking work can safely add
holds and confirmed appointments.

## Public availability

```http
GET /api/v1/doctors/{doctorId}/availability?days=7
GET /api/v1/doctors/{doctorId}/availability?from=2026-10-20&days=3
```

The optional `from` date must be inside the next seven days, and `days` can be from
1 to 7 without extending beyond that window. Returned timestamps are ISO UTC
instants and the response identifies `Asia/Dhaka` as the display timezone.

Example response shape:

```json
{
  "doctorId": "doctor-profile-uuid",
  "timezone": "Asia/Dhaka",
  "from": "2026-10-18",
  "through": "2026-10-24",
  "items": [
    {
      "id": "appointment-slot-uuid",
      "startAt": "2026-10-19T03:00:00.000Z",
      "endAt": "2026-10-19T03:20:00.000Z",
      "mode": "VIDEO",
      "feeAmount": 800,
      "chamber": null
    }
  ]
}
```
