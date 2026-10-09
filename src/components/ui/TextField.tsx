import { useId } from "react";
import { cn } from "@/lib/cn";

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  /** Rendered to the right of the label, e.g. a "Forgot password?" link. */
  labelAside?: React.ReactNode;
};

export const inputClasses =
  "h-10 w-full rounded-md border border-rule-strong bg-surface px-3 text-sm text-ink placeholder:text-muted " +
  "focus:border-focus focus:outline-2 focus:outline-offset-0 focus:outline-focus " +
  "aria-[invalid=true]:border-danger disabled:opacity-60";

export function TextField({ label, hint, error, labelAside, id, className, ...props }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        {labelAside}
      </div>
      <input
        id={inputId}
        className={inputClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {hint && (
        <div id={hintId} className="text-xs text-muted">
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
