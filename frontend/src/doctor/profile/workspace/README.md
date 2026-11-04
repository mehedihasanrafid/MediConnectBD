# Profile & Chambers workspace

Route: `/doctor/profile`.

The main page shows a compact profile summary and chamber list. The profile
editor, chamber editor, photo cropper and patient preview open on demand.
There is no permanent preview column or floating bar covering the form.

## Editing flow

1. Open an editor. Cancel keeps the existing draft.
2. Apply changes to the local draft; no profile request is sent yet.
3. One Save changes bar appears when the draft differs from the saved profile.
4. Approved doctors confirm that saving returns the profile to Draft.
5. Upload a staged photo, if any, then PATCH only changed profile fields.
6. Keep the draft on failure. A successful photo upload is reused if PATCH fails.
7. Update the overview, header and sidebar from the saved response.
8. Submit a saved, complete draft for review explicitly.

Chamber additions, edits and removals follow this same save flow. Removing a
chamber and discarding all changes each require confirmation. Pending-review
profiles are read-only. A browser refresh warns when a draft has unsaved changes.
Drafts remain in memory; navigating away can discard them.

## Modules

| Module | Responsibility |
| --- | --- |
| `../DoctorProfilePage.tsx` | Loading, load failure and workspace entry |
| `../hooks/useProfileResource.ts` | Profile load and on-demand catalogs |
| `../hooks/useDoctorProfile.ts` | Draft state, dirty state and auth synchronization |
| `../hooks/useProfileSave.ts` | Save, retry, upload and review submission |
| `profileDraft.ts` | Normalization, validation and minimal patches |
| `ProfileWorkspace.tsx` | Overview composition and active panel |
| `ProfileSummary.tsx` / `ChambersCard.tsx` | Concise, readable summaries |
| `ProfilePanels.tsx` | Panel transitions and confirmations |
| `ProfileEditor.tsx` / `SpecialtyPicker.tsx` | Professional details and specialties |
| `../components/ChambersManager/ChamberDialog.tsx` | Stable chamber inputs |
| `photo/PhotoDialog.tsx` / `photo/photoCrop.ts` | Selection, preview, zoom and crop |
| `ProfilePreviewDrawer.tsx` | Preview of current edits |

All handwritten TS/TSX modules in this profile feature are under 150 lines.
The old full-page editor sections and their styles have been removed.

## Photos

Accept JPG, PNG or WebP up to 2 MB. The browser crops to 512px. The server also
decodes, checks and re-encodes the image without metadata. The shared Avatar
component handles API-hosted images and initials on missing/broken images.

The saved photo is connected to the profile overview and preview, doctor header
and sidebar, public doctor cards/profile, and consultation conversation avatars.
Header/sidebar session restoration receives the photo from the authentication API.

## API dependencies

- GET / PATCH `/api/v1/doctors/me`
- POST `/api/v1/doctors/me/submit`
- GET `/api/v1/catalog/hospitals` and `/api/v1/catalog/specialties`
- POST `/api/v1/doctors/me/photo` with `{ mimeType, contentBase64 }`
- GET `/api/v1/doctors/photos/:photoId`

The upload returns `{ photoUrl }`; PATCH attaches that path or removes the
association with `photoUrl: null`. Existing approval rules apply to photo changes.
For deployment, mount persistent backend photo storage; see the backend photo guide.

## Checks

```sh
npm test
npm run test:e2e -- e2e/profile-workspace.spec.ts e2e/profile-photo.spec.ts
npm run build
```

These browser tests intercept every API request and use synthetic accounts and
images. They do not change the application database or contact external providers.
