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
- `npm run test:e2e` — Playwright: one end-to-end flow plus axe accessibility scans (light + dark) on every page;
  starts/reuses the dev server and signs in as test account A
- `npm run build` — production build
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and build on every push. RLS and e2e tests
  need the real Supabase project and test accounts, so they run locally.

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
- `src/components/calls` — Call Schedule: `CallsView` (state + actions), `WeekCalendar` (FullCalendar v6, loaded
  client-only via `next/dynamic`), `ReadyPanel` (drag sources), `CallPopover`, `BookDialog` (keyboard booking).
  Pure helpers in `src/lib/calls/` (Ready/Coming up lists, slot math, Google Calendar link)
- `src/components/notes` — the notes panel (`NotesPanel`, `ListEditor`, `AutoTextarea`). The document format and
  pure helpers (plain-text copy, list editing, Gmail/mailto links) live in `src/lib/notes/doc.ts`; queries in `src/lib/data/notes.ts`
- `docs/DEPLOYMENT.md` — production setup and post-deploy smoke-test checklist; `docs/screenshots/` — README images
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
- Example data (`src/lib/examples.ts`): fictional people at fictional firms, `is_example = true`, tagged in the UI
  and removable in one click. Landing-page screenshots in `public/screenshots/` are captured from it (never show a
  real email; swap it for you@example.com).
- Theme: `ThemeToggle`/`toggleTheme()` set `data-theme` and save it to localStorage; the inline script in the root
  layout applies it before paint.
- Never read the clock (`Date.now()`, `new Date()`) during render in a component that can prerender; compute it in
  the browser (event handlers or after data loads). Server Supabase clients call `connection()` first.
- Notes: the grid never edits notes inline. `contact_notes.doc` (JSON, parsed with `parseNotesDoc`) is the source of
  truth; `contacts.notes` is its plain-text copy (`notesToText`), rewritten on every save and used for preview,
  search, CSV export and the call popover. Imported or legacy free-text notes become Notes bullets
  (`notesDocFromText`). The document is version 2; `parseNotesDoc` converts version 1 on read (Key advice, About the
  firm, What I asked for → Notes; Prep's Why [company]? → Call notes), so no SQL migration was needed. The panel is keyed by contact id and flushes pending saves when it closes or switches.
- Calendar: FullCalendar is pinned to v6.1.x (MIT core + interaction plugin only; no premium plugins). Calls are
  30 minutes. Booking someone at Contacted promotes them to Call scheduled. Theme overrides live under
  `.coverage-calendar` in `globals.css`. Every drag interaction has a keyboard/tap alternative (Book…, Change time).
- Imports: never scrape LinkedIn or call unofficial APIs; only parse files/links the user provides. Every import
  goes through the review step, skips duplicates, and LinkedIn imports start at Contacted with blank follow-up/notes.
  PDFs are parsed in the browser (pdf.js loaded lazily; worker copied to `public/` by `predev`/`prebuild`).
- CSV export neutralizes spreadsheet formulas (`=`, `+`, `-`, `@`) and round-trips with the generic CSV import.
- Env vars are documented in `.env.example`; `.env.local` is git-ignored.
