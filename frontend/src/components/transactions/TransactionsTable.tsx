/**
 * TransactionsTable — table paginée des transactions.
 * Desktop : colonnes complètes. Mobile : cards via le responsive Table.
 */

import { ArrowLeft, ArrowRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
} from "@/components/ui/Table";
import { TransactionRow } from "./TransactionRow";
import type { Transaction, Paginated } from "@/lib/types";
import { LIBELLE_BLANC, LIBELLE_NOIR } from "@/lib/libelles";

export interface TransactionsTableProps {
  data: Paginated<Transaction> | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

const PAGE_SIZE = 20;

export function TransactionsTable({
  data,
  isLoading,
  page,
  onPageChange,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded" />
        ))}
      </div>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <EmptyState
        icon={ArrowUpDown}
        title="Aucune transaction"
        description="Aucune transaction ne correspond à vos filtres. Créez-en une ou modifiez les filtres."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table responsive>
        <TableHead>
          <tr>
            <TableHeader>Date</TableHeader>
            <TableHeader>Direction</TableHeader>
            <TableHeader>Catégorie</TableHeader>
            <TableHeader>Mode</TableHeader>
            <TableHeader>Projet</TableHeader>
            <TableHeader>Fournisseur</TableHeader>
            <TableHeader align="right">{LIBELLE_BLANC}</TableHeader>
            <TableHeader align="right">{LIBELLE_NOIR}</TableHeader>
            <TableHeader align="right">Total</TableHeader>
            <TableHeader align="right">Actions</TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {data.results.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-ink-muted font-sans">
            {data.count} transaction{data.count > 1 ? "s" : ""} au total
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Page précédente"
            >
              <ArrowLeft size={14} aria-hidden="true" />
            </Button>
            <span className="text-xs text-ink font-mono tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Page suivante"
            >
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
