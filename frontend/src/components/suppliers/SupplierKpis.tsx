import type { ReactNode, ComponentType } from "react";
import { TrendingDown, Clock, Receipt, Calendar } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { MoneyDisplay } from "@/components/shared";
import { formatDate } from "@/lib/format";
import type { Supplier } from "@/lib/types";

export interface SupplierKpisProps {
  supplier: Supplier;
}

interface KpiCardProps {
  label: string;
  icon: ComponentType<LucideProps>;
  children: ReactNode;
}

function KpiCard({ label, icon: Icon, children }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
              {label}
            </span>
            <div className="leading-tight">
              {children}
            </div>
          </div>
          <div className="flex-shrink-0 w-9 h-9 rounded bg-bg-subtle flex items-center justify-center text-ink-muted">
            <Icon size={18} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 4 KPI cards pour le détail fournisseur :
 * Total sorties, Chèques en circulation, Nb transactions, Dernière activité.
 */
export function SupplierKpis({ supplier }: SupplierKpisProps) {
  const lastActivityDate = supplier.updated_at ?? supplier.created_at;

  const totalTransactions = supplier.breakdown_by_project.reduce(
    (sum, p) => sum + p.transactions_count,
    0
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Total sorties" icon={TrendingDown}>
        <MoneyDisplay
          value={supplier.total_engaged}
          positive={false}
          currency="DH"
        />
      </KpiCard>

      <KpiCard label="Chèques en cours" icon={Clock}>
        <span className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-mono tabular-nums text-xl font-semibold text-ink">
            {supplier.cheques_count_pending}
          </span>
          <span className="text-xs font-sans font-normal text-ink-muted">
            chèque(s)
          </span>
        </span>
        {supplier.balance_due && supplier.balance_due !== "0.00" && (
          <div className="mt-1">
            <MoneyDisplay
              value={supplier.balance_due}
              positive={false}
              currency="DH"
              className="text-sm"
            />
          </div>
        )}
      </KpiCard>

      <KpiCard label="Transactions" icon={Receipt}>
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono tabular-nums text-xl font-semibold text-ink">
            {totalTransactions}
          </span>
          <span className="text-xs font-sans font-normal text-ink-muted">
            transaction(s)
          </span>
        </span>
      </KpiCard>

      <KpiCard label="Dernière activité" icon={Calendar}>
        <span className="text-sm font-sans font-normal text-ink">
          {lastActivityDate ? formatDate(lastActivityDate, "long") : "—"}
        </span>
      </KpiCard>
    </div>
  );
}
