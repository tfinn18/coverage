import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Free, private, and yours alone. Cover your network.">
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
