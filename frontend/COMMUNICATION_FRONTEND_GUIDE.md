# Communication workspace — November 4, 2026

The production interface uses authenticated HTTP APIs. Synthetic messages and call rooms appear only in tests; the application never invents incoming replies, presence, delivery receipts or call availability.

## Who can communicate

| Workspace | Conversations | Access rule |
| --- | --- | --- |
| Patient | Consultations, Support | Own booked consultations; own assigned support thread |
| Doctor | Consultations, Colleagues, Support | Assigned consultations; active, approved doctors; own support thread |
| Admin | Support, Staff | Only support threads assigned to that admin and staff threads they belong to |

Admin status does **not** grant access to private clinical conversations or other admins' support threads. Patient-to-patient contact and arbitrary patient-to-doctor direct contact are unsupported. Existing clinical message windows remain enforced by the backend.

## Screens and controls

- `/doctor/communication`, `/patient/communication`, `/admin/communication` use their portal sidebar. `/communication` and `/messages` redirect by role.
- The main view contains conversation groups, search, a conversation list, message history and a composer.
- New conversation opens a dialog. Doctors choose an eligible colleague; admins choose a staff member. Support is assigned by the server. Opening the dialog does not create a thread.
- Conversation details opens a hidden side panel with appointment, family beneficiary, access window and recent call history.
- Doctor photographs use the same safe image resolver as the profile and public directory. Family beneficiaries remain visible in the chat and details panel.
- Messages load automatically every five seconds while the page is visible; the inbox updates every ten seconds. Refresh is also available. These are polling intervals, not guaranteed delivery times.
- History supports earlier pages. Sending displays only a server-confirmed message. Failed drafts remain editable, and unchanged retries reuse the same request key within the mounted thread.
- Permission failures remove protected content. Temporary failures display an error and preserve drafts; empty and unavailable states are separate.
- On mobile, selecting a conversation opens the chat; Back returns to the list and stops reading the hidden thread.

## Calls

- Voice and video calling use real backend call records, with ringing, accept, decline, cancel, busy, missed and ended states.
- Incoming calls are checked every three seconds throughout the signed-in application. The app must be open. There is no background push or offline ringing.
- The recipient must accept before either participant can request call-room credentials. Each participant then chooses Enter call.
- Voice tokens permit audio only; the voice iframe does not request camera or screen-sharing permission. Video permits the existing Daily media controls.
- The existing appointment Video consultation entry remains available when the server allows it. Clinical voice calls use the same appointment access rules.
- Calls require the backend's real Daily configuration. Buttons remain unavailable when it is missing; no mock call is presented as live.
- Ringing expires after 45 seconds. Accepted direct calls expire after 30 minutes; clinical calls also close at the appointment's end.
- End removes the local media frame and updates the other participant through polling. Existing provider-issued credentials expire at their original deadline; immediate provider-side token revocation/ejection is not implemented.
- Accepted is an application signaling state. It does not claim that the other person's microphone, camera or media connection is working.

Chat attachments remain unavailable. Medical reports and prescriptions retain their existing dedicated workflows.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/communication/CommunicationPage.tsx` | Role groups, selection and hidden panels |
| `api/communicationApi.ts`, `api/communicationValidation.ts` | HTTP dispatch and response validation |
| `hooks/useConversations.ts`, `hooks/useConversation.ts` | Polling, pagination, stale-request protection and sends |
| `components/ConversationList`, `ChatWindow`, `MessageHistory`, `MessageComposer` | Reusable messaging display and input |
| `components/NewConversationDialog.tsx`, `ConversationDetails.tsx`, `CommunicationHelp.tsx` | On-demand contacts, details and help |
| `calls/callApi.ts`, `useCallController.ts` | Call API and global signaling state |
| `calls/CallProvider.tsx`, `CallRoom.tsx` | Incoming/outgoing controls and authorized Daily frame |
| `src/admin/navigation/AdminSidebar/adminSidebar.config.ts` | Shared admin navigation configuration, now used by the actual sidebar |

New feature TS/TSX modules stay below 150 lines. Existing unrelated large files were preserved.

## Verification

- Full frontend unit suite: 203 tests passed.
- Synthetic browser tests cover all three roles, failed drafts, polling, family context, mobile layout, voice acceptance, incoming decline and missed calls.
- Existing doctor dashboard, schedule and profile browser tests are included in the regression run.
- The separate intercepted communication browser script covers clinical history, failed sends, expiry, permission revocation and video entry for doctor and patient.
- Builds include TypeScript checks. Browser media responses are intercepted: a real two-person Daily audio/video session remains to be tested manually.

See [API contract](COMMUNICATION_API_HANDOFF.md) and [backend implementation guide](../MediConnectBDbackend/src/modules/communication/README.md).
