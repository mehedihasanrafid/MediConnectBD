# Authentication API

Authentication uses short-lived bearer access tokens and rotating opaque refresh tokens.

- Access tokens expire after 15 minutes by default and are returned in the JSON response.
- Refresh tokens are random values stored only in an `HttpOnly`, `SameSite=Strict` cookie.
- MySQL stores only a SHA-256 hash of each refresh token.
- Every refresh rotates the token and revokes the previous session record.
- Reuse of an already rotated token revokes the user's remaining active refresh sessions.
- The API reloads the user for every authenticated request, so suspension takes effect immediately.
- Public doctor registration creates a draft doctor application; it does not approve the doctor to work.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/patient/register` | Create an active patient account and profile |
| `POST` | `/api/v1/auth/doctor/register` | Create a doctor account with a draft BMDC application |
| `POST` | `/api/v1/auth/login` | Validate credentials and create a refresh session |
| `POST` | `/api/v1/auth/refresh` | Rotate the refresh cookie and return a new access token |
| `POST` | `/api/v1/auth/logout` | Revoke the current refresh session and clear its cookie |
| `GET` | `/api/v1/me` | Return the authenticated account and role/profile state |

## Patient registration example

```json
{
  "email": "patient@example.com",
  "password": "A-Strong-Password-123",
  "firstName": "Demo",
  "lastName": "Patient",
  "phone": "+8801000000000"
}
```

## Doctor registration example

```json
{
  "email": "doctor@example.com",
  "password": "A-Strong-Password-123",
  "firstName": "Demo",
  "lastName": "Doctor",
  "bmdcNumber": "DEMO-123"
}
```

Successful register/login/refresh responses contain:

```json
{
  "accessToken": "short-lived-jwt",
  "accessTokenExpiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "opaque-user-id",
    "email": "patient@example.com",
    "firstName": "Demo",
    "lastName": "Patient",
    "status": "ACTIVE",
    "roles": ["PATIENT"],
    "patientProfileId": "opaque-profile-id",
    "doctorProfile": null
  }
}
```

Send the access token on protected requests:

```http
Authorization: Bearer <accessToken>
```

The browser must include credentials when calling refresh or logout so the refresh cookie is sent. Never store the refresh token in JavaScript-accessible storage.

## Error behavior

| Code | Meaning |
| --- | --- |
| `VALIDATION_FAILED` | Request fields failed schema/password validation |
| `EMAIL_ALREADY_REGISTERED` | Email already belongs to an account |
| `REGISTRATION_CONFLICT` | Email or BMDC number conflicts during the transaction |
| `INVALID_CREDENTIALS` | Generic login failure; does not reveal which field matched |
| `ACCOUNT_SUSPENDED` | Account was suspended; login and authenticated access denied |
| `INVALID_ACCESS_TOKEN` | Bearer token is invalid or expired |
| `INVALID_REFRESH_TOKEN` | Refresh session is missing, expired, blocked, or invalid |
| `REFRESH_TOKEN_REUSED` | A rotated/revoked token was presented again |
| `ROLE_FORBIDDEN` | Authenticated account lacks the required role |

## Next security work

- Add Redis-backed rate limits for registration, login, refresh, and password reset.
- Add email verification and password-reset flows.
- Add session listing and revoke-other-session endpoints.
- Add audit events for login, refresh-token reuse, suspension, and admin actions.
- Configure the production proxy trust policy and verify secure-cookie behavior under HTTPS.
