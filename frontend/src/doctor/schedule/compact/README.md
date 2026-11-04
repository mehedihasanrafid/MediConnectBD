# Schedule & Leave

Route: `/doctor/schedule`. The page shows weekly hours first. Forms and leave
details appear only when the doctor opens them.

## Components

| File | Responsibility |
| --- | --- |
| `../DoctorSchedulePage.tsx` | Load state, approval gate, filter and active panel |
| `ScheduleToolbar.tsx` | Hours, leave count and secondary actions |
| `WeeklyAgenda.tsx` | Seven readable day groups with mode filtering |
| `SchedulePanels.tsx` | Open one panel or confirmation at a time; restore focus |
| `LeaveDrawer.tsx` | List leave periods and expose add/remove actions |
| `EmergencyLeaveDialog.tsx` | Confirm a short emergency block |
| `RemoveLeaveDialog.tsx` | Confirm leave removal and display server failures |
| `scheduleView.model.ts` | Shared day names, panel types and Dhaka-time presets |
| `../components/WorkingHoursDialog/` | Add/edit form and reusable field group |
| `../components/TimeOffSection/AddTimeOffDialog.tsx` | All-day or partial leave form |
| `../components/DeleteRuleDialog/` | Confirm working-hours removal |

The existing `useDoctorSchedule` hook and `doctorsApi` own API requests,
overlap validation and schedule updates. The new UI modules stay below 150 lines
per file. Older calendar/header components are no longer used by this route.

## Existing API dependencies

- GET `/api/v1/doctors/me`
- GET / PUT `/api/v1/doctors/me/schedule` (PUT sends the complete rule list)
- POST `/api/v1/doctors/me/time-off`
- DELETE `/api/v1/doctors/me/time-off/:id`
- POST `/api/v1/doctors/me/slots/generate`

Only approved doctors with a loaded schedule see editing controls. Failed loads
show an error and retry; they do not show a falsely empty week. Failed saves
keep the form open with its values. Removing hours or leave requires confirmation.
Blocking availability does not cancel existing appointments.

Emergency periods use Dhaka time independently of the browser timezone. The
two-hour preset stops at 23:59 when midnight is nearer; tomorrow blocks the full
next Dhaka calendar day.

## Verification

```sh
npm test -- src/doctor/schedule
npm run test:e2e -- e2e/schedule-hours.spec.ts e2e/schedule-leave.spec.ts
npm run build
```

Browser checks replace all API traffic with synthetic responses. They do not
modify the application database or contact consultation/payment providers.
