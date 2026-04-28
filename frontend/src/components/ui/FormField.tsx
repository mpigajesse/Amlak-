import type { ReactNode } from "react";
import { clsx } from "clsx";

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Conteneur de champ de formulaire.
 * - Label en uppercase 10px (convention Amlak)
 * - Message d'erreur en rouge (--negative)
 * - Hint en --ink-muted quand pas d'erreur
 */
export function FormField({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-negative" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error ? (
        <p role="alert" className="text-xs text-negative font-sans">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-muted font-sans">{hint}</p>
      ) : null}
    </div>
  );
}
