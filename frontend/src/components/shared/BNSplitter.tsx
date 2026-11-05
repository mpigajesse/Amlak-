import { useId } from "react";
import Decimal from "decimal.js";
import { clsx } from "clsx";
import { AmountInput } from "./AmountInput";
import { MoneyDisplay } from "./MoneyDisplay";
import { LIBELLE_BLANC, LIBELLE_NOIR } from "@/lib/libelles";

export interface BNValue {
  blanc: string;
  noir: string;
}

export interface BNSplitterProps {
  value: BNValue;
  onChange: (v: BNValue) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Composant clé de l'app Amlak.
 * Saisie couplée Blanc + Noir avec total calculé automatiquement.
 *
 * - Blanc = montant officiel (vert sauge)
 * - Noir = montant non déclaré (brun grisé)
 * - Total = calculé via decimal.js, jamais stocké
 * - Validation : blanc + noir > 0
 */
export function BNSplitter({
  value,
  onChange,
  label,
  error,
  disabled = false,
  className,
}: BNSplitterProps) {
  const legendId = useId();

  // Calcul du total via decimal.js (jamais de float)
  let total: string;
  try {
    const blanc = new Decimal(value.blanc || "0");
    const noir = new Decimal(value.noir || "0");
    const sum = blanc.plus(noir);
    total = sum.isZero() ? "" : sum.toFixed(sum.isInteger() ? 0 : 2);
  } catch {
    total = "";
  }

  const handleBlancChange = (blanc: string) => {
    onChange({ ...value, blanc });
  };

  const handleNoirChange = (noir: string) => {
    onChange({ ...value, noir });
  };

  const hasError = Boolean(error);

  return (
    <fieldset
      className={clsx("flex flex-col gap-3", className)}
      aria-describedby={error ? `${legendId}-error` : undefined}
    >
      {label && (
        <legend
          id={legendId}
          className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted"
        >
          {label}
        </legend>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Blanc */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] uppercase tracking-[0.12em] font-medium"
            style={{ color: "var(--blanc)" }}
          >
            {LIBELLE_BLANC}
          </span>
          <AmountInput
            value={value.blanc}
            onChange={handleBlancChange}
            placeholder="0"
            disabled={disabled}
            aria-label={`Montant ${LIBELLE_BLANC.toLowerCase()}`}
          />
        </div>

        {/* Noir */}
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] uppercase tracking-[0.12em] font-medium"
            style={{ color: "var(--noir)" }}
          >
            {LIBELLE_NOIR}
          </span>
          <AmountInput
            value={value.noir}
            onChange={handleNoirChange}
            placeholder="0"
            disabled={disabled}
            aria-label={`Montant ${LIBELLE_NOIR.toLowerCase()}`}
          />
        </div>
      </div>

      {/* Total (readonly, calculé) */}
      <div
        className={clsx(
          "flex items-center justify-between",
          "px-3 py-2.5 rounded",
          "bg-bg-subtle border",
          hasError ? "border-negative" : "border-line"
        )}
        aria-live="polite"
        aria-label="Total"
      >
        <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted">
          Total
        </span>
        {total ? (
          <MoneyDisplay
            value={total}
            currency="DH"
            positive={undefined}
            className="text-sm text-ink"
          />
        ) : (
          <span className="font-mono tabular-nums text-sm text-ink-muted">
            0 DH
          </span>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <p
          id={`${legendId}-error`}
          role="alert"
          className="text-xs text-negative"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
