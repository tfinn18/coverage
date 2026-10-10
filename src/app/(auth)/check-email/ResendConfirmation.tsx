"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { friendlyAuthError } from "@/lib/auth/errors";
import { siteOrigin } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/client";

export function ResendConfirmation() {
  const email = useSearchParams().get("email") ?? "";
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${siteOrigin()}/auth/confirm` },
    });
    setLoading(false);
    setStatus(error ? { tone: "error", text: friendlyAuthError(error) } : { tone: "success", text: "Sent! Check your inbox." });
  }

  return (
    <>
      <p>
        We sent a confirmation link to{" "}
        {email ? <strong className="font-semibold text-ink">{email}</strong> : "your email address"}. Click it to
        activate your account. Open it in this browser to land straight in the app.
      </p>
      <p className="text-muted">Don&apos;t see it after a minute? Check your spam or promotions folder.</p>
      {status && <Alert tone={status.tone}>{status.text}</Alert>}
      {email && (
        <Button variant="secondary" onClick={resend} loading={loading} className="self-start">
          Resend confirmation email
        </Button>
      )}
    </>
  );
}
