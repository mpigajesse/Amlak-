import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

/**
 * Input primitif de l'UI kit Amlak.
 * - Hauteur 40px (py-2.5 + text-sm)
 * - Bordure --line au repos, --accent au focus, --negative en erreur
 * - Label positionné au-dessus (jamais flottant)
 * - Placeholder en --ink-muted
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full rounded bg-bg border px-3 py-2.5",
          "text-sm text-ink font-sans",
          "placeholder:text-ink-muted",
          "transition-colors",
          "focus:outline-none",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-bg-subtle",
          "read-only:bg-bg-subtle read-only:border-line",
          hasError
            ? "border-negative focus:border-negative"
            : "border-line hover:border-line-strong focus:border-accent",
          className
        )}
        style={{ transitionDuration: "var(--transition-fast)" }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
