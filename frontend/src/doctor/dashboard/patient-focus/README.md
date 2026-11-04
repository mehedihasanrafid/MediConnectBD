# Patient-focused doctor dashboard

The default `/doctor` view contains small daily counts, one focused patient card and the remaining
patient queue. Earnings, schedule, profile and general management remain on their existing routes.
Legacy dashboard tab URLs redirect to those destinations.

## Files

- `usePatientDashboard.ts`: profile/approval and assigned appointments only; errors remain visible.
- `patientFocus.model.ts`: Dhaka-day selection, family identity, age and local video-window hints.
- `FocusedPatientCard.tsx`, `PatientDetails.tsx`, `PatientQueue.tsx`: patient-facing dashboard layout.
- `PatientReadiness.tsx`: neutral unknown readiness; never infers online state from confirmation.
- `DashboardPanels.tsx`: on-demand dialogs, focus management and one active panel at a time.
- `PatientRecordsPanel.tsx`: existing authenticated history workflow, fetched only on opening.
- `PatientToolsPanel.tsx`: appointment-specific tools and links.
- `AppointmentActionPanel.tsx`: explicit completion/cancellation/no-show confirmation and HTTP errors.

All new handwritten TS/TSX modules are under 150 lines. Existing history, prescription and video
components are reused. No migration, seed or backend change is included.

## Behavior and dependencies

- Queue selection updates the large card and opens the selected patient's details.
- Opening a record, tool or readiness panel never changes appointment status.
- Video entry uses the existing appointment authorization API; the local window is only a UI hint.
- Closing video does not complete the appointment. The active modal blocks background selection.
- Small readiness icons show **unknown** because the backend currently provides no check-in/presence
  contract. Green waiting/ready indicators require a real, authorized backend signal with freshness
  and disconnect handling. There are no synthetic readiness values in the runtime interface.
- History is not loaded for a family beneficiary: the current endpoint is scoped to the booking
  owner's patient profile and cannot establish separate beneficiary records.
- Message links include appointment ID; Communication selects only a matching authorized thread.
- Appointment list failures produce a retry alert, not a false zero/empty queue.
- Schedule/earnings/catalog/prescription lists are not requested at dashboard startup.

## Verification

`npm test -- --run src/doctor/dashboard/patient-focus/tests`

`npm run test:e2e -- e2e/patient-dashboard.spec.ts`

Browser tests intercept every API request with synthetic fixtures. They do not modify a database
or call video/payment providers. They cover selection, family privacy, lazy history, neutral
readiness, video failure, explicit completion, message deep links, loading errors and mobile panels.
