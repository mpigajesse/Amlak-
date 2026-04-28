/**
 * HeroCash — Position cash courante avec sparkline 30j.
 * Composant principal du dashboard cash-first.
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import Decimal from "decimal.js";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatDate } from "@/lib/format";
import { useDashboardCashPosition, useDashboardSparkline } from "@/api/dashboard";

// ── Tooltip personnalisé ──────────────────────────────────────────────────────

function SparkTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const rawVal = payload[0]?.value ?? 0;
  const val = typeof rawVal === "number" ? rawVal : Number(rawVal) || 0;
  const label = (payload[0]?.payload as { date?: string } | undefined)?.date ?? "";
  return (
    <div className="bg-bg-card border border-line rounded px-2.5 py-1.5 shadow text-xs font-mono tabular-nums">
      <div className="text-ink-muted mb-0.5">
        {label ? formatDate(label, "long") : ""}
      </div>
      <div className={clsx(val >= 0 ? "text-positive" : "text-negative")}>
        {formatMoney(String(val))} DH
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export interface HeroCashProps {
  className?: string;
}

export function HeroCash({ className }: HeroCashProps) {
  const { data: position, isLoading: posLoading, error: posError } = useDashboardCashPosition();
  const { data: sparkline, isLoading: sparkLoading } = useDashboardSparkline();

  const totalDec = useMemo(() => {
    if (!position) return null;
    try {
      return new Decimal(position.total);
    } catch {
      return null;
    }
  }, [position]);

  const totalNum = totalDec?.toNumber() ?? 0;
  const isPositive = totalNum > 0;
  const isNegative = totalNum < 0;

  const totalColorClass = isPositive
    ? "text-positive"
    : isNegative
    ? "text-negative"
    : "text-ink";

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  if (posLoading) {
    return (
      <Card className={clsx("w-full", className)} aria-label="Position cash en chargement">
        <CardContent className="pt-5">
          <div className="flex flex-col gap-4">
            <Skeleton variant="text" className="w-40 h-5" />
            <Skeleton variant="rect" className="w-72 h-16" />
            <div className="flex gap-3">
              <Skeleton variant="rect" className="w-32 h-7" />
              <Skeleton variant="rect" className="w-32 h-7" />
            </div>
            <Skeleton variant="rect" className="w-full h-14" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Erreur ────────────────────────────────────────────────────────────────

  if (posError || !position) {
    return (
      <Card className={clsx("w-full", className)}>
        <CardContent>
          <EmptyState
            icon={RefreshCw}
            title="Impossible de charger la position cash"
            description="Vérifiez votre connexion et rechargez la page."
            className="py-10"
          />
        </CardContent>
      </Card>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  const hasNoData =
    position.total === "0" ||
    position.total === "0.00" ||
    (!position.in.total && !position.out.total);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className={clsx("w-full", className)} aria-label="Position cash courante">
      <CardContent className="pt-6 pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          {/* Gauche : chiffres clés */}
          <div className="flex flex-col gap-3 min-w-0">
            {/* Label */}
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-ink-muted">
              Position cash
            </span>

            {/* Montant total */}
            <div className="flex items-end gap-2.5">
              <span
                className={clsx(
                  "font-display tabular-nums leading-none tracking-tight",
                  "[font-size:clamp(2.5rem,5vw,4.5rem)]",
                  totalColorClass
                )}
                aria-label={`Position cash totale : ${formatMoney(position.total)} DH`}
              >
                {formatMoney(position.total)}
              </span>
              <span
                className={clsx(
                  "font-mono text-lg font-medium mb-1",
                  totalColorClass
                )}
                aria-hidden="true"
              >
                DH
              </span>
              <TrendIcon
                size={18}
                className={clsx("mb-1.5 shrink-0", totalColorClass)}
                aria-hidden="true"
              />
            </div>

            {/* Tagline */}
            <p className="text-xs text-ink-muted font-sans">
              Position au {today}
            </p>

            {/* Badges Blanc / Noir */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono tabular-nums bg-bg-subtle border border-line"
                style={{ color: "var(--blanc)" }}
                aria-label={`Blanc : ${formatMoney(position.blanc)} DH`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
                Blanc : {formatMoney(position.blanc)} DH
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono tabular-nums bg-bg-subtle border border-line"
                style={{ color: "var(--noir)" }}
                aria-label={`Noir : ${formatMoney(position.noir)} DH`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
                Noir : {formatMoney(position.noir)} DH
              </span>
            </div>

            {/* Flux Entrées / Sorties */}
            <div className="flex items-center gap-4 pt-1 border-t border-line mt-1">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">Entrées</span>
                <span className="font-mono tabular-nums text-sm text-positive">
                  + {formatMoney(position.in.total)} DH
                </span>
              </div>
              <div className="w-px h-8 bg-line" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">Sorties</span>
                <span className="font-mono tabular-nums text-sm text-negative">
                  − {formatMoney(position.out.total)} DH
                </span>
              </div>
            </div>
          </div>

          {/* Droite : sparkline */}
          <div className="flex flex-col gap-2 md:w-64 lg:w-80 shrink-0">
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
              Évolution 30 jours
            </span>
            {sparkLoading ? (
              <Skeleton variant="rect" className="w-full h-16" />
            ) : hasNoData || !sparkline?.length ? (
              <div
                className="flex items-center justify-center h-16 rounded bg-bg-subtle border border-dashed border-line"
                aria-label="Aucune donnée de flux sur 30 jours"
              >
                <span className="text-[10px] text-ink-disabled uppercase tracking-widest">
                  Aucune donnée
                </span>
              </div>
            ) : (
              <div
                className="h-16 w-full"
                role="img"
                aria-label="Graphique sparkline de l'évolution de la trésorerie sur 30 jours"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={sparkline}>
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--accent)"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3, fill: "var(--accent)" }}
                    />
                    <Tooltip
                      content={SparkTooltip}
                      cursor={{ stroke: "var(--line)", strokeWidth: 1 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
