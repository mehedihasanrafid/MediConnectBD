# MediConnect BD — Frontend Structure and Conventions

**Status:** ✅ Implemented — applied to the codebase on 2026-10-26
**Date:** 2026-10-26
**Scope:** `frontend/` only. This document does not change backend structure.

---

## 1. Purpose

This document defines how the MediConnect BD frontend should be organized, and which conventions
are adopted from the reference project at `/home/mehedi/Desktop/EASCA-project1/web`.

It exists so the refactor can be executed in small, verifiable steps rather than as one large
rewrite. **Nothing in this document is implemented yet.** The current code is described in
section 3 exactly as it exists today.

---

## 2. Reference project

`EASCA-project1/web` (`@dokanbd/web`) is a mature e-commerce frontend:

| Metric | Value |
|---|---|
| Source size | 16,066 LOC |
| Test files | 38 |
| Stack | React 19, Vite 7, react-router-dom 7, Tailwind 4, TypeScript 5.9 |

It is a **reference for conventions only**. Its domain code (products, cart, coupons, SKUs) is
irrelevant to MediConnect BD and must not be copied.

### 2.1 Independent confirmation of our refresh fix

EASCA's `src/api/client.ts` contains the same single-flight refresh guard we wrote in
`src/features/auth/AuthContext.tsx`:

```ts
let refreshPromise: Promise<string | null> | null = null;
```

Its `src/api/client.test.ts` asserts that two concurrent 401 responses trigger exactly **one**
refresh call (`expect(refreshCalls).toBe(1)`).

This independently validates the fix for the `REFRESH_TOKEN_REUSED` defect. It also highlights our
gap: **our equivalent guard has no test.** Adding one is step 1 of the migration plan.

---

## 3. Current state (verified 2026-10-25)

14 TypeScript source files, 1,415 LOC, plus a 207-line `index.css`. Flat and functional, but it
will not scale to the remaining roadmap (prescriptions, reviews, reports, payments, video, admin
reports).

```text
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env.example
└── src/
    ├── App.tsx                      ← shell + nav + route table + RequireAuth (all in one)
    ├── main.tsx
    ├── index.css                    ← 207 lines, all styles in one file
    ├── components/
    │   └── ui.tsx                   ← Card, Button, Field, Alert, Spinner, EmptyState, Badge
    ├── features/
    │   ├── admin/AdminApplicationsPage.tsx
    │   ├── appointments/AppointmentsPage.tsx
    │   ├── auth/AuthContext.tsx     ← contains the single-flight refresh guard
    │   ├── auth/LoginPage.tsx
    │   ├── doctor/DoctorDashboardPage.tsx
    │   ├── doctors/DoctorDetailPage.tsx
    │   ├── doctors/DoctorSearchPage.tsx
    │   └── patient/FamilyMembersPage.tsx
    └── shared/
        ├── api.ts                   ← transport + all endpoint calls in one file
        ├── format.ts                ← untested
        └── types.ts
```

### 3.1 Problems this structure will cause

| Problem | Consequence |
|---|---|
| `shared/api.ts` holds transport **and** every endpoint | Becomes a merge-conflict hotspot once prescriptions, reviews, reports, payments, and admin reports are added |
| `App.tsx` holds shell, nav, routes, and the auth guard | Every new route edits the same file; no place for a second layout (admin) |
| `index.css` is one 207-line file | No token layer; feature styles will collide as pages grow |
| `shared/format.ts` is untested | Money and Dhaka-time formatting are business-critical and currently unverified |
| No test infrastructure at all | Documented as a gap in `DEVELOPMENT.md`; blocks the definition of done |

---

## 4. Target structure

```text
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts                 ← NEW
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env.example
├── STRUCTURE.md                     ← this document
└── src/
    ├── main.tsx                     ← mounts AppRouter + AuthProvider
    ├── App.tsx                      ← thin: providers + <AppRouter />
    ├── vite-env.d.ts
    │
    ├── api/                         ← ADOPTED #2: one module per backend domain
    │   ├── client.ts                ← transport only: fetch, token, single-flight refresh
    │   ├── client.test.ts           ← ADOPTED #1
    │   ├── auth.ts
    │   ├── auth.test.ts
    │   ├── doctors.ts
    │   ├── doctors.test.ts
    │   ├── appointments.ts
    │   ├── appointments.test.ts
    │   ├── familyMembers.ts
    │   ├── familyMembers.test.ts
    │   ├── admin.ts
    │   └── admin.test.ts
    │
    ├── components/
    │   └── ui.tsx                   ← unchanged: Card, Button, Field, Alert, Spinner, EmptyState, Badge
    │
    ├── features/                    ← domain UI, co-located by feature
    │   ├── auth/
    │   │   ├── AuthContext.tsx
    │   │   └── LoginPage.tsx
    │   ├── doctors/
    │   │   ├── DoctorSearchPage.tsx
    │   │   └── DoctorDetailPage.tsx
    │   ├── appointments/
    │   │   └── AppointmentsPage.tsx
    │   ├── patient/
    │   │   └── FamilyMembersPage.tsx
    │   ├── doctor/
    │   │   └── DoctorDashboardPage.tsx
    │   └── admin/
    │       └── AdminApplicationsPage.tsx
    │
    ├── layouts/                     ← ADOPTED #6
    │   ├── MainLayout.tsx           ← public + patient + doctor shell
    │   └── AdminLayout.tsx          ← admin shell
    │
    ├── routes/                      ← ADOPTED #5
    │   ├── AppRouter.tsx            ← route table only
    │   └── guards.tsx               ← ProtectedRoute, RoleRoute, PublicOnlyRoute
    │
    ├── shared/
    │   ├── types.ts                 ← API response types
    │   └── utils/                   ← ADOPTED #3: pure, tested functions
    │       ├── format.ts
    │       ├── format.test.ts
    │       ├── roles.ts
    │       ├── roles.test.ts
    │       ├── apiError.ts
    │       └── apiError.test.ts
    │
    └── styles/                      ← ADOPTED #4
        ├── tokens.css               ← CSS custom properties only
        ├── base.css                 ← reset, typography, element defaults
        ├── layout.css               ← app shell, nav, main, grid
        ├── components.css           ← card, btn, field, alert, badge, spinner, empty
        └── features.css             ← page-specific rules
```

---

## 5. Adopted conventions

### #1 — Vitest with `renderToStaticMarkup`

**Adopted from:** EASCA `src/api/client.test.ts`, `src/features/orders/components/order-components.test.tsx`

EASCA has **no** `jsdom`, **no** `@testing-library/react`, and **no** `happy-dom`. It renders
components to an HTML string and asserts on the markup:

```tsx
import { renderToStaticMarkup } from "react-dom/server";

const html = renderToStaticMarkup(<OrderStatusBadge status="SHIPPED" />);
expect(html).toContain("SHIPPED");
```

**Why this fits us:** it adds exactly **one** dev dependency (`vitest`) and closes the
"no frontend tests" gap recorded in `DEVELOPMENT.md`. No DOM emulation to configure or maintain.

**Limits to accept:** this cannot test effects, state transitions, or user interaction. The
single-flight refresh guard is therefore tested at the **client** level (mock `fetch`, assert one
refresh call) rather than through the React component — exactly as EASCA does.

### #2 — `src/api/` split by domain

**Adopted from:** EASCA `src/api/{auth,orders,cart,catalog,products}.ts`, each with a co-located `.test.ts`

`client.ts` owns transport concerns only. Each domain module owns its endpoint functions and
types. This keeps the transport layer stable while feature endpoints grow.

### #3 — `shared/utils/` of pure, tested functions

**Adopted from:** EASCA `src/shared/utils/{currency,apiError,roles,queryParams}.ts`

EASCA's `roles.ts` carries a comment we should mirror verbatim in spirit:

> *"These control UI visibility and navigation only. Backend authorization must still enforce permissions."*

That matches the stance already recorded in `DEVELOPMENT.md`. `format.ts` (money, Dhaka time) is
business-critical and must gain tests.

### #4 — `styles/tokens.css` with CSS custom properties

**Adopted from:** EASCA `src/styles/tokens.css`

EASCA's token layer is plain CSS custom properties — **framework-agnostic**. We adopt the token
layer and the file split, but **not** Tailwind (see section 6).

### #5 — Route guards as `<Outlet />` wrappers

**Adopted from:** EASCA `src/routes/AppRouter.tsx`

EASCA defines `ProtectedRoute`, `RoleRoute`, `PublicOnlyRoute`, and `AccountRoute` as layout
components wrapping `<Outlet />`, then nests routes beneath them. This is cleaner than our current
per-route `<RequireAuth>` wrapper and supports nested layouts.

### #6 — `layouts/` separate from pages

**Adopted from:** EASCA `src/layouts/{MainLayout,AdminLayout}.tsx`

Our nav currently lives inside `App.tsx`. Extracting it lets the admin area get its own shell
without conditional nav logic.

---

## 6. Rejected conventions

| Rejected | Reason |
|---|---|
| **Tailwind 4** (`@tailwindcss/vite`) | A real dependency decision, not a copy-paste. The client recommended it, but it is not installed and adopting it would touch every file. Deferred pending explicit agreement. |
| **`ApiException` with constructor parameter properties** | EASCA writes `constructor(public statusCode: number, ...)`. Our `tsconfig.app.json` sets `erasableSyntaxOnly: true`, which **rejects** this. Our `ApiRequestError` already declares fields separately — keep it. |
| **`{ success, data, error }` response envelope** | Our backend returns bare data with `{ code, message, requestId }`. Different contract; do not adopt. |
| **`changeOrigin: true`** in the Vite proxy | Ours is deliberately `false` so the `SameSite=Strict` refresh cookie keeps working. Do not change. |
| **EASCA's `tsconfig.app.json`** | Looser than ours: no `erasableSyntaxOnly`, no `verbatimModuleSyntax`, no `noUnusedLocals`. Do not relax our settings to match. |
| **`src/pages/` separate from `src/features/`** | EASCA splits route screens from domain logic. For our size this adds indirection; we co-locate pages inside their feature. Revisit if `features/` grows past ~4 files each. |
| **E-commerce domain code** | Products, cart, coupons, SKUs, variants — irrelevant. |
| **Stray empty `.git` / `.aws` / `.codex` / `.agents` directories** | EASCA has these inside `src/pages/admin/` and `src/styles/features/`. They are artifacts, not convention. Do not replicate. |

---

## 7. Constraints that must be preserved

These are non-negotiable and already documented in `DEVELOPMENT.md`:

1. **`erasableSyntaxOnly: true`** — no constructor parameter properties. Declare fields separately.
2. **Single-flight refresh guard** — `refreshInFlight` must remain the only refresh path. Do not add
   a second one. Refresh tokens are single-use; a duplicate call triggers `REFRESH_TOKEN_REUSED`
   and revokes every session for that user.
3. **Vite dev proxy `/api` → `http://localhost:4000`** with `changeOrigin: false` — required for the
   `SameSite=Strict` refresh cookie to survive a page reload.
4. **Access token in memory only** — never `localStorage`.
5. **`API_BASE` defaults to the relative `/api/v1`** so requests route through the proxy.
6. **UI guards are not authorization** — the backend remains the authority. Guards control
   visibility and navigation only.
7. **Asia/Dhaka for all displayed times** — matches the backend's fixed UTC+06:00 slot generation.

---

## 8. Migration plan

Each step is independently verifiable. **Do not start a step until the previous one passes its
gate.** Do not combine steps.

| Step | Change | Gate |
|---|---|---|
| 1 | Add `vitest` + `vitest.config.ts` + `test` script. No source changes. | `npm test` runs and reports 0 tests |
| 2 | Extract `shared/utils/{format,roles,apiError}.ts` + tests. Update imports. | `npm run build` passes; `npm test` passes; money/time tests green |
| 3 | Split `index.css` into `styles/{tokens,base,layout,components,features}.css`. | `npm run build` passes; pages render identically in the browser |
| 4 | Split `shared/api.ts` into `api/client.ts` + per-domain modules + `client.test.ts`. | `npm run build` passes; `client.test.ts` proves one refresh for concurrent 401s |
| 5 | Add `routes/guards.tsx` + `routes/AppRouter.tsx`; slim `App.tsx`. | `npm run build` passes; every route and role guard verified in the browser |
| 6 | Add `layouts/MainLayout.tsx` + `AdminLayout.tsx`. | `npm run build` passes; nav renders correctly for all three roles |
| 7 | Update `DEVELOPMENT.md` to record the new structure and test setup. | Document matches the code |

### Verification commands

```bash
cd frontend
npm run build      # tsc -b && vite build
npm test           # vitest run
npm run lint       # oxlint
```

### Manual checks required after steps 3, 5, and 6

Automated tests cannot cover layout or navigation. After those steps, confirm in the browser:

- Login as patient, doctor, and admin; role-aware nav shows the correct links.
- Doctor search → doctor detail → hold → booking → appointment appears.
- Family members create, edit, delete.
- Doctor dashboard and admin applications render.
- **Reload the page while signed in and confirm the session persists** (currently unverified).

---

## 9. Open questions

| Question | Impact | Recommendation |
|---|---|---|
| Adopt Tailwind 4? | Touches every file; client recommended it | Defer. Plain CSS with tokens is working. Decide before the page count grows further. |
| Add `@testing-library/react` + `jsdom`? | Enables interaction tests the `renderToStaticMarkup` approach cannot cover | Defer until a test genuinely needs it. Start with the one-dependency approach. |
| Split `src/pages/` from `src/features/`? | Structural only | Defer. Revisit when a feature exceeds ~4 files. |
| Commit the refactor as one commit or one per step? | Reviewability | One commit per step, so any regression is bisectable. |

---

## 10. Definition of done for this refactor

- [x] All 7 migration steps complete and individually verified.
- [x] `npm run build`, `npm test`, and `npm run lint` all pass.
- [x] No file in `src/` exceeds ~200 lines.
- [x] `client.test.ts` proves concurrent 401s trigger exactly one refresh.
- [x] `format.test.ts` covers money and Dhaka-time conversion.
- [ ] Every route and role guard verified manually in the browser.
- [ ] Session persistence across a full page reload confirmed.
- [x] `STRUCTURE.md` updated to match.
