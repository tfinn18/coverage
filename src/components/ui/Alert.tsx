import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info" | "warning";

const TONES: Record<Tone, string> = {
  error: "border-danger/40 bg-danger-soft text-danger",
  success: "border-success/40 bg-success-soft text-success",
  info: "border-rule-strong bg-surface-2 text-ink",
  warning: "border-warning/40 bg-warning-soft text-warning",
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-3 py-2.5 text-sm leading-relaxed", TONES[tone], className)}
    >
      {children}
    </div>
  );
}
