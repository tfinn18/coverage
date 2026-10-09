import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResendConfirmation } from "./ResendConfirmation";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Check your email to confirm your account"
      footer={
        <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
          Back to log in
        </Link>
      }
    >
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink-2">
        <Suspense fallback={<p>We sent you a confirmation link.</p>}>
          <ResendConfirmation />
        </Suspense>
      </div>
    </AuthShell>
  );
}
