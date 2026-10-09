import type { Metadata } from "next";

export const metadata: Metadata = { title: "Call Schedule" };

export default function CallsPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Call Schedule</h1>
      <div className="mt-6 rounded-lg border border-dashed border-rule-strong bg-surface p-10 text-center">
        <p className="text-sm text-muted">Your weekly call calendar will live here.</p>
      </div>
    </div>
  );
}
