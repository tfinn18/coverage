# Coverage

**Cover your network.** A private networking tracker for college students recruiting for internships: a
spreadsheet-style contact grid plus a weekly call calendar. In banking, your "coverage" is the people and
companies you're responsible for staying in touch with; this app is a student's coverage list.

**Live demo:** https://coverage-green.vercel.app

> Work in progress. Full documentation (screenshots, architecture, security model, design decisions) lands in a later phase.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
npm run dev                  # http://localhost:3000
```

Database setup: run the files in `supabase/migrations/` in order in the Supabase SQL Editor.

## Known limitations

### Email links must be opened in the same browser

Supabase's free plan only allows editing the auth email templates once you configure a custom SMTP
server, so Coverage uses Supabase's **default** confirmation and password-reset emails.

Those default emails use the PKCE flow: the link carries a one-time `code` that can only be exchanged
for a session in the **same browser** that requested the email (a secret "code verifier" is stored there).
What that means in practice:

- **Sign-up confirmation:** opening the link in the same browser signs you straight in. Opening it on
  another device or browser still confirms the email, but doesn't sign you in; you land on the log-in page
  with a note to log in, which works normally.
- **Password reset:** the link must be opened in the browser where you clicked "Send reset link".
  Otherwise you'll be asked to request a new link.
- **Email rate limit:** Supabase's built-in email sender only sends a few emails per hour per project.
  That's fine for a portfolio project, but a real launch would need custom SMTP.

**How to remove the limitation:** add custom SMTP in Supabase (Authentication → Emails → SMTP Settings;
a free tier from a provider like Resend or Brevo works), then change the two templates so their links
use a `token_hash`, which `/auth/confirm` already supports on any device:

```html
<!-- Confirm signup -->
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
<!-- Reset password -->
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

(The reset link uses `&` because its redirect URL already contains `?next=/reset-password`.)
