"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OrDivider } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { URL_ERROR_MESSAGES, friendlyAuthError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { siteOrigin } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? (URL_ERROR_MESSAGES[urlError] ?? null) : null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    params.get("signedOut")
      ? "You've been logged out."
      : params.get("deleted")
        ? "Your account and all of its data have been deleted."
        : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setNeedsConfirm(false);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setError(friendlyAuthError(error));
      setNeedsConfirm(error.code === "email_not_confirmed");
      return;
    }
    router.replace(safeNextPath(next));
    router.refresh();
  }

  async function resendConfirmation() {
    setError(null);
    const { error } = await createClient().auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${siteOrigin()}/auth/confirm` },
    });
    if (error) setError(friendlyAuthError(error));
    else setNotice(`We sent a new confirmation link to ${email.trim()}.`);
    setNeedsConfirm(false);
  }

  return (
    <div>
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      {error && (
        <Alert tone="error" className="mb-4">
          {error}
          {needsConfirm && (
            <>
              {" "}
              <button type="button" onClick={resendConfirmation} className="font-semibold underline underline-offset-2">
                Resend the email
              </button>
            </>
          )}
        </Alert>
      )}

      <GoogleButton next={next} onError={setError} />
      <OrDivider />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          labelAside={
            <Link href="/forgot-password" className="text-xs font-medium text-brass underline-offset-2 hover:underline">
              Forgot password?
            </Link>
          }
        />
        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to Coverage?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-semibold text-ink underline underline-offset-2"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
