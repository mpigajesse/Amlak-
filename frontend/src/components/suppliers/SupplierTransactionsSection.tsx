import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { MoneyDisplay } from "@/components/shared";
import { formatDate } from "@/lib/format";
import { useSupplierTransactions } from "@/api/suppliers";
import type { Transaction } from "@/lib/types";

export interface SupplierTransactionsSectionProps {
  supplierId: number;
}

function directionBadge(tx: Transaction) {
  if (tx.direction === "in") {
    return (
      <Badge variant="positive">
        <ArrowDownLeft size={10} aria-hidden="true" />
        Entrée
      </Badge>
    );
  }
  return (
    <Badge variant="negative">
      <ArrowUpRight size={10} aria-hidden="true" />
      Sortie
    </Badge>
  );
}

/**
 * Section transactions d'un fournisseur.
 * Appelle /api/v1/suppliers/:id/transactions/
 */
export function SupplierTransactionsSection({
  supplierId,
}: SupplierTransactionsSectionProps) {
  const { data, isLoading, error } = useSupplierTransactions(supplierId);

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 px-4 py-3 rounded bg-negative/[0.07] text-negative text-sm font-sans">
        Impossible de charger les transactions.
      </div>
    );
  }

  const transactions = data?.results ?? [];

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Aucune transaction"
        description="Ce fournisseur n'a pas encore de transactions associées."
        className="py-10"
      />
    );
  }

  return (
    <div className="mt-4">
      <Table responsive>
        <TableHead>
          <tr>
            <TableHeader>Date</TableHeader>
            <TableHeader>Direction</TableHeader>
            <TableHeader>Libellé</TableHeader>
            <TableHeader>Projet</TableHeader>
            <TableHeader align="right">Total</TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell label="Date">
                <span className="font-mono text-xs text-ink-muted">
                  {formatDate(tx.date, "short")}
                </span>
              </TableCell>

              <TableCell label="Direction">
                {directionBadge(tx)}
              </TableCell>

              <TableCell label="Libellé">
                <span className="text-ink">
                  {tx.label || tx.category || "—"}
                </span>
              </TableCell>

              <TableCell label="Projet">
                {tx.project_detail ? (
                  <span className="text-ink-muted text-xs">
                    {tx.project_detail.name}
                  </span>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </TableCell>

              <TableCell label="Total" align="right">
                <MoneyDisplay
                  value={tx.amount_total}
                  positive={tx.direction === "in"}
                />
                <span className="font-mono text-xs text-ink-muted ml-1">DH</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data && data.count > transactions.length && (
        <p className="mt-2 text-xs text-ink-muted font-sans text-center">
          {transactions.length} sur {data.count} transactions
        </p>
      )}
    </div>
  );
}
