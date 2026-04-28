import Decimal from "decimal.js";
import { clsx } from "clsx";
import { formatMoney } from "@/lib/format";

export interface MoneyDisplayProps {
  /** Montant : string machine "120000.50", number ou instance Decimal */
  value: string | number | Decimal;
  currency?: string;
  /**
   * Affichage de la couleur selon le signe :
   * - undefined (défaut) : auto-detect (vert si positif, rouge si négatif, neutre si zéro)
   * - true : force couleur positive (vert)
   * - false : force couleur négative (rouge)
   */
  positive?: boolean;
  /** Format compact : 120 000 → 120k */
  compact?: boolean;
  className?: string;
}

/**
 * Affichage readonly d'un montant formaté en français.
 * Format : "120 000 DH" ou "120 000,50 DH"
 * Couleur auto selon signe si prop `positive` non fournie.
 */
export function MoneyDisplay({
  value,
  currency = "DH",
  positive,
  compact = false,
  className,
}: MoneyDisplayProps) {
  let dec: Decimal;
  try {
    dec = value instanceof Decimal ? value : new Decimal(String(value));
  } catch {
    dec = new Decimal(0);
  }

  const numVal = dec.toNumber();

  // Détermine la couleur
  let colorClass: string;
  if (positive === true) {
    colorClass = "text-positive";
  } else if (positive === false) {
    colorClass = "text-negative";
  } else {
    // Auto-detect selon le signe
    if (numVal > 0) {
      colorClass = "text-positive";
    } else if (numVal < 0) {
      colorClass = "text-negative";
    } else {
      colorClass = "text-ink";
    }
  }

  let formattedAmount: string;
  if (compact) {
    const abs = Math.abs(numVal);
    const sign = numVal < 0 ? "− " : "";
    if (abs >= 1_000_000) {
      formattedAmount = `${sign}${formatMoney(abs / 1_000_000)}M`;
    } else if (abs >= 1_000) {
      formattedAmount = `${sign}${formatMoney(abs / 1_000)}k`;
    } else {
      formattedAmount = `${sign}${formatMoney(abs)}`;
    }
  } else {
    formattedAmount = formatMoney(String(value));
  }

  return (
    <span
      className={clsx(
        "font-mono tabular-nums",
        colorClass,
        className
      )}
    >
      {formattedAmount}
      {currency && <span className="ml-1">{currency}</span>}
    </span>
  );
}
