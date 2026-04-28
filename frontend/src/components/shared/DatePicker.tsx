import { forwardRef, useId } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { clsx } from "clsx";
import { Input } from "@/components/ui/Input";

export interface DatePickerProps {
  /** Valeur ISO YYYY-MM-DD ou null */
  value: string | null;
  onChange: (v: string | null) => void;
  label?: string;
  error?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Formate une date ISO "YYYY-MM-DD" en format français court "24 avr. 2026"
 * pour l'affichage en aria-label et titre.
 */
function formatFR(iso: string): string {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

/**
 * Wrapper autour de <input type="date"> stylé avec locale fr-MA.
 * - Valeur stockée en ISO YYYY-MM-DD
 * - Affichage FR via le navigateur (natif) + aria-label FR
 * - forwardRef expose l'input natif
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      min,
      max,
      placeholder = "jj/mm/aaaa",
      disabled = false,
      id,
      className,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasError = Boolean(error);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val || null);
    };

    const ariaLabel = value
      ? `Date sélectionnée : ${formatFR(value)}`
      : "Sélectionner une date";

    return (
      <div className={clsx("flex flex-col gap-1", className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted"
          >
            {label}
          </label>
        )}
        <Input
          ref={ref}
          id={inputId}
          type="date"
          value={value ?? ""}
          onChange={handleChange}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          hasError={hasError}
          aria-label={ariaLabel}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : undefined}
          lang="fr-MA"
          className="font-mono tabular-nums"
        />
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-negative"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
