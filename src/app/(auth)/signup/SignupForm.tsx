"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OrDivider } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PasswordRules } from "@/components/auth/PasswordRules";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { friendlyAuthError } from "@/lib/auth/errors";
import { isPasswordValid } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/redirect";
import { siteOrigin } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTriedSubmit(true);
    setError(null);
    setExisting(false);
    if (!isPasswordValid(password)) {
      setError("Your password doesn't meet the requirements yet.");
      return;
    }
    setLoading(true);
    const trimmedEmail = email.trim();
    const { data, error } = await createClient().auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${siteOrigin()}/auth/confirm`,
        data: { full_name: name.trim() || null },
      },
    });
    setLoading(false);

    if (error) {
      setError(friendlyAuthError(error));
      setExisting(error.code === "user_already_exists" || error.code === "email_exists");
      return;
    }
    // Supabase hides whether an email is registered: an existing account comes back with no identities.
    if (data.user && data.user.identities?.length === 0) {
      setError(friendlyAuthError({ code: "user_already_exists" }));
      setExisting(true);
      return;
    }
    // If email confirmation is off, we're already signed in.
    if (data.session) {
      router.replace(safeNextPath(next));
      router.refresh();
      return;
    }
    router.push(`/check-email?email=${encodeURIComponent(trimmedEmail)}`);
  }

  return (
    <div>
      {error && (
        <Alert tone="error" className="mb-4">
          {error}
          {existing && (
            <>
              {" "}
              <Link href="/login" className="font-semibold underline underline-offset-2">
                Log in
              </Link>{" "}
              or{" "}
              <Link href="/forgot-password" className="font-semibold underline underline-offset-2">
                reset your password
              </Link>
              .
            </>
          )}
        </Alert>
      )}

      <GoogleButton next={next} onError={setError} />
      <OrDivider />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Optional. Shown only to you."
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={triedSubmit && !isPasswordValid(password) ? "Password doesn't meet the requirements." : null}
          hint={<PasswordRules password={password} />}
        />
        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-semibold text-ink underline underline-offset-2"
        >
          Log in
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted">
        By signing up you agree that this is a student project. See our{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy page
        </Link>
        .
      </p>
    </div>
  );
}
