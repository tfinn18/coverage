"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { URL_ERROR_MESSAGES, friendlyAuthError } from "@/lib/auth/errors";
import { siteOrigin } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const urlError = useSearchParams().get("error");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(urlError ? (URL_ERROR_MESSAGES[urlError] ?? null) : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const trimmed = email.trim();
    const { error } = await createClient().auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${siteOrigin()}/auth/confirm?next=/reset-password`,
    });
    setLoading(false);
    if (error) setError(friendlyAuthError(error));
    else setSentTo(trimmed);
  }

  if (sentTo) {
    return (
      <Alert tone="success">
        If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. Open it in this browser; it expires in one hour.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
