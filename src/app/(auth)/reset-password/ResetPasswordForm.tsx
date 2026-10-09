"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasswordRules } from "@/components/auth/PasswordRules";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { URL_ERROR_MESSAGES, friendlyAuthError } from "@/lib/auth/errors";
import { isPasswordValid } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The emailed link signs the user in with a short-lived recovery session.
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPasswordValid(password)) return setError("Your password doesn't meet the requirements yet.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(friendlyAuthError(error));
    router.replace("/contacts?passwordUpdated=1");
    router.refresh();
  }

  if (hasSession === null) {
    return (
      <div className="flex justify-center py-6 text-muted">
        <Spinner label="Checking your reset link" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <Alert tone="error">
        {URL_ERROR_MESSAGES.session_expired}{" "}
        <Link href="/forgot-password" className="font-semibold underline underline-offset-2">
          Request a new link
        </Link>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={<PasswordRules password={password} />}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={confirm && password !== confirm ? "Passwords don't match." : null}
      />
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Update password
      </Button>
    </form>
  );
}
