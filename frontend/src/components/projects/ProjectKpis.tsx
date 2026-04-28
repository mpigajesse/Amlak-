/**
 * KPIs d'un projet — 4 métriques clés en haut de la page détail.
 */

import { Wallet, TrendingUp, Home, ArrowRightLeft } from "lucide-react";
import Decimal from "decimal.js";
import { clsx } from "clsx";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import type { Project } from "@/lib/types";

export interface ProjectKpisProps {
  project: Project;
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  iconClass?: string;
}

function KpiCard({ label, value, icon: Icon, iconClass }: KpiCardProps) {
  return (
    <div className="bg-bg-card border border-line rounded-lg p-4 flex items-start gap-3">
      <div
        className={clsx(
          "flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0",
          iconClass ?? "bg-accent-bg text-accent"
        )}
      >
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans mb-1">
          {label}
        </p>
        <div className="text-lg font-mono tabular-nums font-medium text-ink leading-tight">
          {value}
        </div>
      </div>
    </div>
  );
}

export function ProjectKpis({ project }: ProjectKpisProps) {
  const { position, budget_status, units_count, units_sold_count } = project;

  // Budget consommé (%)
  let budgetPct = 0;
  if (budget_status) {
    const total = [
      budget_status.acquisition,
      budget_status.travaux,
      budget_status.admin,
      budget_status.commercialisation,
    ].reduce(
      (acc, cat) => ({
        budget: acc.budget.plus(new Decimal(cat.budget || "0")),
        consumed: acc.consumed.plus(new Decimal(cat.consumed || "0")),
      }),
      { budget: new Decimal(0), consumed: new Decimal(0) }
    );
    if (!total.budget.isZero()) {
      budgetPct = total.consumed.div(total.budget).mul(100).toNumber();
    }
  }

  // Position cash
  const cashNet = position?.net ?? "0";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Position cash */}
      <KpiCard
        label="Position cash"
        icon={Wallet}
        iconClass="bg-accent-bg text-accent"
        value={<MoneyDisplay value={cashNet} className="text-lg" />}
      />

      {/* Budget consommé */}
      <KpiCard
        label="Budget consommé"
        icon={TrendingUp}
        iconClass={
          budgetPct >= 100
            ? "bg-[rgba(124,45,40,0.10)] text-negative"
            : budgetPct >= 80
            ? "bg-[rgba(143,90,31,0.10)] text-warning"
            : "bg-accent-bg text-accent"
        }
        value={
          <span
            className={clsx(
              "font-mono tabular-nums",
              budgetPct >= 100
                ? "text-negative"
                : budgetPct >= 80
                ? "text-warning"
                : "text-ink"
            )}
          >
            {Math.round(budgetPct)} %
          </span>
        }
      />

      {/* Unités vendues */}
      <KpiCard
        label="Unités vendues"
        icon={Home}
        iconClass="bg-[rgba(31,61,43,0.10)] text-positive"
        value={
          <span className="font-mono tabular-nums text-ink">
            {units_sold_count}
            <span className="text-ink-muted text-base">/{units_count}</span>
          </span>
        }
      />

      {/* Entrées / Sorties */}
      <KpiCard
        label="Flux total"
        icon={ArrowRightLeft}
        iconClass="bg-black/[0.05] text-ink-soft"
        value={
          position ? (
            <MoneyDisplay
              value={
                new Decimal(position.total_in || "0")
                  .plus(new Decimal(position.total_out || "0"))
                  .toString()
              }
              positive={undefined}
              className="text-lg"
            />
          ) : (
            <span className="text-ink-muted">—</span>
          )
        }
      />
    </div>
  );
}
