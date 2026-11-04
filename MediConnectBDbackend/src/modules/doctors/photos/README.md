# Doctor profile photos

This feature reuses the existing `doctor_profiles.photo_url` field. No migration
is required. It does not store medical reports or change profile approval rules.

## API

- POST `/api/v1/doctors/me/photo`: Bearer authentication and DOCTOR role required.
  Derives the profile from the authenticated account; freezes pending applications.
  Accepts JSON `{ mimeType, contentBase64 }`, without a data URL prefix.
- Returns HTTP 201 `{ photoUrl: "/api/v1/doctors/photos/<uuid>" }`.
- GET that path serves a public WebP image with nosniff and cross-origin image
  support. IDs are validated before filesystem access.
- PATCH `/api/v1/doctors/me` with the returned path attaches the photo using the
  existing approval/review flow. Explicit `photoUrl: null` detaches it.

Uploads are intended as public profile assets. A stored asset can be read by its
random URL even before it is attached. Detaching a photo does not erase retained
asset files or copies already cached by viewers. Unreferenced-file retention and
cleanup should be managed as a storage maintenance task.

## Validation and storage

- JPG, PNG and WebP only; at most 2 MB decoded bytes and 20 million pixels.
- Validate decoded format against MIME type; reject animated/malformed content.
- Sharp decodes, auto-orients and crops to a 512 × 512 WebP without source metadata.
- Generated UUID filenames, exclusive writes and restricted filesystem permissions.
- Upload rate limit: 10 requests per minute per client IP.
- Default directory: `MediConnectBDbackend/.local/doctor-photos`.
- Override with `DOCTOR_PHOTO_DIRECTORY` to use a persistent mounted directory.

The demo Docker image creates `/app/.local/doctor-photos` for its non-root user
and declares a volume there. Give that path a named/persistent volume when
deploying; an ephemeral deployment filesystem will lose uploaded photos.
Use shared storage before running multiple API replicas.

The existing runtime dependency audit reports four advisories: body-parser
(high), glob, minimatch and TypeORM (moderate). Review those before a public
deployment. Sharp is not listed in that audit result.

## Verification

```sh
npm test -- tests/doctor-photo.test.ts tests/openapi.test.ts
npm run build
```

Tests use temporary directories and mocked accounts. No application database,
real patient data or external storage account is required.
