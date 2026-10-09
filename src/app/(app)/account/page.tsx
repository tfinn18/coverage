import type { Metadata } from "next";
import { AccountSettings } from "./AccountSettings";

export const metadata: Metadata = { title: "Account settings" };

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Account settings</h1>
      <p className="mt-1 text-sm text-muted">Manage your name, password, and account.</p>
      <AccountSettings />
    </div>
  );
}
