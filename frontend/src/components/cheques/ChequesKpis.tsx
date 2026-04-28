/**
 * 4 cartes KPI de la page Chèques.
 * Chaque compteur appelle l'API avec les filtres inline.
 */
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { TrendingDown, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { useCheques } from "@/api/cheques";
import { MoneyDisplay } from "@/components/shared";
import { Skeleton } from "@/components/ui/Skeleton";
import Decimal from "decimal.js";

export interface ChequesKpisProps {
  className?: string;
}

interface KpiCardProps {
  label: string;
  count: number | undefined;
  total: string | undefined;
  isLoading: boolean;
  icon: ComponentType<LucideProps>;
  iconColor: string;
  positive?: boolean;
}

function KpiCard({
  label,
  count,
  total,
  isLoading,
  icon: Icon,
  iconColor,
  positive,
}: KpiCardProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-3 p-4 rounded-lg border border-line bg-bg-card"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
          {label}
        </span>
        <div
          className={clsx(
            "flex items-center justify-center w-8 h-8 rounded",
            iconColor
          )}
        >
          <Icon size={16} aria-hidden="true" />
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton variant="text" className="w-8 h-7" />
          <Skeleton variant="text" className="w-24" />
        </div>
      ) : (
        <>
          <span className="font-display text-2xl text-ink">
            {count ?? 0}
          </span>
          {total !== undefined && (
            <MoneyDisplay
              value={total}
              currency="DH"
              positive={positive}
              compact
              className="text-xs"
            />
          )}
        </>
      )}
    </div>
  );
}

function sumCheques(cheques: Array<{ amount_blanc: string; amount_noir: string }>): string {
  try {
    return cheques
      .reduce((acc, c) => {
        const blanc = new Decimal(c.amount_blanc || "0");
        const noir = new Decimal(c.amount_noir || "0");
        return acc.plus(blanc).plus(noir);
      }, new Decimal(0))
      .toFixed(2);
  } catch {
    return "0";
  }
}

export function ChequesKpis({ className }: ChequesKpisProps) {
  const pendingIn = useCheques({ status: "pending", direction: "in" });
  const pendingOut = useCheques({ status: "pending", direction: "out" });
  const cashed = useCheques({ status: "cashed" });
  const rejected = useCheques({ status: "rejected" });

  const pendingInTotal = pendingIn.data ? sumCheques(pendingIn.data.results) : undefined;
  const pendingOutTotal = pendingOut.data ? sumCheques(pendingOut.data.results) : undefined;
  const cashedTotal = cashed.data ? sumCheques(cashed.data.results) : undefined;
  const rejectedTotal = rejected.data ? sumCheques(rejected.data.results) : undefined;

  return (
    <div
      className={clsx(
        "grid grid-cols-2 lg:grid-cols-4 gap-3",
        className
      )}
    >
      <KpiCard
        label="À encaisser"
        count={pendingIn.data?.count}
        total={pendingInTotal}
        isLoading={pendingIn.isLoading}
        icon={TrendingUp}
        iconColor="bg-accent-bg text-accent"
        positive={true}
      />
      <KpiCard
        label="À présenter"
        count={pendingOut.data?.count}
        total={pendingOutTotal}
        isLoading={pendingOut.isLoading}
        icon={TrendingDown}
        iconColor="bg-warning/10 text-warning"
        positive={false}
      />
      <KpiCard
        label="Encaissés"
        count={cashed.data?.count}
        total={cashedTotal}
        isLoading={cashed.isLoading}
        icon={CheckCircle2}
        iconColor="bg-positive/10 text-positive"
        positive={true}
      />
      <KpiCard
        label="Rejetés"
        count={rejected.data?.count}
        total={rejectedTotal}
        isLoading={rejected.isLoading}
        icon={XCircle}
        iconColor="bg-negative/10 text-negative"
        positive={false}
      />
    </div>
  );
}
