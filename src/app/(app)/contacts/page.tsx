import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Contacts</h1>
      <div className="mt-6 rounded-lg border border-dashed border-rule-strong bg-surface p-10 text-center">
        <p className="text-sm text-muted">Your coverage list will live here. The contacts grid arrives in the next build phase.</p>
      </div>
    </div>
  );
}
