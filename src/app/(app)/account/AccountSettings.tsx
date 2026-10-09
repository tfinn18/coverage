"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasswordRules } from "@/components/auth/PasswordRules";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { friendlyAuthError } from "@/lib/auth/errors";
import { isPasswordValid } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/client";

type Status = { tone: "success" | "error"; text: string } | null;

function Section({ title, description, children, danger = false }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
      className={`mt-6 rounded-lg border bg-surface p-5 sm:p-6 ${danger ? "border-danger/50" : "border-rule"}`}
    >
      <h2
        id={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
        className={`text-base font-semibold ${danger ? "text-danger" : "text-ink"}`}
      >
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .maybeSingle();
        setName(profile?.full_name ?? "");
      }
      setLoaded(true);
    })();
  }, []);

  if (!loaded) {
    return (
      <div className="mt-10 flex justify-center text-muted">
        <Spinner label="Loading your account" />
      </div>
    );
  }
  if (!user) return <Alert tone="error" className="mt-6">We couldn&apos;t load your account. Please log in again.</Alert>;

  const hasPassword = user.identities?.some((i) => i.provider === "email") ?? false;

  return (
    <>
      <NameSection userId={user.id} initialName={name} email={user.email ?? ""} />
      <PasswordSection email={user.email ?? ""} hasPassword={hasPassword} />
      <DeleteSection />
    </>
  );
}

function NameSection({ userId, initialName, email }: { userId: string; initialName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const { error } = await createClient()
      .from("profiles")
      .update({ full_name: name.trim() || null })
      .eq("id", userId);
    setSaving(false);
    if (error) setStatus({ tone: "error", text: "We couldn't save your name. Please try again." });
    else {
      setStatus({ tone: "success", text: "Name saved." });
      router.refresh();
    }
  }

  return (
    <Section title="Profile" description={`Signed in as ${email}.`}>
      <form onSubmit={save} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <TextField
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          maxLength={120}
        />
        <Button type="submit" loading={saving} disabled={name === initialName && !status}>
          Save name
        </Button>
      </form>
      {status && <Alert tone={status.tone} className="mt-3">{status.text}</Alert>}
    </Section>
  );
}

function PasswordSection({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!isPasswordValid(password)) return setStatus({ tone: "error", text: "Your new password doesn't meet the requirements yet." });
    if (password !== confirm) return setStatus({ tone: "error", text: "The two new passwords don't match." });

    setSaving(true);
    const supabase = createClient();
    if (hasPassword) {
      // Confirm it's really them before changing the password.
      const { error } = await supabase.auth.signInWithPassword({ email, password: current });
      if (error) {
        setSaving(false);
        return setStatus({ tone: "error", text: "Your current password is incorrect." });
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setStatus({ tone: "error", text: friendlyAuthError(error) });
    setCurrent("");
    setPassword("");
    setConfirm("");
    setStatus({ tone: "success", text: hasPassword ? "Password changed." : "Password set. You can now also log in with your email." });
  }

  return (
    <Section
      title="Password"
      description={hasPassword ? "Change the password you use to log in." : "You sign in with Google. Optionally set a password to log in with email too."}
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        {hasPassword && (
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
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
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        <Button type="submit" loading={saving} className="self-start">
          {hasPassword ? "Change password" : "Set password"}
        </Button>
      </form>
    </Section>
  );
}

const CONFIRM_PHRASE = "delete my account";

function DeleteSection() {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === CONFIRM_PHRASE;

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setDeleting(false);
      return setError("We couldn't delete your account. Please try again.");
    }
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login?deleted=1");
    router.refresh();
  }

  return (
    <Section
      title="Delete my account"
      danger
      description="Permanently deletes your account, all your contacts, and all scheduled calls. This can't be undone."
    >
      <form onSubmit={remove} className="flex flex-col gap-4">
        <TextField
          label={`Type "${CONFIRM_PHRASE}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" variant="danger" disabled={!matches} loading={deleting} className="self-start">
          Delete my account
        </Button>
      </form>
    </Section>
  );
}
