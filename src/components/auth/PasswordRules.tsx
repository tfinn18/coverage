import { checkPassword } from "@/lib/auth/password";
import { cn } from "@/lib/cn";

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="mt-1 grid gap-1 text-xs" aria-label="Password requirements">
      {checkPassword(password).map((rule) => (
        <li key={rule.id} className={cn("flex items-center gap-1.5", rule.passed ? "text-success" : "text-muted")}>
          <span aria-hidden="true" className="inline-block w-3 text-center font-semibold">
            {rule.passed ? "✓" : "•"}
          </span>
          {rule.label}
          <span className="sr-only">{rule.passed ? "(met)" : "(not met yet)"}</span>
        </li>
      ))}
    </ul>
  );
}
