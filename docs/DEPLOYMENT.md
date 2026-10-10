# Deployment checklist

Everything Coverage needs to run in production, all on free tiers. Use it when setting up a new environment or
checking the live one.

## Supabase

- [ ] Migrations `0001` → `0004` in `supabase/migrations/` have been run, in order, in the SQL Editor.
- [ ] **Authentication → URL Configuration**
  - Site URL: `https://coverage-green.vercel.app`
  - Redirect URLs: `https://coverage-green.vercel.app/**` and `http://localhost:3000/**`
- [ ] **Authentication → Sign In / Providers → Google** is enabled with the Google client ID and secret.
- [ ] **Authentication → Sign In / Providers → Email**: "Confirm email" is on.
- [ ] Only the **publishable** key is used anywhere. The secret / service role key is not in Vercel, GitHub, or
      `.env.local`.
- [ ] Two test users exist (Authentication → Users), used only by `npm run test:rls` and `npm run test:e2e`.
- [ ] Remember: free projects pause after about a week of inactivity. Restore from the dashboard if the site shows
      "We couldn't load your contacts".

## Google Cloud (OAuth)

- [ ] OAuth client type **Web application**.
- [ ] Authorized JavaScript origins: `https://coverage-green.vercel.app`, `http://localhost:3000`.
- [ ] Authorized redirect URI: `https://lsueqwmeheanuqyrrqff.supabase.co/auth/v1/callback`.
- [ ] Google Auth Platform → **Audience** is published ("In production"), so anyone can sign in. Only the basic
      scopes (email, profile, openid) are requested, so no verification is required.

## Vercel

- [ ] Project is connected to `tfinn18/coverage`, production branch `main`.
- [ ] Environment variables (Production and Preview):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] No `TEST_USER_*` variables are set on Vercel.
- [ ] Build command is the default (`npm run build`). Its `prebuild` step copies the pdf.js worker into `public/`.

## GitHub

- [ ] CI (Actions tab) is green on `main`.
- [ ] No secrets are committed: `.env.local` is git-ignored, and `git log -p | grep -i service_role` finds nothing.
- [ ] Repository description, website link (`https://coverage-green.vercel.app`) and topics are set on the repo page.

## Smoke test after each deploy

Automated: `E2E_BASE_URL=https://coverage-green.vercel.app npm run test:e2e` (10 tests: sign-in redirect, add/edit/
delete a contact, calendar panel, and accessibility scans of every page).

By hand, about 5 minutes:

- [ ] Landing page loads with screenshots; the dark mode toggle works.
- [ ] Sign up with a new email → "Check your email" → the link (same browser) lands in Contacts.
- [ ] Log out → **Continue with Google** → lands in Contacts with your Google photo in the header.
- [ ] Open `/calls` while logged out → log in → you're returned to `/calls`.
- [ ] **Try with example data** → contacts, follow-up flags, and calls appear → **Remove example data**.
- [ ] Import a real LinkedIn **Save to PDF** profile and check the name, company, and title.
- [ ] Drag a "Call scheduled" contact onto the calendar; open the call → **Add to Google Calendar**.
- [ ] **Export CSV** opens correctly in Excel or Google Sheets.
- [ ] Account settings → delete a throwaway account → its data is gone.
