# Doctor verification and public directory

This milestone implements the backend flow for doctor profile completion, manual admin
verification, and public discovery. Only active users with an `APPROVED` doctor
application are returned by public endpoints.

## Demo users

After running the seed command with `SEED_DEMO_PASSWORD` configured, use:

- `doctor.demo@mediconnect.example` for doctor endpoints.
- `admin.demo@mediconnect.example` for admin endpoints.

Use the private local password from `.env`. Never add that password to source control.

## Public catalogs

```http
GET /api/v1/catalog/specialties
GET /api/v1/catalog/hospitals
```

These endpoints return active specialties and hospitals for search and profile forms.

## Doctor profile and submission

All three endpoints require a doctor bearer token:

```http
GET /api/v1/doctors/me
PATCH /api/v1/doctors/me
POST /api/v1/doctors/me/submit
```

Example profile update:

```json
{
  "degrees": "MBBS, FCPS",
  "experienceYears": 8,
  "bio": "Synthetic profile for development and demonstration.",
  "languages": ["Bangla", "English"],
  "videoConsultationFee": 800,
  "specialtyIds": ["specialty-uuid"],
  "chambers": [
    {
      "hospitalId": "hospital-uuid",
      "roomOrUnit": "Room 4",
      "consultationFee": 600
    }
  ]
}
```

Submission requires degrees, at least one active specialty, and either a video fee or
an active chamber. A pending profile cannot be edited. Editing an approved profile
returns it to `DRAFT`, so the doctor must submit it for verification again.

## Admin verification

These endpoints require an admin bearer token:

```http
GET /api/v1/admin/doctors/applications?status=PENDING_REVIEW&page=1&limit=20
PATCH /api/v1/admin/doctors/{doctorId}/application
```

Approval body:

```json
{
  "decision": "APPROVED"
}
```

Rejection body:

```json
{
  "decision": "REJECTED",
  "reason": "The submitted professional information could not be verified."
}
```

Only a `PENDING_REVIEW` application can be approved or rejected. The API records the
admin identity and review time.

## Public doctor search

```http
GET /api/v1/doctors
GET /api/v1/doctors/{doctorId}
```

Supported search parameters:

| Parameter | Meaning |
|---|---|
| `search` | Doctor name or degree text |
| `specialty` | Specialty UUID or slug |
| `hospital` | Hospital UUID or slug |
| `area` | Exact hospital area, case-insensitive |
| `minFee` | Lowest accepted consultation fee |
| `maxFee` | Highest accepted consultation fee |
| `page` | Page number, default `1` |
| `limit` | Results per page, default `12`, maximum `50` |

Example:

```http
GET /api/v1/doctors?specialty=medicine&area=Dhanmondi&maxFee=800&page=1
```

Public responses intentionally exclude email addresses, BMDC numbers, rejection
reasons, and reviewer information.
