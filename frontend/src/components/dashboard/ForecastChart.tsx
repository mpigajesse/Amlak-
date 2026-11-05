/**
 * ForecastChart — Courbe prévisionnelle de trésorerie à 30/60/90j.
 * Agrège les chèques en attente par date d'encaissement pour projeter le cash.
 */

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipContentProps,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatDate } from "@/lib/format";
import { useCashForecast } from "@/api/dashboard";
import { LIBELLE_BLANC, LIBELLE_NOIR } from "@/lib/libelles";

// ── Tooltip FR ────────────────────────────────────────────────────────────────

function ForecastTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="bg-bg-card border border-line rounded px-3 py-2.5 shadow-sm text-xs"
      role="tooltip"
    >
      <p className="text-ink-muted font-sans mb-2">
        {label != null ? formatDate(String(label), "long") : ""}
      </p>
      {payload.map((entry, i) => (
        <div key={`${String(entry.name ?? i)}-${i}`} className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: entry.color }}
            aria-hidden="true"
          />
          <span className="text-ink-soft capitalize">{String(entry.name ?? "")} :</span>
          <span className="font-mono tabular-nums text-ink ml-auto">
            {formatMoney(String(entry.value ?? 0))} DH
          </span>
        </div>
      ))}
    </div>
  );
}

function formatAxisDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatAxisAmount(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return String(val);
}

// ── Composant principal ───────────────────────────────────────────────────────

export interface ForecastChartProps {
  className?: string;
}

type HorizonTab = "30" | "60" | "90";

export function ForecastChart({ className }: ForecastChartProps) {
  const [horizon, setHorizon] = useState<HorizonTab>("30");
  const days = parseInt(horizon, 10) as 30 | 60 | 90;

  const { data: points, isLoading, error } = useCashForecast(days);

  return (
    <Card className={clsx("flex flex-col", className)} aria-label="Prévisionnel de trésorerie">
      <CardHeader>
        <h2 className="font-sans text-sm font-semibold text-ink">
          Prévisionnel trésorerie
        </h2>
        <Tabs value={horizon} onValueChange={(v) => setHorizon(v as HorizonTab)}>
          <Tabs.List className="border-none gap-0">
            {(["30", "60", "90"] as HorizonTab[]).map((tab) => (
              <Tabs.Trigger key={tab} value={tab} className="px-3 py-1.5 text-xs">
                {tab}j
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton variant="rect" className="w-full h-48" />
          </div>
        ) : error || !points ? (
          <EmptyState
            icon={TrendingUp}
            title="Prévisionnel indisponible"
            description="Impossible de charger les données de projection."
            className="py-8"
          />
        ) : points.length <= 1 ? (
          <EmptyState
            icon={TrendingUp}
            title="Aucune projection disponible"
            description={`Aucun chèque en attente dans les ${days} prochains jours.`}
            className="py-8"
          />
        ) : (
          <div
            className="h-48 w-full"
            role="img"
            aria-label={`Courbe prévisionnelle de trésorerie sur ${days} jours`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart
                data={points}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--line)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tick={{ fontSize: 10, fill: "var(--ink-muted)", fontFamily: "IBM Plex Sans" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatAxisAmount}
                  tick={{ fontSize: 10, fill: "var(--ink-muted)", fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={ForecastTooltip} />
                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                    fontFamily: "IBM Plex Sans",
                    color: "var(--ink-muted)",
                    paddingTop: 8,
                  }}
                  formatter={(value: string) =>
                    value.charAt(0).toUpperCase() + value.slice(1)
                  }
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--accent)" }}
                />
                <Line
                  type="monotone"
                  dataKey="blanc"
                  name={LIBELLE_BLANC}
                  stroke="var(--blanc)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{ r: 3, fill: "var(--blanc)" }}
                />
                <Line
                  type="monotone"
                  dataKey="noir"
                  name={LIBELLE_NOIR}
                  stroke="var(--noir)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{ r: 3, fill: "var(--noir)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
