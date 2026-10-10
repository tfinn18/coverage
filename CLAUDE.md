@AGENTS.md

# Coverage — project guide

"Cover your network." A private, multi-user networking tracker for students recruiting for internships:
a spreadsheet-style Contacts grid plus a weekly Call Schedule calendar.

## Stack
- Next.js 16 (App Router, `cacheComponents` on, `src/proxy.ts` instead of middleware), React 19, TypeScript, Tailwind CSS v4
- Supabase: Auth (email/password + Google) and Postgres with Row Level Security, via `@supabase/ssr`
- Vitest (unit + RLS tests), Playwright (one e2e test), GitHub Actions CI
- Hosting: Vercel Hobby. Everything must stay on free tiers. No paid APIs (no Claude API).

## Commands
- `npm run dev` — local dev server at http://localhost:3000
- `npm run lint` / `npm run typecheck` / `npm test` — ESLint, tsc, unit tests (`tests/unit`)
- `npm run test:rls` — proves users can't see each other's rows; needs `.env.local` with two test accounts
- `npm run build` — production build

## Layout
- `src/app/(auth)/*` — login, signup, forgot/reset password, check-email (public; logged-in users are redirected away from login/signup)
- `src/app/(app)/*` — contacts, calls, account (protected by `src/lib/supabase/proxy.ts`)
- `src/app/auth/{callback,confirm,signout}/route.ts` — OAuth code exchange, email-link verification, POST logout
- `src/lib/supabase/{client,server,proxy}.ts` — browser client, per-request server client, session refresh + route guard
- `src/lib/` — pure, framework-free logic (unit-tested): `contacts/` (stages, follow-up status, filter/sort, export),
  `csv/`, `linkedin/`. `src/lib/data/` — Supabase queries used by client components
- `src/components/ui` — shared primitives (Button, TextField, Alert, Menu, Dialog, Toast)
- `src/components/contacts` — the Contacts grid: `ContactsView` (state), `ContactsTable`/`ContactRow` (cells),
  `useAutosave` (debounced per-contact saves with retry)
- `src/lib/import/` — import candidates, duplicate detection (name + company), CSV mapping (LinkedIn Connections.csv
  or a tracker spreadsheet). `src/lib/pdf/` + `src/lib/linkedin/profile-pdf.ts` — pdf.js text → lines → profile fields
- `src/components/import` — Import dialog: PDF / CSV / URL sources, then an editable, windowed review table
- `tests/fixtures/` — sample LinkedIn PDFs (regenerate with `node scripts/make-pdf-fixtures.mjs`) and CSVs
- `supabase/migrations/*.sql` — schema source of truth; applied by pasting into the Supabase SQL Editor, in order
- `src/lib/database.types.ts` — hand-maintained DB types; update alongside migrations

## Conventions
- Security: RLS is the security boundary. Only the publishable/anon key is used anywhere — never the
  service role key (not in app code, scripts, or tests). Admin-like actions use `security definer` SQL
  functions scoped to `auth.uid()` (e.g. `delete_my_account()`).
- With Cache Components, anything reading cookies/session must sit inside `<Suspense>`; client components
  using `useSearchParams` also need a Suspense boundary.
- Server-side identity: use `supabase.auth.getUser()`/`getClaims()`, never trust `getSession()` on the server.
- `?next=` redirects always go through `safeNextPath()` (no open redirects).
- Styling: use the design tokens in `globals.css` (`bg-paper`, `bg-surface`, `text-ink`, `text-muted`, `border-rule`,
  `bg-navy`, `text-brass`, …). Dark mode is `data-theme="dark"` on `<html>`; Tailwind `dark:` follows it.
  Fonts: `font-serif` (Source Serif 4, headings/wordmark), `font-sans` (IBM Plex Sans), `font-mono` (IBM Plex Mono).
- User-facing errors are friendly sentences (see `src/lib/auth/errors.ts`), never raw API messages.
- Accessibility: labelled inputs, visible focus (global `:focus-visible` ring), keyboard-operable menus.
- Contacts grid: edits update local state immediately and save via `useAutosave` (debounced, merged per contact).
  Row order is recomputed only when sort/filter/search change or rows are added/removed, so rows never jump while
  typing. Cells carry `data-row`/`data-col` for keyboard navigation (Enter/Shift+Enter/arrows).
- Never read the clock (`Date.now()`, `new Date()`) during render in a component that can prerender; compute it in
  the browser (event handlers or after data loads). Server Supabase clients call `connection()` first.
- Imports: never scrape LinkedIn or call unofficial APIs; only parse files/links the user provides. Every import
  goes through the review step, skips duplicates, and LinkedIn imports start at Contacted with blank follow-up/notes.
  PDFs are parsed in the browser (pdf.js loaded lazily; worker copied to `public/` by `predev`/`prebuild`).
- CSV export neutralizes spreadsheet formulas (`=`, `+`, `-`, `@`) and round-trips with the generic CSV import.
- Env vars are documented in `.env.example`; `.env.local` is git-ignored.
