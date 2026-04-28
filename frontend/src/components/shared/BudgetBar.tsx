import Decimal from "decimal.js";
import { clsx } from "clsx";
import { formatMoney } from "@/lib/format";

export interface BudgetBarProps {
  /** Montant consommé en format machine string */
  consumed: string;
  /** Budget total en format machine string */
  budget: string;
  label?: string;
  category?: string;
  className?: string;
}

type BudgetState = "ok" | "warn" | "over";

function computePercent(consumed: string, budget: string): number {
  try {
    const b = new Decimal(budget || "0");
    if (b.isZero()) return 0;
    const c = new Decimal(consumed || "0");
    return c.div(b).mul(100).toNumber();
  } catch {
    return 0;
  }
}

/**
 * Barre de progression de budget par catégorie.
 * - Vert si < 80 %
 * - Jaune entre 80 % et 100 %
 * - Rouge si > 100 %
 */
export function BudgetBar({
  consumed,
  budget,
  label,
  category,
  className,
}: BudgetBarProps) {
  const pct = computePercent(consumed, budget);
  const pctRounded = Math.round(pct);
  const widthPct = Math.min(pct, 100);

  const state: BudgetState =
    pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";

  const barColor = clsx(
    "h-full rounded-sm transition-all",
    {
      "bg-accent": state === "ok",
      "bg-warning": state === "warn",
      "bg-negative": state === "over",
    }
  );

  const title = label ?? category;

  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {title && (
        <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted">
          {title}
        </span>
      )}

      {/* Barre */}
      <div
        className="h-1.5 bg-line rounded-sm overflow-hidden"
        role="progressbar"
        aria-valuenow={pctRounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={title ? `Budget ${title} : ${pctRounded}%` : `Budget : ${pctRounded}%`}
      >
        <div
          className={barColor}
          style={{ width: `${widthPct}%`, transitionDuration: "var(--transition)" }}
        />
      </div>

      {/* Légende */}
      <div className="flex items-center justify-between font-mono tabular-nums text-xs text-ink-muted">
        <span>
          {formatMoney(consumed)} DH
        </span>
        <span
          className={clsx("font-medium", {
            "text-ink-muted": state === "ok",
            "text-warning": state === "warn",
            "text-negative": state === "over",
          })}
        >
          {pctRounded} %
        </span>
        <span>
          / {formatMoney(budget)} DH
        </span>
      </div>
    </div>
  );
}
