import { forwardRef, useState, useId } from "react";
import Decimal from "decimal.js";
import { clsx } from "clsx";
import { Input } from "@/components/ui/Input";

export interface AmountInputProps {
  /** Valeur en format machine : "120000.50" */
  value: string;
  onChange: (val: string) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  id?: string;
  className?: string;
  /** Accessible label quand pas de prop label (ex: usage dans BNSplitter) */
  "aria-label"?: string;
}

/**
 * Formate une valeur machine "120000.50" → "120 000,50"
 * Utilise Intl avec espace fine pour les milliers (fr-FR → espace narrow).
 */
function toDisplayValue(machineValue: string): string {
  if (!machineValue || machineValue === "") return "";
  try {
    const dec = new Decimal(machineValue);
    const num = dec.toNumber();
    const decPlaces = dec.isInteger() ? 0 : dec.decimalPlaces();
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: decPlaces,
      maximumFractionDigits: decPlaces,
      useGrouping: true,
    }).format(num);
  } catch {
    return machineValue;
  }
}

/**
 * Normalise la saisie utilisateur → format machine "120000.50"
 * Accepte virgule ou point comme séparateur décimal.
 * Renvoie "" si la valeur est vide ou invalide.
 */
function toMachineValue(displayValue: string): string {
  if (!displayValue || displayValue.trim() === "") return "";
  // Supprime les séparateurs de milliers (espaces, points groupement)
  // Remplace virgule → point
  const cleaned = displayValue
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    // Supprime les points groupement (ex: "1.200.000" → "1200000")
    .replace(/\.(?=\d{3})/g, "");
  try {
    const dec = new Decimal(cleaned);
    return dec.toFixed(dec.isInteger() ? 0 : dec.decimalPlaces());
  } catch {
    return "";
  }
}

/**
 * Input numérique formaté FR.
 * - Affiche "120 000,50 DH" au repos (blur)
 * - Affiche la valeur brute pendant la saisie (focus)
 * - Stocke la valeur en format machine "120000.50"
 * - Utilise decimal.js pour la normalisation
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      value,
      onChange,
      currency = "DH",
      placeholder = "0",
      disabled = false,
      error,
      label,
      id,
      className,
      "aria-label": ariaLabelProp,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    const [focused, setFocused] = useState(false);
    // Valeur temporaire pendant la saisie (format utilisateur)
    const [rawInput, setRawInput] = useState("");

    const displayValue = focused ? rawInput : toDisplayValue(value);
    const hasError = Boolean(error);

    const handleFocus = () => {
      setFocused(true);
      // En focus : affiche la valeur non-formatée (pour edition facile)
      setRawInput(value ? value.replace(".", ",") : "");
    };

    const handleBlur = () => {
      setFocused(false);
      const machine = toMachineValue(rawInput);
      onChange(machine);
      setRawInput("");
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setRawInput(raw);
      // Met à jour en temps réel pour que le parent ait toujours la valeur
      const machine = toMachineValue(raw);
      onChange(machine);
    };

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
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            hasError={hasError}
            aria-label={ariaLabelProp ?? label}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={clsx(
              "text-right font-mono tabular-nums",
              currency && "pr-10"
            )}
          />
          {currency && (
            <span
              aria-hidden="true"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted font-mono pointer-events-none"
            >
              {currency}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-negative">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";
