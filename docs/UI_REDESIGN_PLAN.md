# MediConnect BD — UI Redesign & CSS Architecture Plan

> **Audience:** an AI coding agent (or developer) that will edit the code.
> **Scope:** `frontend/` only. **Do not touch `MediConnectBDbackend/`.**
> **Goal:** replace the mixed styling (global CSS + CSS Modules + unused Tailwind) with a clean
> **"one CSS Module per component + design tokens"** system, add a shared UI kit, dark mode, and
> then redesign the key pages.

---

## 0. Instructions for the AI agent (READ FIRST)

Follow these rules for **every** step:

1. **Do one step at a time**, in order. Do not jump ahead. Each step lists *Files*, *Actions*, and *Done when*.
2. **After every step run the verification commands** (section 0.1). If anything fails, fix it before moving on.
3. **Commit after each successful step**: `git commit -m "ui(step X.Y): <short description>"`.
4. **Never change behaviour.** Do not edit hooks (`hooks/*.ts`), API files (`src/api/*`), types, utils logic, routes paths, or `AuthContext` logic, unless a step explicitly says so.
5. **Never change visible text** (headings, button labels, messages). The Playwright e2e tests (`frontend/e2e/critical-journeys.spec.ts`) look for exact text such as `"Sign in to book appointments"`, `"My prescriptions"`, `"Download PDF"`, `"Verified"`, `"Patient history & reports"`, `"My medical reports"`.
6. **Keep accessibility attributes** (`aria-*`, `role`, `htmlFor`, `data-testid`) and keep form `name`/`type`/`autoComplete` attributes.
7. **Do not reorganise feature folders** (`admin/`, `doctor/`, `patient/`, `public/`, `features/`) in this plan. Only add `src/shared/ui/`, `src/shared/theme/`, and new style files.
8. **CSS rules** (section 4) are mandatory: no raw hex colours outside `tokens.css`, no `:global(...)`, no new global classes, no `style={{...}}` except to set CSS custom properties.
9. If a step is unclear, **stop and ask** rather than guessing.

### 0.1 Verification commands (run from repo root)

```bash
npm --prefix frontend run build      # TypeScript + Vite build must pass
npm --prefix frontend test           # Vitest unit tests must pass
npm --prefix frontend run lint       # oxlint must pass (warnings OK, no errors)
npm --prefix frontend run lint:css   # stylelint (exists after Step 1.6)
```

Manual check: `npm --prefix frontend run dev` and open `http://localhost:5173`. Check the changed pages at **360px, 768px, 1280px** widths, in light **and** dark mode (after Phase 5).

---

## 1. Fixed design decisions

| Topic | Decision |
|---|---|
| Styling method | **CSS Modules** (`Component.module.css`) next to each component + global **design tokens** |
| Global CSS | Only `tokens.css`, `reset.css`, `base.css` (typography). **No global component classes.** |
| Tailwind | **Remove.** It is installed but **no TSX file uses Tailwind utility classes** (verified). |
| Class composition | `clsx` |
| Variants | `data-*` attributes (`data-variant="primary"`, `data-size="sm"`, `data-tone="success"`) |
| Headless components | `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs` (only these three) |
| Icons | `lucide-react` (already installed) |
| Fonts | `@fontsource-variable/inter` + `@fontsource/hind-siliguri` (Bangla), self-hosted through npm |
| Theme | **"Clinical Teal"**: primary `#0D7A6F`, accent amber `#F59E0B`. Light + **dark mode** |
| Breakpoints (mobile-first) | `480px` (sm), `768px` (md), `1024px` (lg), `1280px` (xl). Always `@media (min-width: …)` |

> To switch to another palette later (Trust Blue, Mint+Navy, Bangladesh Green), edit **only the primitive + semantic sections of `tokens.css`**. No component should change.

---

## 2. Current state (audit, so you know what to fix)

Numbers are from an audit of `frontend/src` on 2026-10-28.

### 2.1 Styling systems in use

| System | Files | Problem |
|---|---|---|
| Global legacy CSS | `styles/base.css`, `layout.css`, `components.css` (208 lines), `features.css`, `skeleton.css` | Global names (`.btn`, `.card`, `.row`, `.muted`) can collide and are hard to delete safely |
| CSS Modules | ~40 `*.module.css` files | Good, but they still mix in global classes and contain **~100 raw hex colours** |
| Tailwind v4 | `styles/tailwind.css`, `vite.config.ts`, `package.json` | Loaded without Preflight; **zero utility classes used**, so it's dead weight |
| Inline styles | **59** `style={{}}` across 19 files | Can't use themes or media queries |

### 2.2 Most-used global classes (must be replaced by components)

| Global class | Uses | Replace with (Phase 2 component) |
|---|---|---|
| `muted` | 57 | `<Text tone="muted">` |
| `small` | 46 | `<Text size="sm">` |
| `row` (+ `space-between` 13) | 29 | `<Cluster>` / `<Cluster justify="between">` |
| `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-icon` | ~36 | `<Button variant=…>` / `<IconButton>` / `<ButtonLink>` |
| `eyebrow` | 16 | `<PageHeader eyebrow=…>` or `<Eyebrow>` |
| `table` | 14 | `<Table>` |
| `field` | 11 | `<FormField>` + `<Input>`/`<Select>`/`<Textarea>` |
| `page`, `page-header` | 9 / 7 | `<Page>` + `<PageHeader>` |
| `filters` | 9 | `<Cluster wrap align="end">` or the new `<FilterBar>` |
| `facts` | 7 | `<DescriptionList>` |
| `grid` | 2 | `<Grid min="280px">` |
| `stack` | 2 | `<Stack>` |
| `auth-shell`, `auth-card`, `demo-accounts`, `demo-buttons` | 7 | `AuthLayout` module (Step 4.1) |
| `slot`, `slot-grid`, `hold-banner`, `avatar`, `doctor-card` | 5 | component modules / `<Avatar>` |
| `app`, `main` | 3 | `MainLayout.module.css` / `AdminLayout.module.css` |

### 2.3 Shared components today

`src/components/ui.tsx` (one 226-line file) exports `Card`, `Button`, `Field`, `Alert`, `Spinner`, `EmptyState`, `Badge`, `ToastProvider`, `useToast`, imported by **48 files**. Usage: Button 31, Card 31, Alert 27, Badge 22, EmptyState 21, Field 18, Spinner 17.

Known issues:
- `Button` doesn't accept `className`, `aria-*`, icons, or sizes.
- `Badge` accepts any string `tone`; `appointmentStatusTone` is **duplicated** in `doctor/appointments/utils/statusTone.ts` and `patient/appointments/utils/patientAppointments.utils.ts`.
- `Spinner` is just text and has no `role="status"`.
- `Toast.test.tsx` asserts on raw class names (`class="toast toast-success"`), so it will break with CSS Modules and must be updated to use `data-testid`.

### 2.4 Other UI problems

- `/` just redirects to `/doctors`; there is no landing page. Unknown URLs redirect silently (no 404 page).
- Only ~10 media queries, using 6 different breakpoints (600/640/760/860/900/1024).
- No dark mode, no Bangla font, no consistent spacing or type scale.
- Font in `base.css` (`system-ui`) differs from `tokens.css` (`Inter`).

---

## 3. Target structure

```text
frontend/src/
├── styles/
│   ├── index.css          ← the ONLY global CSS entry (imports below, in @layer order)
│   ├── tokens.css         ← primitives + semantic tokens + dark theme
│   ├── reset.css          ← modern CSS reset
│   ├── base.css           ← element typography (h1–h6, p, a, focus ring)
│   └── legacy/            ← TEMPORARY: old files moved here, deleted in Phase 7
│       ├── layout.css  components.css  features.css  skeleton.css
├── shared/
│   ├── theme/
│   │   ├── ThemeProvider.tsx
│   │   └── ThemeToggle/ { ThemeToggle.tsx, ThemeToggle.module.css }
│   └── ui/
│       ├── index.ts       ← barrel: export everything below
│       ├── Button/        { Button.tsx, Button.module.css, index.ts }
│       ├── IconButton/
│       ├── Card/
│       ├── Badge/
│       ├── Alert/
│       ├── Spinner/
│       ├── Skeleton/
│       ├── EmptyState/
│       ├── Form/          { FormField.tsx, Input.tsx, Select.tsx, Textarea.tsx, Field.tsx, Form.module.css }
│       ├── Text/          { Text.tsx, Eyebrow.tsx, Text.module.css }
│       ├── Layout/        { Stack.tsx, Cluster.tsx, Grid.tsx, Container.tsx, Layout.module.css }
│       ├── Page/          { Page.tsx, PageHeader.tsx, Page.module.css }
│       ├── DescriptionList/
│       ├── Table/
│       ├── Avatar/
│       ├── Dialog/        (Radix)
│       ├── Tabs/          (Radix)
│       ├── DropdownMenu/  (Radix)
│       └── Toast/         { ToastProvider.tsx, Toast.module.css }
└── components/ui.tsx      ← TEMPORARY re-export of shared/ui (keeps 48 imports working). Deleted in Phase 7.
```

---

## 4. CSS rules (mandatory for every file you touch)

1. **One module per component.** `Foo.tsx` → `Foo.module.css` in the same folder. Import as `import styles from "./Foo.module.css";`.
2. **Class names in camelCase** inside modules: `.root`, `.header`, `.title`, `.actions`, `.isActive`. The outer element is always `.root`.
3. **Only tokens for design values**: colours `var(--color-*)`, spacing `var(--space-*)`, radius `var(--radius-*)`, font size `var(--text-*)`, shadows `var(--shadow-*)`, z-index `var(--z-*)`. Raw values are allowed only for layout math (`1fr`, `100%`, `minmax(...)`, `0`, borders `1px`).
4. **No hex/rgb/hsl colours** outside `styles/tokens.css`.
5. **No `:global(...)`** and **no global class names** in TSX (`className="muted"` is forbidden after migration).
6. **Variants via data attributes**: `.root[data-variant="danger"] { … }`.
7. **No inline `style`**, except to pass a CSS variable: `style={{ "--grid-min": min } as CSSProperties}`.
8. **Mobile-first media queries** with the 4 breakpoints only: `@media (min-width: 768px) { … }`.
9. **Don't create a module under ~5 lines.** Use layout primitives (`Stack`, `Cluster`, `Grid`) instead.
10. **Focus states**: interactive elements use `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }`.
11. **Motion**: wrap non-essential animation in `@media (prefers-reduced-motion: no-preference)`.

---

## PHASE 0 — Preparation

### Step 0.1 — Clean working tree and branch

**Actions**
1. Run `git status`. If there are uncommitted changes, **ask the user** whether to commit or stash them. Do not discard anything.
2. Create a branch: `git checkout -b feat/ui-redesign`.

**Done when** `git status` is clean and you are on `feat/ui-redesign`.

### Step 0.2 — Baseline

**Actions**: run all commands from 0.1 (except `lint:css`) and record the results in the commit message or a note. Any test that already fails must be noted as *pre-existing*.

---

## PHASE 1 — Foundation (tokens, reset, remove Tailwind, stylelint)

### Step 1.1 — Install dependencies

```bash
cd frontend
npm install clsx @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs \
  @fontsource-variable/inter @fontsource/hind-siliguri
npm install -D stylelint stylelint-config-standard stylelint-config-css-modules
npm uninstall tailwindcss @tailwindcss/vite
```

**Done when** `package.json` has the new deps and no Tailwind packages.

### Step 1.2 — Remove Tailwind from Vite

**File:** `frontend/vite.config.ts`
- Delete `import tailwindcss from "@tailwindcss/vite";`.
- Change `plugins: [react(), tailwindcss()]` → `plugins: [react()]`.
- Update the file's header comment: remove "Includes @tailwindcss/vite matching DokanBD".
- Add CSS-module naming so class names are readable in dev:

```ts
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
      generateScopedName: process.env.NODE_ENV === "production"
        ? "[hash:base64:6]"
        : "[name]__[local]__[hash:base64:4]",
    },
  },
  server: { /* keep existing proxy config unchanged */ },
});
```

### Step 1.3 — Create `styles/tokens.css` (replace the file completely)

**File:** `frontend/src/styles/tokens.css`

```css
/*
 * Design tokens for MediConnect BD — "Clinical Teal" theme.
 * Level 1 = primitives (raw palette, never used in components).
 * Level 2 = semantic tokens (what components use).
 * Level 3 = dark theme overrides (only semantic tokens change).
 * This is the ONLY file allowed to contain raw colour values.
 */

:root {
  /* ---------- 1. PRIMITIVES ---------- */
  --teal-50: #effaf8;
  --teal-100: #d5f2ee;
  --teal-200: #aee5dd;
  --teal-300: #7dd1c6;
  --teal-400: #3fb5a7;
  --teal-500: #14a394;
  --teal-600: #0d7a6f;
  --teal-700: #0a5f57;
  --teal-800: #094b45;
  --teal-900: #083b36;

  --slate-0: #ffffff;
  --slate-25: #fafcfc;
  --slate-50: #f4f7f7;
  --slate-100: #eaf0ef;
  --slate-200: #dce6e5;
  --slate-300: #c3d1cf;
  --slate-400: #8fa3a0;
  --slate-500: #6b7f7c;
  --slate-600: #546663;
  --slate-700: #3b4b49;
  --slate-800: #243331;
  --slate-900: #152220;

  --amber-50: #fff8e6;
  --amber-500: #f59e0b;
  --amber-600: #d97706;
  --amber-800: #8a5b00;

  --red-50: #fff5f5;
  --red-200: #fed7d7;
  --red-600: #c53030;
  --red-700: #9b2c2c;

  --green-50: #e6f4ea;
  --green-200: #c6f6d5;
  --green-600: #1e8e3e;
  --green-800: #135226;

  --blue-50: #e1f3ff;
  --blue-200: #bee3f8;
  --blue-700: #095d92;

  /* ---------- 2. SEMANTIC (light) ---------- */
  color-scheme: light;

  --color-bg: var(--slate-50);
  --color-bg-subtle: var(--slate-100);
  --color-surface: var(--slate-0);
  --color-surface-raised: var(--slate-0);
  --color-surface-sunken: var(--slate-25);
  --color-overlay: rgb(8 20 19 / 0.55);

  --color-text: var(--slate-900);
  --color-text-muted: var(--slate-600);
  --color-text-subtle: var(--slate-500);
  --color-text-inverse: var(--slate-0);

  --color-border: var(--slate-200);
  --color-border-strong: var(--slate-300);

  --color-primary: var(--teal-600);
  --color-primary-hover: var(--teal-700);
  --color-primary-active: var(--teal-800);
  --color-primary-soft: var(--teal-50);
  --color-primary-soft-hover: var(--teal-100);
  --color-on-primary: var(--slate-0);

  --color-accent: var(--amber-500);
  --color-accent-hover: var(--amber-600);
  --color-on-accent: var(--slate-900);

  --color-success: var(--green-600);
  --color-success-soft: var(--green-50);
  --color-success-border: var(--green-200);
  --color-success-strong: var(--green-800);

  --color-warning: var(--amber-800);
  --color-warning-soft: var(--amber-50);
  --color-warning-border: #fde68a;

  --color-danger: var(--red-600);
  --color-danger-hover: var(--red-700);
  --color-danger-soft: var(--red-50);
  --color-danger-border: var(--red-200);

  --color-info: var(--blue-700);
  --color-info-soft: var(--blue-50);
  --color-info-border: var(--blue-200);

  --color-neutral-soft: var(--slate-100);
  --color-focus-ring: var(--teal-500);
  --color-skeleton-base: var(--slate-100);
  --color-skeleton-shine: var(--slate-25);

  /* ---------- SCALES ---------- */
  --space-0: 0;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-full: 999px;

  --font-sans: "Inter Variable", "Hind Siliguri", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;

  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --shadow-xs: 0 1px 2px rgb(8 59 54 / 0.05);
  --shadow-sm: 0 1px 3px rgb(8 59 54 / 0.08), 0 1px 2px rgb(8 59 54 / 0.04);
  --shadow-md: 0 8px 24px rgb(8 59 54 / 0.08);
  --shadow-lg: 0 16px 40px rgb(8 59 54 / 0.12);

  --duration-fast: 120ms;
  --duration-base: 200ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);

  --z-header: 40;
  --z-dropdown: 50;
  --z-overlay: 60;
  --z-modal: 70;
  --z-toast: 80;

  --container-sm: 640px;
  --container-md: 880px;
  --container-lg: 1120px;
  --container-xl: 1280px;
  --header-height: 4rem;

  /* ---------- LEGACY ALIASES (TEMPORARY — delete in Step 7.3) ---------- */
  --bg: var(--color-bg);
  --bg-color: var(--color-bg);
  --surface: var(--color-surface);
  --border: var(--color-border);
  --text: var(--color-text);
  --text-main: var(--color-text);
  --muted: var(--color-text-muted);
  --text-muted: var(--color-text-muted);
  --primary: var(--color-primary);
  --primary-dark: var(--color-primary-hover);
  --primary-hover: var(--color-primary-hover);
  --danger: var(--color-danger);
  --error: var(--color-danger);
  --error-hover: var(--color-danger-hover);
  --error-bg: var(--color-danger-soft);
  --success: var(--color-success);
  --success-bg: var(--color-success-soft);
  --warning: var(--color-warning);
  --warning-bg: var(--color-warning-soft);
  --info: var(--color-info);
  --info-bg: var(--color-info-soft);
  --accent: var(--color-primary);
  --accent-bg: var(--color-primary-soft);
  --radius: var(--radius-md);
  --app-shadow-lifted: var(--shadow-md);
}

/* ---------- 3. DARK THEME ---------- */
[data-theme="dark"] {
  color-scheme: dark;

  --color-bg: #0b1514;
  --color-bg-subtle: #0f1c1a;
  --color-surface: #111e1c;
  --color-surface-raised: #172826;
  --color-surface-sunken: #0d1817;
  --color-overlay: rgb(0 0 0 / 0.65);

  --color-text: #e6f0ee;
  --color-text-muted: #9fb3af;
  --color-text-subtle: #7d928e;
  --color-text-inverse: var(--slate-900);

  --color-border: #233a37;
  --color-border-strong: #2f4b47;

  --color-primary: var(--teal-400);
  --color-primary-hover: var(--teal-300);
  --color-primary-active: var(--teal-200);
  --color-primary-soft: #0f2e2a;
  --color-primary-soft-hover: #143a35;
  --color-on-primary: #04201d;

  --color-success: #4ade80;
  --color-success-soft: #0f2a1a;
  --color-success-border: #1f4d31;
  --color-success-strong: #86efac;

  --color-warning: #fbbf24;
  --color-warning-soft: #2a2108;
  --color-warning-border: #4d3b0d;

  --color-danger: #f87171;
  --color-danger-hover: #fca5a5;
  --color-danger-soft: #2d1414;
  --color-danger-border: #5c2424;

  --color-info: #60a5fa;
  --color-info-soft: #0f1f33;
  --color-info-border: #1e3a5f;

  --color-neutral-soft: #1a2b29;
  --color-focus-ring: var(--teal-300);
  --color-skeleton-base: #16302c;
  --color-skeleton-shine: #1d3b36;

  --shadow-xs: 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.5);
  --shadow-md: 0 8px 24px rgb(0 0 0 / 0.5);
  --shadow-lg: 0 16px 40px rgb(0 0 0 / 0.6);
}
```

### Step 1.4 — Create `styles/reset.css` and rewrite `styles/base.css`

**File (new):** `frontend/src/styles/reset.css`

```css
/* Modern CSS reset (replaces browser defaults and the old Tailwind-without-Preflight setup). */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { -webkit-text-size-adjust: 100%; }
body { min-height: 100vh; line-height: var(--leading-normal); -webkit-font-smoothing: antialiased; }
img, picture, video, canvas, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; color: inherit; }
button { cursor: pointer; background: none; border: 0; padding: 0; }
button:disabled { cursor: not-allowed; }
p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }
ul[role="list"], ol[role="list"] { list-style: none; padding: 0; }
table { border-collapse: collapse; }
```

**File (replace):** `frontend/src/styles/base.css`

```css
/* Element-level typography and defaults. No component classes here. */
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-text);
  background: var(--color-bg);
  text-rendering: optimizeLegibility;
  font-synthesis: none;
}

h1, h2, h3, h4 { line-height: var(--leading-tight); font-weight: var(--weight-bold); color: var(--color-text); }
h1 { font-size: var(--text-3xl); letter-spacing: -0.02em; }
h2 { font-size: var(--text-xl); }
h3 { font-size: var(--text-lg); font-weight: var(--weight-semibold); }
h4 { font-size: var(--text-base); font-weight: var(--weight-semibold); }

a { color: var(--color-primary); text-decoration: none; }
a:hover { text-decoration: underline; }

:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }

::selection { background: var(--color-primary-soft-hover); }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

@media (max-width: 767px) {
  h1 { font-size: var(--text-2xl); }
}
```

> `.sr-only` is the **only** global utility class allowed.

### Step 1.5 — Move legacy CSS and create `styles/index.css`

**Actions**
1. Create the folder `frontend/src/styles/legacy/`.
2. `git mv` these files into it: `layout.css`, `components.css`, `features.css`, `skeleton.css`.
3. In `legacy/layout.css`, **delete** the `body`/`h1` rules if present (`base.css` now owns them). Keep everything else.
4. Delete `frontend/src/styles/tailwind.css`.
5. Create `frontend/src/styles/index.css`:

```css
/* Single global CSS entry. Layer order: later layers win. CSS Modules are unlayered and win over all. */
@layer reset, tokens, base, legacy;

@import "@fontsource-variable/inter";
@import "@fontsource/hind-siliguri/400.css";
@import "@fontsource/hind-siliguri/600.css";

@import "./reset.css" layer(reset);
@import "./tokens.css" layer(tokens);
@import "./base.css" layer(base);

/* TEMPORARY — removed file by file during Phase 4, folder deleted in Phase 7 */
@import "./legacy/layout.css" layer(legacy);
@import "./legacy/components.css" layer(legacy);
@import "./legacy/features.css" layer(legacy);
@import "./legacy/skeleton.css" layer(legacy);
```

6. **File:** `frontend/src/main.tsx`: replace the two style imports with a single `import "./styles/index.css";`.

**Done when** build passes and the app looks the same as before, apart from small font and reset differences. Fix any visible regressions (usually missing list padding or button styles) **inside the legacy files**, not with new global rules.

### Step 1.6 — Stylelint

**File (new):** `frontend/.stylelintrc.json`

```json
{
  "extends": ["stylelint-config-standard", "stylelint-config-css-modules"],
  "rules": {
    "selector-class-pattern": null,
    "custom-property-pattern": null,
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla"],
    "selector-pseudo-class-disallowed-list": ["global"],
    "declaration-no-important": true,
    "import-notation": "string"
  },
  "overrides": [
    {
      "files": ["src/styles/tokens.css"],
      "rules": { "color-no-hex": null, "function-disallowed-list": null }
    }
  ],
  "ignoreFiles": ["src/styles/legacy/**", "dist/**", "node_modules/**"]
}
```

**File:** `frontend/package.json`: add the script `"lint:css": "stylelint \"src/**/*.css\""`.

**Done when** `npm run lint:css` runs. It **will report errors** in existing module files (hex colours); that's expected. Record the error count; Phase 4 brings it to zero. Do not fix them in this step.

---

## PHASE 2 — Shared UI kit (`src/shared/ui`)

Each component lives in its own folder with `Component.tsx`, `Component.module.css`, `index.ts`. All components accept `className` and spread remaining native props. Use `clsx` for class merging.

### Step 2.1 — Button, ButtonLink, IconButton

**File:** `src/shared/ui/Button/Button.tsx`

```tsx
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

export type ButtonProps = ComponentProps<"button"> & CommonProps;

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  leftIcon,
  rightIcon,
  fullWidth,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={clsx(styles.button, className)}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

export type ButtonLinkProps = LinkProps & CommonProps;

/** A react-router Link that looks like a Button. Use for navigation, never <Button onClick={navigate}>. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth || undefined}
      className={clsx(styles.button, className)}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
```

**File:** `src/shared/ui/Button/Button.module.css`

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 2.5rem;
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.button:hover { text-decoration: none; }
.button:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.button:disabled { opacity: 0.55; cursor: not-allowed; }

/* Variants */
.button[data-variant="primary"] { background: var(--color-primary); color: var(--color-on-primary); }
.button[data-variant="primary"]:hover:not(:disabled) { background: var(--color-primary-hover); }

.button[data-variant="accent"] { background: var(--color-accent); color: var(--color-on-accent); }
.button[data-variant="accent"]:hover:not(:disabled) { background: var(--color-accent-hover); }

.button[data-variant="secondary"] {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}
.button[data-variant="secondary"]:hover:not(:disabled) { background: var(--color-bg-subtle); }

.button[data-variant="ghost"] { background: transparent; color: var(--color-text); }
.button[data-variant="ghost"]:hover:not(:disabled) { background: var(--color-bg-subtle); }

.button[data-variant="danger"] { background: var(--color-danger); color: var(--color-text-inverse); }
.button[data-variant="danger"]:hover:not(:disabled) { background: var(--color-danger-hover); }

/* Sizes */
.button[data-size="sm"] { min-height: 2rem; padding: 0 var(--space-3); font-size: var(--text-xs); }
.button[data-size="lg"] { min-height: 3rem; padding: 0 var(--space-6); font-size: var(--text-base); }

.button[data-full-width] { width: 100%; }

.spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentcolor;
  border-right-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
```

**File:** `src/shared/ui/IconButton/IconButton.tsx`: a square button that **requires** `aria-label`:

```tsx
import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./IconButton.module.css";

type Props = Omit<ComponentProps<"button">, "aria-label"> & {
  "aria-label": string;
  variant?: "ghost" | "secondary" | "danger";
  size?: "sm" | "md";
};

export function IconButton({ variant = "ghost", size = "md", type = "button", className, ...rest }: Props) {
  return <button type={type} data-variant={variant} data-size={size} className={clsx(styles.root, className)} {...rest} />;
}
```

```css
/* IconButton.module.css */
.root {
  display: inline-grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  transition: background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}
.root:hover:not(:disabled) { background: var(--color-bg-subtle); color: var(--color-text); }
.root[data-variant="secondary"] { border: 1px solid var(--color-border); background: var(--color-surface); }
.root[data-variant="danger"]:hover:not(:disabled) { background: var(--color-danger-soft); color: var(--color-danger); }
.root[data-size="sm"] { width: 2rem; height: 2rem; }
```

### Step 2.2 — Form controls

**File:** `src/shared/ui/Form/FormField.tsx`: label + control + hint + error, wired with `useId`:

```tsx
import clsx from "clsx";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import styles from "./Form.module.css";

interface FormFieldProps {
  label: ReactNode;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
}

export function FormField({ label, children, hint, error, required, className }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
    : children;

  return (
    <div className={clsx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden> *</span>}
      </label>
      {control}
      {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
```

**Files:** `Input.tsx`, `Select.tsx`, `Textarea.tsx`: thin styled wrappers:

```tsx
// Input.tsx
import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./Form.module.css";
export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={clsx(styles.control, className)} {...rest} />;
}
// Select.tsx  → same pattern with <select className={clsx(styles.control, styles.select, className)}>
// Textarea.tsx → same pattern with <textarea className={clsx(styles.control, styles.textarea, className)}>
```

**File:** `Field.tsx`: **backward-compatible** replacement for the old `Field` (same props, so the 18 existing usages keep working):

```tsx
import { FormField } from "./FormField";
import { Input } from "./Input";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  name?: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
}

export function Field({ label, value, onChange, hint, error, required, ...inputProps }: FieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} required={required}>
      <Input value={value} required={required} onChange={(e) => onChange(e.target.value)} {...inputProps} />
    </FormField>
  );
}
```

**File:** `Form.module.css`

```css
.field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text); }
.required { color: var(--color-danger); }
.hint { font-size: var(--text-xs); color: var(--color-text-muted); }
.error { font-size: var(--text-xs); color: var(--color-danger); }

.control {
  width: 100%;
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-sm);
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.control::placeholder { color: var(--color-text-subtle); }
.control:hover:not(:disabled) { border-color: var(--color-text-subtle); }
.control:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft-hover); }
.control:disabled { background: var(--color-bg-subtle); cursor: not-allowed; }
.control[aria-invalid="true"] { border-color: var(--color-danger); }

.select { appearance: auto; padding-right: var(--space-8); }
.textarea { min-height: 6rem; resize: vertical; line-height: var(--leading-normal); }
```

### Step 2.3 — Card

```tsx
// src/shared/ui/Card/Card.tsx
import clsx from "clsx";
import type { ElementType, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  as?: ElementType;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ as: Tag = "div", padding = "md", interactive, className, children }: CardProps) {
  return (
    <Tag data-padding={padding} data-interactive={interactive || undefined} className={clsx(styles.root, className)}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
```

```css
/* Card.module.css */
.root {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}
.root[data-padding="none"] { padding: 0; }
.root[data-padding="sm"] { padding: var(--space-3); }
.root[data-padding="md"] { padding: var(--space-5); }
.root[data-padding="lg"] { padding: var(--space-8); }
.root[data-interactive] { transition: box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out); }
.root[data-interactive]:hover { box-shadow: var(--shadow-md); border-color: var(--color-primary-soft-hover); transform: translateY(-2px); }

.header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); }
.title { font-size: var(--text-lg); font-weight: var(--weight-semibold); }
.description { margin-top: var(--space-1); font-size: var(--text-sm); color: var(--color-text-muted); }
.actions { display: flex; gap: var(--space-2); flex-shrink: 0; }
```

### Step 2.4 — Badge (+ fix duplicated status tone)

```tsx
// src/shared/ui/Badge/Badge.tsx
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
const TONES: readonly BadgeTone[] = ["neutral", "primary", "success", "warning", "danger", "info"];

/** `tone` accepts string for backward compatibility; unknown values fall back to "neutral". */
export function Badge({ children, tone = "neutral", dot, className }: { children: ReactNode; tone?: BadgeTone | string; dot?: boolean; className?: string }) {
  const safeTone = (TONES as readonly string[]).includes(tone) ? tone : "neutral";
  return (
    <span data-tone={safeTone} className={clsx(styles.root, className)}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  );
}
```

```css
/* Badge.module.css */
.root {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: 0.125rem var(--space-2);
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  font-size: var(--text-xs); font-weight: var(--weight-semibold);
  letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap;
}
.dot { width: 0.4rem; height: 0.4rem; border-radius: var(--radius-full); background: currentcolor; }
.root[data-tone="neutral"] { background: var(--color-neutral-soft); color: var(--color-text-muted); }
.root[data-tone="primary"] { background: var(--color-primary-soft); color: var(--color-primary); }
.root[data-tone="success"] { background: var(--color-success-soft); color: var(--color-success); border-color: var(--color-success-border); }
.root[data-tone="warning"] { background: var(--color-warning-soft); color: var(--color-warning); border-color: var(--color-warning-border); }
.root[data-tone="danger"]  { background: var(--color-danger-soft);  color: var(--color-danger);  border-color: var(--color-danger-border); }
.root[data-tone="info"]    { background: var(--color-info-soft);    color: var(--color-info);    border-color: var(--color-info-border); }
```

**Duplicate fix:**
1. Create `src/shared/utils/statusTone.ts` containing **one** `appointmentStatusTone(status: string): BadgeTone`, copying the logic from `doctor/appointments/utils/statusTone.ts` (CONFIRMED/COMPLETED → success, PENDING_PAYMENT → warning, CANCELLED/PAYMENT_EXPIRED/NO_SHOW → danger, else neutral).
2. Make `doctor/appointments/utils/statusTone.ts` and the function in `patient/appointments/utils/patientAppointments.utils.ts` **re-export** it, so existing imports and tests keep working.
3. Move the existing test `doctor/appointments/utils/statusTone.test.ts` cases into `src/shared/utils/statusTone.test.ts` (keep the old test file passing or delete it only if it becomes a duplicate).

### Step 2.5 — Alert, Spinner, Skeleton, EmptyState

```tsx
// Alert.tsx
import clsx from "clsx";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./Alert.module.css";

const ICONS = { error: AlertCircle, success: CheckCircle2, info: Info, warning: TriangleAlert };

export function Alert({ kind, title, children, className }: { kind: "error" | "success" | "info" | "warning"; title?: ReactNode; children: ReactNode; className?: string }) {
  const Icon = ICONS[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} data-kind={kind} className={clsx(styles.root, className)}>
      <Icon size={18} aria-hidden className={styles.icon} />
      <div>
        {title && <p className={styles.title}>{title}</p>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
```

```css
/* Alert.module.css */
.root { display: flex; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid; border-radius: var(--radius-md); font-size: var(--text-sm); }
.icon { flex-shrink: 0; margin-top: 0.125rem; }
.title { font-weight: var(--weight-semibold); margin-bottom: var(--space-1); }
.root[data-kind="error"]   { background: var(--color-danger-soft);  border-color: var(--color-danger-border);  color: var(--color-danger); }
.root[data-kind="success"] { background: var(--color-success-soft); border-color: var(--color-success-border); color: var(--color-success-strong); }
.root[data-kind="info"]    { background: var(--color-info-soft);    border-color: var(--color-info-border);    color: var(--color-info); }
.root[data-kind="warning"] { background: var(--color-warning-soft); border-color: var(--color-warning-border); color: var(--color-warning); }
.body { color: var(--color-text); }
```

```tsx
// Spinner.tsx: keeps the same `label` prop
import styles from "./Spinner.module.css";
export function Spinner({ label = "Loading…", size = "md" }: { label?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div role="status" aria-live="polite" className={styles.root}>
      <span data-size={size} className={styles.ring} aria-hidden />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
```

```css
/* Spinner.module.css */
.root { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-10) var(--space-4); color: var(--color-text-muted); font-size: var(--text-sm); }
.ring { width: 2rem; height: 2rem; border: 3px solid var(--color-primary-soft-hover); border-top-color: var(--color-primary); border-radius: var(--radius-full); animation: spin 0.8s linear infinite; }
.ring[data-size="sm"] { width: 1.25rem; height: 1.25rem; border-width: 2px; }
.ring[data-size="lg"] { width: 3rem; height: 3rem; }
@keyframes spin { to { transform: rotate(360deg); } }
```

```tsx
// Skeleton.tsx
import clsx from "clsx";
import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";
export function Skeleton({ width = "100%", height = "1rem", radius = "var(--radius-sm)", className }: { width?: string; height?: string; radius?: string; className?: string }) {
  return <span aria-hidden className={clsx(styles.root, className)} style={{ "--sk-w": width, "--sk-h": height, "--sk-r": radius } as CSSProperties} />;
}
export function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden>
      <Skeleton width="3rem" height="3rem" radius="var(--radius-full)" />
      <Skeleton width="60%" height="1.1rem" />
      <Skeleton width="40%" />
      <Skeleton height="2.5rem" radius="var(--radius-md)" />
    </div>
  );
}
```

```css
/* Skeleton.module.css */
.root {
  display: block; width: var(--sk-w); height: var(--sk-h); border-radius: var(--sk-r);
  background: linear-gradient(90deg, var(--color-skeleton-base) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton-base) 75%);
  background-size: 200% 100%;
}
@media (prefers-reduced-motion: no-preference) { .root { animation: shimmer 1.4s ease infinite; } }
.card { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
```

```tsx
// EmptyState.tsx: still works with only children (backward compatible)
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import styles from "./EmptyState.module.css";
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.icon} aria-hidden>{icon ?? <Inbox size={28} />}</div>
      {title && <h3 className={styles.title}>{title}</h3>}
      {children && <div className={styles.body}>{children}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
```

```css
/* EmptyState.module.css */
.root { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-12) var(--space-4); text-align: center; border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg); background: var(--color-surface-sunken); }
.icon { display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: var(--radius-full); background: var(--color-primary-soft); color: var(--color-primary); }
.title { font-size: var(--text-lg); }
.body { max-width: 28rem; color: var(--color-text-muted); font-size: var(--text-sm); }
.action { margin-top: var(--space-3); }
```

### Step 2.6 — Layout primitives and Text

```tsx
// src/shared/ui/Layout/Stack.tsx: vertical spacing (replaces .stack and many tiny modules)
import clsx from "clsx";
import type { CSSProperties, ElementType, ReactNode } from "react";
import styles from "./Layout.module.css";

type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

export function Stack({ as: Tag = "div", gap = 4, className, children }: { as?: ElementType; gap?: Space; className?: string; children: ReactNode }) {
  return <Tag className={clsx(styles.stack, className)} style={{ "--gap": `var(--space-${gap})` } as CSSProperties}>{children}</Tag>;
}

// Cluster.tsx: horizontal row that wraps (replaces .row, .row.space-between, .filters)
export function Cluster({ as: Tag = "div", gap = 2, justify = "start", align = "center", wrap = true, className, children }: {
  as?: ElementType; gap?: Space; justify?: "start" | "center" | "end" | "between"; align?: "start" | "center" | "end" | "stretch" | "baseline"; wrap?: boolean; className?: string; children: ReactNode;
}) {
  return (
    <Tag data-justify={justify} data-align={align} data-wrap={wrap || undefined} className={clsx(styles.cluster, className)} style={{ "--gap": `var(--space-${gap})` } as CSSProperties}>
      {children}
    </Tag>
  );
}

// Grid.tsx: responsive auto-fill grid (replaces .grid)
export function Grid({ min = "280px", gap = 4, className, children }: { min?: string; gap?: Space; className?: string; children: ReactNode }) {
  return <div className={clsx(styles.grid, className)} style={{ "--grid-min": min, "--gap": `var(--space-${gap})` } as CSSProperties}>{children}</div>;
}

// Container.tsx
export function Container({ size = "lg", className, children }: { size?: "sm" | "md" | "lg" | "xl"; className?: string; children: ReactNode }) {
  return <div data-size={size} className={clsx(styles.container, className)}>{children}</div>;
}
```

(Put each in its own file; they share `Layout.module.css`.)

```css
/* Layout.module.css */
.stack { display: flex; flex-direction: column; gap: var(--gap); }

.cluster { display: flex; gap: var(--gap); }
.cluster[data-wrap] { flex-wrap: wrap; }
.cluster[data-justify="start"] { justify-content: flex-start; }
.cluster[data-justify="center"] { justify-content: center; }
.cluster[data-justify="end"] { justify-content: flex-end; }
.cluster[data-justify="between"] { justify-content: space-between; }
.cluster[data-align="start"] { align-items: flex-start; }
.cluster[data-align="center"] { align-items: center; }
.cluster[data-align="end"] { align-items: flex-end; }
.cluster[data-align="stretch"] { align-items: stretch; }
.cluster[data-align="baseline"] { align-items: baseline; }

.grid { display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fill, minmax(min(var(--grid-min), 100%), 1fr)); }

.container { width: 100%; margin-inline: auto; padding-inline: var(--space-4); }
.container[data-size="sm"] { max-width: var(--container-sm); }
.container[data-size="md"] { max-width: var(--container-md); }
.container[data-size="lg"] { max-width: var(--container-lg); }
.container[data-size="xl"] { max-width: var(--container-xl); }
@media (min-width: 768px) { .container { padding-inline: var(--space-6); } }
```

```tsx
// src/shared/ui/Text/Text.tsx: replaces className="muted", "small", "muted small"
import clsx from "clsx";
import type { ElementType, ReactNode } from "react";
import styles from "./Text.module.css";

export function Text({ as: Tag = "p", tone = "default", size = "base", weight, className, children }: {
  as?: ElementType; tone?: "default" | "muted" | "subtle" | "primary" | "danger" | "success"; size?: "xs" | "sm" | "base" | "lg"; weight?: "medium" | "semibold" | "bold"; className?: string; children: ReactNode;
}) {
  return <Tag data-tone={tone} data-size={size} data-weight={weight} className={clsx(styles.text, className)}>{children}</Tag>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx(styles.eyebrow, className)}>{children}</p>;
}
```

```css
/* Text.module.css */
.text[data-tone="default"] { color: var(--color-text); }
.text[data-tone="muted"] { color: var(--color-text-muted); }
.text[data-tone="subtle"] { color: var(--color-text-subtle); }
.text[data-tone="primary"] { color: var(--color-primary); }
.text[data-tone="danger"] { color: var(--color-danger); }
.text[data-tone="success"] { color: var(--color-success); }
.text[data-size="xs"] { font-size: var(--text-xs); }
.text[data-size="sm"] { font-size: var(--text-sm); }
.text[data-size="base"] { font-size: var(--text-base); }
.text[data-size="lg"] { font-size: var(--text-lg); }
.text[data-weight="medium"] { font-weight: var(--weight-medium); }
.text[data-weight="semibold"] { font-weight: var(--weight-semibold); }
.text[data-weight="bold"] { font-weight: var(--weight-bold); }

.eyebrow { font-size: var(--text-xs); font-weight: var(--weight-bold); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-primary); }
```

### Step 2.7 — Page, PageHeader, DescriptionList, Table, Avatar

```tsx
// src/shared/ui/Page/Page.tsx
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Page.module.css";

export function Page({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx(styles.page, className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
```

```css
/* Page.module.css */
.page { display: flex; flex-direction: column; gap: var(--space-6); padding-block: var(--space-6) var(--space-12); }
.header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-4); }
.headerText { display: flex; flex-direction: column; gap: var(--space-1); max-width: 48rem; }
.eyebrow { font-size: var(--text-xs); font-weight: var(--weight-bold); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-primary); }
.title { font-size: var(--text-2xl); }
.description { color: var(--color-text-muted); }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
@media (min-width: 768px) { .title { font-size: var(--text-3xl); } }
```

```tsx
// src/shared/ui/DescriptionList/DescriptionList.tsx: replaces <dl className="facts">
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./DescriptionList.module.css";
export interface DescriptionItem { label: ReactNode; value: ReactNode; }
export function DescriptionList({ items, columns = "auto", className }: { items: DescriptionItem[]; columns?: "auto" | 1 | 2 | 3; className?: string }) {
  return (
    <dl data-columns={columns} className={clsx(styles.root, className)}>
      {items.map((item, i) => (
        <div key={i} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

```css
/* DescriptionList.module.css */
.root { display: grid; gap: var(--space-3) var(--space-4); grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); margin: 0; }
.root[data-columns="1"] { grid-template-columns: 1fr; }
.root[data-columns="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.root[data-columns="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.item { min-width: 0; }
.label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); }
.value { margin: var(--space-1) 0 0; font-weight: var(--weight-semibold); font-size: var(--text-sm); overflow-wrap: anywhere; }
```

> If an existing `<dl className="facts">` has conditional `<div>` items, it's fine to keep the JSX and just apply `className={styles.root}` from a local module that copies the rules above, **or** build the `items` array with `.filter(Boolean)`.

```tsx
// src/shared/ui/Table/Table.tsx: wrapper gives horizontal scroll on mobile
import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./Table.module.css";
export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    <div className={styles.wrapper}>
      <table className={clsx(styles.table, className)} {...rest} />
    </div>
  );
}
```

```css
/* Table.module.css */
.wrapper { width: 100%; overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.table { width: 100%; font-size: var(--text-sm); }
.table th, .table td { padding: var(--space-3) var(--space-4); text-align: left; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.table th { font-size: var(--text-xs); font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); background: var(--color-surface-sunken); white-space: nowrap; }
.table tbody tr:last-child td { border-bottom: 0; }
.table tbody tr:hover td { background: var(--color-bg-subtle); }
```

```tsx
// src/shared/ui/Avatar/Avatar.tsx
import clsx from "clsx";
import styles from "./Avatar.module.css";
function initials(name: string) {
  return name.replace(/^Dr\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  return (
    <span data-size={size} className={clsx(styles.root, className)} aria-hidden={!src}>
      {src ? <img src={src} alt={name} className={styles.img} /> : initials(name)}
    </span>
  );
}
```

```css
/* Avatar.module.css */
.root { display: inline-grid; place-items: center; flex-shrink: 0; overflow: hidden; border-radius: var(--radius-full); background: var(--color-primary-soft); color: var(--color-primary); font-weight: var(--weight-semibold); }
.root[data-size="sm"] { width: 2rem; height: 2rem; font-size: var(--text-xs); }
.root[data-size="md"] { width: 2.75rem; height: 2.75rem; font-size: var(--text-sm); }
.root[data-size="lg"] { width: 4rem; height: 4rem; font-size: var(--text-xl); }
.root[data-size="xl"] { width: 6rem; height: 6rem; font-size: var(--text-3xl); }
.img { width: 100%; height: 100%; object-fit: cover; }
```

### Step 2.8 — Radix wrappers: Dialog, Tabs, DropdownMenu

Build thin styled wrappers. Keep the Radix API; only add classes.

```tsx
// src/shared/ui/Dialog/Dialog.tsx
import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./Dialog.module.css";

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export function DialogContent({ title, description, children, footer }: { title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode }) {
  return (
    <RD.Portal>
      <RD.Overlay className={styles.overlay} />
      <RD.Content className={styles.content}>
        <div className={styles.header}>
          <RD.Title className={styles.title}>{title}</RD.Title>
          <RD.Close className={styles.close} aria-label="Close"><X size={18} /></RD.Close>
        </div>
        {description && <RD.Description className={styles.description}>{description}</RD.Description>}
        {children && <div className={styles.body}>{children}</div>}
        {footer && <div className={styles.footer}>{footer}</div>}
      </RD.Content>
    </RD.Portal>
  );
}
```

```css
/* Dialog.module.css */
.overlay { position: fixed; inset: 0; z-index: var(--z-overlay); background: var(--color-overlay); }
.content {
  position: fixed; z-index: var(--z-modal); top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(32rem, calc(100vw - 2rem)); max-height: calc(100vh - 2rem); overflow-y: auto;
  padding: var(--space-6); border-radius: var(--radius-xl); background: var(--color-surface-raised); box-shadow: var(--shadow-lg);
}
.header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.title { font-size: var(--text-lg); font-weight: var(--weight-semibold); }
.close { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: var(--radius-md); color: var(--color-text-muted); }
.close:hover { background: var(--color-bg-subtle); }
.description { margin-top: var(--space-2); color: var(--color-text-muted); font-size: var(--text-sm); }
.body { margin-top: var(--space-4); }
.footer { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-6); }
@media (prefers-reduced-motion: no-preference) {
  .overlay { animation: fade var(--duration-base) var(--ease-out); }
  .content { animation: pop var(--duration-base) var(--ease-out); }
}
@keyframes fade { from { opacity: 0; } }
@keyframes pop { from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); } }
```

- **Tabs** (`src/shared/ui/Tabs/`): export `Tabs = RT.Root`, `TabsList`, `TabsTrigger`, `TabsContent` with classes. Style the list as an underline tab bar; the active trigger (`[data-state="active"]`) gets `color: var(--color-primary)` and a 2px bottom border in the primary colour.
- **DropdownMenu** (`src/shared/ui/DropdownMenu/`): export `DropdownMenu = RDM.Root`, `DropdownMenuTrigger`, `DropdownMenuContent` (Portal + content with `z-index: var(--z-dropdown)`, surface background, border, `--shadow-md`, radius-lg, padding `--space-1`), `DropdownMenuItem` (padding, radius-md, `[data-highlighted]` → `background: var(--color-bg-subtle)`), `DropdownMenuSeparator`.

### Step 2.9 — Toast (move + fix test)

1. Move the toast code from `components/ui.tsx` into `src/shared/ui/Toast/ToastProvider.tsx` with `Toast.module.css`. Copy the visual rules from `styles/legacy/components.css` (`.toast-container`, `.toast`, `.toast-success|error|info`, `.toast-close-btn`, `@keyframes toast-slide-up`) into the module, converting every colour to tokens (e.g. `#135226` → `var(--color-success-strong)`).
2. Use `data-kind={toast.kind}` for variants. **Keep** `data-testid={\`toast-${kind}\`}`, `role`/`aria-live`, and the `aria-label="Dismiss notification"` button.
3. Container position: bottom-right on desktop and full-width bottom on mobile; `z-index: var(--z-toast)`.
4. **Update `src/components/tests/Toast.test.tsx`**: replace assertions on `class="toast-container"`, `class="toast toast-success"`, `class="toast-close-btn"` with assertions on `data-testid="toast-success"` etc., `aria-label="Dismiss notification"`, and the message text. Add `data-testid="toast-container"` to the container if needed.
5. Delete the toast rules from `styles/legacy/components.css`.

### Step 2.10 — Barrel + backward-compatible re-export

**File:** `src/shared/ui/index.ts`: export every component from 2.1–2.9.

**File:** `src/components/ui.tsx`: **replace its whole content** with:

```ts
/**
 * TEMPORARY compatibility barrel. New code must import from "src/shared/ui".
 * Removed in Step 7.2 after all imports are updated.
 */
export * from "../shared/ui";
```

**Done when** build + tests pass and every page still renders. Pages now use the new `Button`, `Card`, `Badge`, `Alert`, `Spinner`, `EmptyState` and `Field` automatically. Check visually that nothing is broken (spacing may differ slightly, which is fine).

Then delete these now-unused rules from `styles/legacy/components.css`: `.card`, `.btn*` **only if** no TSX still uses `className="btn…"` (check with grep; PublicHeader, AdminHeader and others still do, so keep `.btn*` until Phase 4 finishes), `.alert*`, `.badge*`, `.spinner`, `.empty`.

---

## PHASE 3 — App shells (layouts, header, footer, 404)

### Step 3.1 — MainLayout + SiteFooter

**Files:** `src/layouts/MainLayout.tsx` + new `src/layouts/MainLayout.module.css`, and new `src/public/shell/SiteFooter/{SiteFooter.tsx, SiteFooter.module.css, index.ts}`.

- Replace `className="app"` / `className="main"` with module classes.
- Structure: `<div class=root>` (min-height 100vh, flex column) → `<PublicHeader/>` → `<main class=main>` (flex 1) containing `<Container size="lg"><Outlet/></Container>` → `<SiteFooter/>`.
- SiteFooter: brand + short tagline ("Find trusted doctors across Bangladesh"), link columns (Find doctors `/doctors`, Verify prescription `/verify-prescription`, Login `/login`), a bottom row with `© {year} MediConnect BD`. Use a `--color-surface` background with a top border. On mobile, columns stack.
- Remove `.app`, `.main` from `styles/legacy/layout.css`.

### Step 3.2 — PublicHeader refresh

**Files:** `src/public/shell/PublicHeader/PublicHeader.tsx` + `.module.css` (293 + 283 lines).

**Keep:** every `NavLink` destination, role-based link visibility, logout logic, mobile menu open/close state, all link text.

**Change:**
1. Replace `className="btn btn-…"` with `<Button>` / `<ButtonLink>` / `<IconButton>`.
2. Replace the 2 hex colours in the module with tokens.
3. Visual spec: sticky top, `height: var(--header-height)`, background `color-mix(in srgb, var(--color-surface) 85%, transparent)` with `backdrop-filter: blur(10px)`, bottom border `var(--color-border)`, `z-index: var(--z-header)`.
4. Logo: a lucide `Stethoscope` icon inside a 2rem rounded primary square, plus "MediConnect **BD**" text (bold, "BD" in primary).
5. Desktop nav links: pill shape, padding `var(--space-2) var(--space-3)`; the active link uses `background: var(--color-primary-soft); color: var(--color-primary)`.
6. Signed-in user: replace inline name + logout with a **DropdownMenu** (Avatar + name → menu items: dashboard link for the role, then a separator, then "Log out"). Keep the exact logout button text currently used.
7. Add `<ThemeToggle />` (created in Step 5.2; until then leave a `{/* ThemeToggle */}` placeholder).
8. Mobile (< 768px): hamburger `IconButton` opens a full-width panel below the header listing the same links as large tap targets (min-height 44px).
9. Use breakpoint `768px` only (replace the existing 2 media queries).

### Step 3.3 — Admin shell tokens

**Files:** `src/layouts/AdminLayout.module.css` (12 hex), `src/admin/navigation/AdminSidebar/AdminSidebar.module.css` (13 hex), `src/admin/layout/AdminHeader/AdminHeader.module.css` (7 hex), `AdminHeader.tsx`.

- Replace **every** hex with the closest semantic token (dark sidebar colours → use `--color-surface` + `--color-border`, so the sidebar automatically supports dark mode).
- `AdminHeader.tsx`: replace `btn btn-ghost btn-icon` with `<IconButton>`/`<Button variant="ghost">`.
- `AdminLayout.tsx`: replace `className="app"` with a module class; use `clsx` for the `collapsed` class.
- Sidebar active item: `background: var(--color-primary-soft); color: var(--color-primary); font-weight: var(--weight-semibold)`.

### Step 3.4 — NotFound page and ErrorBoundary

1. Create `src/public/not-found/NotFoundPage.tsx` (+ module): big "404", title "Page not found", description, and `<ButtonLink to="/doctors">Find a doctor</ButtonLink>`.
2. In `src/routes/AppRouter.tsx`, change **only** the final catch-all: `<Route path="*" element={<NotFoundPage />} />`, placed inside the `MainLayout` route group so the header and footer show.
3. Create `src/shared/ui/ErrorBoundary/ErrorBoundary.tsx` (class component) showing "Something went wrong" + a "Reload page" button (`window.location.reload()`). Wrap `<AppRouter />` in `App.tsx` with it.

---

## PHASE 4 — Migrate every page and component

### 4.0 Migration recipe (apply to every file in the table below)

For each file:

1. **Imports**: import components from `../../shared/ui` (correct relative path) instead of `components/ui`.
2. **Global classes → components** (use the mapping in section 2.2):
   - `<div className="page">` → `<Page>`
   - `<header className="page-header"><p className="eyebrow">X</p><h1>Y</h1><p className="muted">Z</p></header>` → `<PageHeader eyebrow="X" title="Y" description="Z" />`
   - `className="muted"` → `<Text tone="muted">` (keep the same element using `as="span"` if it was a span)
   - `className="small muted"` / `"muted small"` → `<Text tone="muted" size="sm">`
   - `className="row"` → `<Cluster>`; `"row space-between"` → `<Cluster justify="between">`
   - `className="filters"` → `<Cluster align="end" gap={3}>` (or a local module class if it needs a grid)
   - `<label className="field"><span>L</span><select …/></label>` → `<FormField label="L"><Select …/></FormField>`
   - `<table className="table">` → `<Table>`
   - `<dl className="facts">` → `<DescriptionList>` or a local module copy
   - `className="btn btn-primary"` on `<button>` → `<Button>`; on `<Link>` → `<ButtonLink>`
   - `className="eyebrow"` (outside a page header) → `<Eyebrow>`
3. **Inline `style={{…}}`** → move into the component's module as a named class. Exception: dynamic values become CSS variables.
4. **Hex colours in the module** → tokens.
5. **Create a module** if the file needs custom styles and doesn't have one (`Foo.tsx` → `Foo.module.css`).
6. **Media queries** → mobile-first with the 4 breakpoints.
7. **Verify**: build, tests, open the page at 360/768/1280px. Text must be identical.
8. Commit: `ui(step 4.N): migrate <ComponentName>`.

### 4.1 Auth pages

| File | Globals to remove | Inline styles | Extra work |
|---|---|---|---|
| `features/auth/LoginPage.tsx` | `auth-shell auth-card demo-accounts demo-buttons muted small` | 1 | Create `features/auth/AuthLayout.module.css` shared by both pages |
| `features/auth/RegisterPage.tsx` | `auth-shell auth-card demo-accounts muted row small` | 1 | same module |

**Redesign spec (auth):**
- Two-column layout ≥ 1024px: left = brand panel (primary-to-teal-800 gradient using tokens, logo, headline "Healthcare, one tap away", 3 benefit bullets with lucide `CheckCircle2` icons); right = form card (max-width 420px).
- < 1024px: only the form card, centred, with the logo above it.
- Demo accounts: `<Card padding="sm">` with small `secondary` buttons in a `Cluster`.
- Submit button: `<Button fullWidth size="lg" loading={submitting}>` with the **same label text**.
- Delete `.auth-shell`, `.auth-card`, `.demo-accounts`, `.demo-buttons` from `legacy/features.css`.

### 4.2 Public doctor directory

| File | Globals | Inline | Module hex |
|---|---|---|---|
| `public/doctors/DoctorSearchPage.tsx` | `eyebrow grid muted page page-header` | 0 | 0 |
| `public/doctors/components/DoctorSearchFilters/DoctorSearchFilters.tsx` | `field filters` (+ `<Card className="filters">`) | 0 | 1 |
| `public/doctors/components/DoctorCard/DoctorCard.tsx` | `btn btn-primary facts muted small` | 4 | 3 |
| `public/doctors/DoctorDetailPage.tsx` | `page` | 0 | 0 |
| `public/doctors/components/DoctorProfileHeader/DoctorProfileHeader.tsx` | `facts muted small` | 0 | 4 |
| `public/doctors/components/AvailabilityScheduleGrid/AvailabilityScheduleGrid.tsx` | `muted slot slot-grid small` | 0 | 5 |
| `public/doctors/components/SlotHoldBanner/SlotHoldBanner.tsx` | `field hold-banner row` | 0 | 2 |
| `public/doctors/components/DoctorReviewsList/DoctorReviewsList.tsx` | `muted row small space-between` | 0 | 1 |
| `public/verify-prescription/VerifyPrescriptionPage.tsx` | `eyebrow facts muted page page-header small` | 0 | 0 |

After this group, delete `.doctor-card`, `.doctor-head`, `.avatar`, `.slot*` from `legacy/features.css` (replace `.avatar` usages with `<Avatar>`).

### 4.3 Patient pages

| File | Globals | Inline | Module hex |
|---|---|---|---|
| `patient/appointments/AppointmentsPage.tsx` | `eyebrow muted page page-header` | 0 | 1 |
| `patient/appointments/components/PatientAppointmentCard/PatientAppointmentCard.tsx` | `facts muted row small` | 1 | 5 |
| `patient/appointments/components/PaymentPanel/PaymentPanel.tsx` | `btn btn-primary muted row small space-between` | 4 | 5 |
| `patient/appointments/components/ReschedulePanel/ReschedulePanel.tsx` | `muted slot small` | 1 | 4 |
| `patient/appointments/components/ReviewFormPanel/ReviewFormPanel.tsx` | `field muted row small space-between` | 0 | 2 |
| `patient/appointments/components/VideoSessionPanel/VideoSessionPanel.tsx` | `btn btn-secondary muted row small table` | **17** | 10 |
| `patient/family-members/FamilyMembersPage.tsx` | `eyebrow filters muted page page-header row small space-between` | 0 | *no module, create one* |
| `patient/prescriptions/PatientPrescriptionsPage.tsx` | `btn btn-secondary eyebrow muted page page-header row small space-between table` | 4 | *no module, create one* |
| `patient/reports/MedicalReportsPage.tsx` | `eyebrow muted page page-header row small space-between` | 1 | *no module, create one* |
| `patient/reports/components/ReportUploadForm.tsx` | `field filters muted page row small` | 2 | *no module, create one* |

> `VideoSessionPanel.tsx` has 17 inline styles; this is the biggest cleanup. Move each into a named module class (`.videoFrame`, `.controls`, `.statusRow`…). Keep the `iframe`/video logic untouched.

### 4.4 Doctor pages

| File | Globals | Inline | Module hex |
|---|---|---|---|
| `doctor/dashboard/DoctorDashboardPage.tsx` | `page` | 0 | 0 |
| `doctor/dashboard/components/DoctorDashboardHeader/DoctorDashboardHeader.tsx` | `btn btn-primary btn-secondary eyebrow muted` | 0 | 0 |
| `doctor/dashboard/components/DoctorEarningsSection/DoctorEarningsSection.tsx` | `facts muted small stack` | 0 | 0 |
| `doctor/dashboard/components/DoctorProfileSection/DoctorProfileSection.tsx` | `facts field filters muted row small` | 0 | 0 |
| `doctor/dashboard/components/DoctorScheduleSection/DoctorScheduleSection.tsx` | `field muted small table` | 2 | 4 |
| `doctor/dashboard/components/DoctorScheduleSection/DoctorTimeOffSection.tsx` | `filters table` | 2 | *no module, create `DoctorTimeOffSection.module.css`* |
| `doctor/dashboard/components/PatientHistoryPanel/PatientHistoryPanel.tsx` | `page table` | 6 | 5 |
| `doctor/appointments/DoctorAppointmentsPage.tsx` | `eyebrow muted page page-header` | 0 | 1 |
| `doctor/appointments/components/ActiveAppointmentCard/ActiveAppointmentCard.tsx` | `muted row small` | 0 | 3 |
| `doctor/appointments/components/PastAppointmentCard/PastAppointmentCard.tsx` | `btn btn-secondary muted row small` | 0 | 3 |
| `doctor/prescriptions/DoctorPrescriptionsPage.tsx` | `eyebrow muted page page-header` | 0 | 0 |
| `doctor/prescriptions/components/DoctorPrescriptionCard/DoctorPrescriptionCard.tsx` | `muted small table` | 2 | 3 |
| `doctor/prescriptions/components/PrescriptionEditorForm/PrescriptionEditorForm.tsx` | `muted row small space-between` | 4 | 8 |

> Keep the heading text **"Patient history & reports"** exactly (e2e).

### 4.5 Admin pages

| File | Globals | Inline | Module |
|---|---|---|---|
| `admin/dashboard/AdminOverviewPage.tsx` | `btn btn-ghost card eyebrow` | 0 | uses `AdminOverview.module.css` (1 hex) |
| `admin/dashboard/components/OverviewSummaryCards.tsx` | — | 0 | create module or reuse `AdminOverview.module.css` |
| `admin/dashboard/components/TopSpecialtiesAndDoctors.tsx` (233 lines) | `btn btn-secondary eyebrow facts grid muted row small space-between` | 2 | create module |
| `admin/applications/AdminApplicationsPage.tsx` | `eyebrow filters muted page page-header row small space-between` | 0 | create module |
| `admin/users/AdminUsersPage.tsx` | `eyebrow field filters muted page page-header` | 0 | create module |
| `admin/users/components/AdminUsersTable.tsx` | `row table` | 0 | — |
| `admin/catalog/AdminCatalogPage.tsx` | `eyebrow muted page page-header` | 0 | — |
| `admin/catalog/components/HospitalsPanel.tsx` | `filters muted small table` | 1 | create module |
| `admin/catalog/components/SpecialtiesPanel.tsx` | `filters muted small table` | 1 | create module |
| `admin/operations/AdminOperationsPage.tsx` | `eyebrow muted page page-header row` | 0 | — |
| `admin/operations/components/AdminAppointmentsTable.tsx` | `table` | 0 | — |
| `admin/operations/components/AdminPaymentsTable.tsx` | `muted small table` | 0 | — |
| `admin/operations/components/AdminRefundsTable.tsx` | `muted small table` | 3 | create module |

> `admin/operations/tests/AdminRefundsTable.test.tsx` must still pass. If it asserts on class names, switch it to text/role assertions.

### 4.6 End-of-phase check

Run the commands below. **All must return nothing:**

```bash
cd frontend/src
grep -rnE 'className="[^"]*\b(muted|small|row|space-between|btn|btn-[a-z]+|eyebrow|field|page|page-header|facts|filters|stack|grid|card|table|slot|slot-grid|avatar|app|main)\b' --include=*.tsx .
grep -rn "style={{" --include=*.tsx . | grep -v -- '"--'
grep -rnE "#[0-9a-fA-F]{3,8}\b" --include=*.module.css .
grep -rn ":global" --include=*.css .
```

And `npm run lint:css` must report **0 errors**.

---

## PHASE 5 — Theme: dark mode & fonts

### Step 5.1 — ThemeProvider

**File:** `src/shared/theme/ThemeProvider.tsx`

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
const STORAGE_KEY = "mcbd-theme";

interface ThemeContextValue { preference: ThemePreference; resolved: "light" | "dark"; setPreference: (p: ThemePreference) => void; }
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>(() => (localStorage.getItem(STORAGE_KEY) as ThemePreference) ?? "system");
  const [resolved, setResolved] = useState<"light" | "dark">(() => (preference === "system" ? systemTheme() : preference));

  useEffect(() => {
    const apply = () => {
      const next = preference === "system" ? systemTheme() : preference;
      setResolved(next);
      document.documentElement.dataset.theme = next;
    };
    apply();
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, p);
    setPref(p);
  }, []);

  return <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
```

- Wrap the app in `main.tsx`: `<ThemeProvider>` goes outside `<BrowserRouter>`.
- **No-flash script**: in `frontend/index.html`, inside `<head>` before any CSS, add:

```html
<script>
  (function () {
    try {
      var p = localStorage.getItem("mcbd-theme") || "system";
      var d = p === "dark" || (p === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = d ? "dark" : "light";
    } catch (e) {}
  })();
</script>
<meta name="theme-color" content="#0d7a6f" />
```

### Step 5.2 — ThemeToggle

`src/shared/theme/ThemeToggle/ThemeToggle.tsx`: an `IconButton` that cycles light → dark → system, showing a lucide `Sun` / `Moon` / `Monitor` icon, with `aria-label={\`Theme: ${preference}\`}`. Add it to `PublicHeader` (replace the placeholder from Step 3.2) and `AdminHeader`.

### Step 5.3 — Dark mode QA

Open **every** page in dark mode. Fix any element that:
- has white or light backgrounds (usually a leftover legacy rule or `background: #fff`): replace with `var(--color-surface)`;
- has unreadable text (contrast < 4.5:1): use `--color-text` / `--color-text-muted`;
- uses `color: white` on primary: use `--color-on-primary`.

### Step 5.4 — Bangla font check

Fonts are already loaded in `styles/index.css`. Add `lang="en"` (already present) and check that a Bangla string (e.g. temporarily type "ডাক্তার খুঁজুন" in a search box) renders in Hind Siliguri. No code change needed if it renders correctly.

---

## PHASE 6 — Page redesigns (new UI)

These steps **add new visuals**. Keep all existing data hooks and API calls.

### Step 6.1 — Landing page at `/`

**Files:** new `src/public/home/HomePage.tsx` + `HomePage.module.css` + `components/` (Hero, SpecialtyGrid, HowItWorks, TrustStrip, CtaBanner, each with its own module).

**Route:** in `AppRouter.tsx`, change `<Route path="/" element={<Navigate to="/doctors" replace />} />` → `<Route path="/" element={<HomePage />} />`. (No e2e test visits `/`.)

**Sections (top → bottom):**

```text
┌──────────────────────────────────────────────────────────────┐
│ HERO (soft teal gradient background, large radius bottom)     │
│  Eyebrow: "Trusted healthcare across Bangladesh"              │
│  H1: "Book the right doctor, in minutes"                      │
│  Sub: chamber or video consultation, pay online, e-prescription│
│  [ 🔍 Search doctor or specialty ........ ] [Find doctors]   │ → navigates to /doctors?search=…
│  Chips: Cardiology · Pediatrics · Dermatology · Medicine …    │ → /doctors?specialty=<slug>
├──────────────────────────────────────────────────────────────┤
│ TRUST STRIP: 4 stats (Verified doctors · Hospitals · Video     │
│ consults · Secure payments by SSLCommerz) with lucide icons   │
├──────────────────────────────────────────────────────────────┤
│ SPECIALTIES GRID: cards with icon + name (from doctorsApi.     │
│ listSpecialties(); show 8, "View all" → /doctors)             │
├──────────────────────────────────────────────────────────────┤
│ HOW IT WORKS: 3 steps (Search → Book & pay → Consult & get     │
│ prescription), numbered circles, horizontal on ≥768px         │
├──────────────────────────────────────────────────────────────┤
│ VERIFY PRESCRIPTION CTA: card with ShieldCheck icon → link to │
│ /verify-prescription                                          │
├──────────────────────────────────────────────────────────────┤
│ CTA BANNER (primary background): "Are you a doctor? Join"     │
│ → /register                                                   │
└──────────────────────────────────────────────────────────────┘
```

- If `/doctors` doesn't read `?search=` / `?specialty=` from the URL yet, **only** in this step update `useDoctorSearch.ts` to initialise its `search`/`specialty` state from `useSearchParams()` (read-only initialisation; don't change fetching logic).
- Also change the PublicHeader logo link target from `/doctors` to `/`.

### Step 6.2 — Doctor search page

**Layout ≥ 1024px:** two columns: a **sticky filter sidebar** (280px, `top: calc(var(--header-height) + var(--space-4))`) and the results column.
**< 1024px:** filters collapse into a "Filters" `Button` (with an active-filter count badge) that opens a **Dialog** containing the same `DoctorSearchFilters`.

**Results header:** "N doctors found" (`Text tone="muted"`) + a clear-filters ghost button when `hasActiveFilters`.

**Loading:** replace `<Spinner label="Loading doctors…">` with a `Grid` of 6 `<SkeletonCard />`. Keep the text "Loading doctors…" in a `.sr-only` element for screen readers.

**Empty:** `<EmptyState icon={<SearchX/>} title="No doctors match your search." action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />`. Keep the exact sentence.

**DoctorCard redesign** (`DoctorCard.tsx/.module.css`):

```text
┌───────────────────────────────────────┐
│ (Avatar lg)  Dr. Name            ✓    │  ✓ = BadgeCheck icon if approved
│              Specialty (primary text) │
│              🏥 Hospital · 📍 Area     │
│ ───────────────────────────────────── │
│ ★ 4.8 (23)   🎥 Video  🏥 Chamber      │  badges only if data exists
│ ───────────────────────────────────── │
│ Fee  ৳800            [ View profile ] │  ButtonLink
└───────────────────────────────────────┘
```
`Card interactive padding="md"`. Only show fields that exist on the `PublicDoctor` type; **do not add API fields**.

### Step 6.3 — Doctor detail + booking flow

**Files:** `DoctorDetailPage.tsx/.module.css`, `DoctorProfileHeader`, `AvailabilityScheduleGrid`, `SlotHoldBanner`, `DoctorReviewsList`.

- **Layout ≥ 1024px:** left column (2/3) = profile header card, "About", chambers, reviews; right column (1/3) = **sticky booking card** containing the availability grid.
- **Profile header:** Avatar xl, name (h1), specialty, qualifications, hospital, a `DescriptionList` (Experience, Fee, Consultation modes), and a rating summary.
- **Availability grid:** day tabs (`Tabs`, one tab per date) → slot buttons in a 3-column grid (2 on mobile). Slot button states via data attributes: `data-state="available|held|disabled"`; the selected/held slot uses a primary background. Show the mode as a small icon (Video / Building).
- **Booking stepper** shown in the booking card once a hold exists. It's purely visual, driven by existing state: `1 Select slot → 2 Patient (self/family member) → 3 Payment → 4 Confirmed`. Build `src/shared/ui/Stepper/` (ol of steps with `data-status="complete|current|upcoming"`).
- **SlotHoldBanner:** warning-tone card with a `Timer` icon and a countdown in a big monospace font; when < 60s use the danger tone.
- **Reviews:** a stars component (`src/shared/ui/Rating/`) using lucide `Star` icons (filled with `--color-accent`).
- **Mobile:** the booking card becomes a bottom bar ("৳800 · Book appointment") that scrolls to the availability section.

### Step 6.4 — Patient & Doctor area shell (sidebar layout)

Create `src/layouts/DashboardLayout.tsx` (+ module), reusing the admin shell patterns (sidebar + content) but driven by a config array per role:

- **Patient nav:** Appointments `/appointments` (CalendarDays), Prescriptions `/prescriptions` (Pill), Medical reports `/reports` (FileText), Family members `/family-members` (Users).
- **Doctor nav:** Dashboard `/doctor` (LayoutDashboard), Appointments `/doctor/appointments` (CalendarCheck), Prescriptions `/doctor/prescriptions` (ClipboardPen).

In `AppRouter.tsx`, nest the PATIENT and DOCTOR `RoleRoute` groups inside a `<Route element={<DashboardLayout />}>`, still under `MainLayout`, so the public header stays. **Don't change any path.** On < 1024px the sidebar becomes a horizontal scrollable tab bar under the header.

### Step 6.5 — Appointment cards (patient & doctor)

`PatientAppointmentCard`, `ActiveAppointmentCard`, `PastAppointmentCard`:

```text
┌──────────────────────────────────────────────────────────────┐
│ ┌──────┐  Dr. Name / Patient name          [CONFIRMED badge] │
│ │ OCT  │  Specialty · 🎥 Video / 🏥 Chamber                   │
│ │  28  │  🕒 10:30 – 10:45 AM · Hospital/Chamber               │
│ └──────┘                                                      │
│ ──────────────────────────────────────────────────────────── │
│ [Join video] [Pay now] [Reschedule] [Cancel]   ← existing actions only │
└──────────────────────────────────────────────────────────────┘
```

- Date block: `--color-primary-soft` background, month in xs uppercase, day in 2xl bold.
- Badge tone from the shared `appointmentStatusTone`.
- Panels (Payment, Reschedule, Review, VideoSession) open **inline below the card** as today. Optionally convert the cancel confirmation to a `Dialog`, keeping the same text and the same API call.
- Group lists by "Upcoming" / "Past" using `Tabs` **only if** the page already separates them in its data; otherwise keep a single list.

### Step 6.6 — Doctor dashboard

- `DoctorDashboardHeader`: a greeting ("Good morning, Dr. X" based on the current hour) + application status badge + the existing action buttons.
- **Stat cards row** (`Grid min="200px"`): today's appointments, upcoming, completed, earnings. Use **only** data already in `useDoctorDashboard`; if a value isn't available, don't show that card.
- Sections (Profile, Schedule, Time off, Earnings) inside `Tabs` instead of one long page. Keep every section's content and forms unchanged.

### Step 6.7 — Admin overview

- `OverviewSummaryCards`: stat cards with an icon in a soft-tone circle, big number, label, and optional trend text.
- `TopSpecialtiesAndDoctors`: two `Card`s side by side ≥ 1024px; lists with rank number, name, and a horizontal bar (`width` via the CSS variable `--bar`) showing the relative count.
- Tables: wrap in `Card padding="none"` with a `CardHeader` (title + search/filter controls).

---

## PHASE 7 — Cleanup

### Step 7.1 — Delete legacy CSS

1. Confirm the section 4.6 greps return nothing.
2. Delete `src/styles/legacy/` and remove its imports from `src/styles/index.css`.
3. Build + visual check of every page.

### Step 7.2 — Remove the compatibility barrel

1. Find usages: `grep -rln 'components/ui"' src`.
2. Change every import to the `shared/ui` path.
3. Move `src/components/tests/Toast.test.tsx` → `src/shared/ui/Toast/Toast.test.tsx` (fix the import path).
4. Delete `src/components/`.

### Step 7.3 — Remove legacy token aliases

Delete the `LEGACY ALIASES` block in `tokens.css`, then run `grep -rnE "var\(--(bg|bg-color|surface|border|text|text-main|muted|text-muted|primary|primary-dark|primary-hover|danger|error|error-hover|error-bg|success|success-bg|warning|warning-bg|info|info-bg|accent|accent-bg|radius|app-shadow-lifted)\)" src`. Replace each hit with its `--color-*` / `--radius-md` / `--shadow-md` equivalent until the grep is empty.

### Step 7.4 — Remove "DokanBD" references and stale docs

- `grep -rn "DokanBD" frontend/` → update the comments to describe MediConnect only.
- Update `frontend/STRUCTURE.md` and `docs/FRONTEND_STRUCTURE.md` to describe the new `styles/` + `shared/ui` structure and the CSS rules from section 4.

---

## PHASE 8 — Final QA checklist

- [ ] `build`, `test`, `lint`, `lint:css` all pass.
- [ ] `npm --prefix frontend run test:e2e` passes (needs the backend running; see the root `README.md`).
- [ ] Every page checked at **360px, 768px, 1024px, 1280px**: no horizontal scroll except inside `Table`.
- [ ] Every page checked in **light and dark** mode.
- [ ] Keyboard only: every interactive element is reachable with Tab and shows a visible focus ring; Dialogs trap focus and close on Esc.
- [ ] Lighthouse (Chrome DevTools) on `/`, `/doctors`, `/doctors/:id`: Accessibility ≥ 95, Performance ≥ 85, Best Practices ≥ 95.
- [ ] Tap targets ≥ 44px on mobile.
- [ ] `prefers-reduced-motion: reduce` disables shimmer and modal animations.
- [ ] No console errors or React key warnings.

---

## Appendix A — Prompt template for the local AI

Copy this for each step:

```text
You are editing the MediConnect BD frontend at frontend/.
Read docs/UI_REDESIGN_PLAN.md sections 0, 1 and 4 (rules) first.
Now perform ONLY Step <X.Y> exactly as written. Do not do other steps.
Constraints: do not change visible text, hooks, API calls, routes, or backend files.
After editing, run:
  npm --prefix frontend run build && npm --prefix frontend test && npm --prefix frontend run lint
and fix any errors you introduced. Then show me a summary of changed files.
```

## Appendix B — Quick mapping cheat-sheet

| Old | New |
|---|---|
| `import { Button } from "../../components/ui"` | `import { Button } from "../../shared/ui"` |
| `<div className="page">` | `<Page>` |
| `<header className="page-header">…` | `<PageHeader eyebrow title description actions />` |
| `<p className="muted">` | `<Text tone="muted">` |
| `<span className="small muted">` | `<Text as="span" size="sm" tone="muted">` |
| `<div className="row">` | `<Cluster>` |
| `<div className="row space-between">` | `<Cluster justify="between">` |
| `<div className="stack">` | `<Stack>` |
| `<div className="grid">` | `<Grid min="280px">` |
| `<div className="filters">` | `<Cluster align="end" gap={3}>` |
| `<label className="field"><span>X</span><input/></label>` | `<FormField label="X"><Input/></FormField>` |
| `<table className="table">` | `<Table>` |
| `<dl className="facts">` | `<DescriptionList items={…} />` |
| `<button className="btn btn-secondary">` | `<Button variant="secondary">` |
| `<Link className="btn btn-primary" to=…>` | `<ButtonLink to=…>` |
| `<button className="btn-icon" aria-label=…>` | `<IconButton aria-label=…>` |
| `<div className="avatar">AB</div>` | `<Avatar name="…" />` |
| `style={{ marginTop: 8 }}` | module class `.x { margin-top: var(--space-2); }` |
| `color: #c53030` | `color: var(--color-danger)` |

## Appendix C — Changing the theme later

Edit only `tokens.css`, section 2 (semantic):

| Theme | `--color-primary` | `--color-primary-hover` | `--color-primary-soft` | `--color-accent` |
|---|---|---|---|---|
| Clinical Teal (default) | `#0D7A6F` | `#0A5F57` | `#EFFAF8` | `#F59E0B` |
| Trust Blue | `#2563EB` | `#1D4ED8` | `#EFF6FF` | `#14B8A6` |
| Mint + Navy | `#0F9D8A` | `#0B7A6B` | `#ECFBF8` | `#F97362` |
| Bangladesh Green | `#006A4E` | `#00553E` | `#E8F5F0` | `#F42A41` |

Add the new primitives in section 1, point the semantic tokens at them, and adjust the `[data-theme="dark"]` primary to a lighter shade of the same hue.
