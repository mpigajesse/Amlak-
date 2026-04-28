/**
 * TransactionsPage — page principale du module transactions.
 * - Header avec bouton "+ Nouvelle transaction" (desktop)
 * - FAB mobile (bas-droite)
 * - Filtres, table paginée, résumé cash-position
 * - Modal édition + confirmation suppression
 */

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTitle } from "@/hooks/useTitle";
import { clsx } from "clsx";
import { isAxiosError } from "axios";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { QuickTransactionDrawer } from "@/components/transactions/QuickTransactionDrawer";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { useToast } from "@/components/ui/useToast";
import {
  useTransactions,
  useCashPosition,
  useDeleteTransaction,
} from "@/api/transactions";
import type { Transaction, TransactionFilters as TFilters, CashPosition } from "@/lib/types";

export function TransactionsPage() {
  useTitle("Transactions");
  const toast = useToast();

  // Filtres actifs
  const [filters, setFilters] = useState<TFilters>({ page: 1 });

  // États modaux
  const [showNewModal, setShowNewModal] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [showQuickDrawer, setShowQuickDrawer] = useState(false);

  // Data
  const { data: txData, isLoading: txLoading } = useTransactions(filters);
  const { data: cashPos, isLoading: cashLoading } = useCashPosition(filters);
  const deleteTx = useDeleteTransaction();

  const currentPage = filters.page ?? 1;

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleFiltersChange = (newFilters: TFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handleEdit = (tx: Transaction) => {
    setEditTransaction(tx);
  };

  const handleDelete = (tx: Transaction) => {
    setDeleteTarget(tx);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTx.mutateAsync(deleteTarget.id);
      toast.success("Transaction supprimée");
    } catch (error: unknown) {
      const detail = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      toast.error(detail ?? "Erreur lors de la suppression");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <PageHeader
        title="Transactions"
        subtitle={
          txData
            ? `${txData.count} transaction${txData.count > 1 ? "s" : ""}`
            : undefined
        }
        actions={
          <Button
            variant="primary"
            onClick={() => setShowNewModal(true)}
            iconLeft={<Plus size={16} aria-hidden="true" />}
            className="hidden sm:inline-flex"
          >
            Nouvelle transaction
          </Button>
        }
      />

      {/* Résumé cash-position (avec les mêmes filtres) */}
      <CashPositionSummary isLoading={cashLoading} data={cashPos} />

      {/* Filtres */}
      <TransactionFilters
        filters={filters}
        onChange={handleFiltersChange}
      />

      {/* Table */}
      <TransactionsTable
        data={txData}
        isLoading={txLoading}
        page={currentPage}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* FAB mobile */}
      <button
        type="button"
        onClick={() => setShowQuickDrawer(true)}
        aria-label="Nouvelle transaction rapide"
        className={clsx(
          "fixed bottom-6 right-6 z-30",
          "flex items-center justify-center w-14 h-14",
          "bg-accent text-bg-elevated rounded-full shadow-lg",
          "hover:bg-accent-soft transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          "sm:hidden"
        )}
        style={{ transitionDuration: "var(--transition-fast)" }}
      >
        <Plus size={24} aria-hidden="true" />
      </button>

      {/* Modal nouvelle transaction */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Nouvelle transaction"
        size="lg"
        disableBackdropClose
      >
        <TransactionForm
          onSuccess={() => setShowNewModal(false)}
          onCancel={() => setShowNewModal(false)}
        />
      </Modal>

      {/* Modal édition */}
      <Modal
        open={editTransaction !== null}
        onClose={() => setEditTransaction(null)}
        title="Modifier la transaction"
        size="lg"
        disableBackdropClose
      >
        {editTransaction && (
          <TransactionForm
            transaction={editTransaction}
            onSuccess={() => setEditTransaction(null)}
            onCancel={() => setEditTransaction(null)}
          />
        )}
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la transaction"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteTx.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteTx.isPending}
              iconLeft={<Trash2 size={14} aria-hidden="true" />}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink font-sans">
          Confirmer la suppression de cette transaction ? Cette action est
          irréversible.
        </p>
        {deleteTarget && (
          <p className="mt-2 text-xs text-ink-muted font-mono">
            {deleteTarget.date} —{" "}
            <MoneyDisplay
              value={deleteTarget.amount_total}
              currency="DH"
              className="text-xs"
            />
          </p>
        )}
      </Modal>

      {/* Drawer saisie rapide mobile */}
      <QuickTransactionDrawer
        open={showQuickDrawer}
        onClose={() => setShowQuickDrawer(false)}
      />
    </div>
  );
}

// ── Sous-composant CashPositionSummary ────────────────────────────────────────

interface CashPositionSummaryProps {
  isLoading: boolean;
  data: CashPosition | undefined;
}

function CashPositionSummary({ isLoading, data }: CashPositionSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Entrées */}
      <div className="rounded-lg border border-line bg-bg-card px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted mb-2">
          Entrées
        </p>
        <MoneyDisplay
          value={data.in.total}
          currency="DH"
          positive={true}
          className="text-lg font-medium"
        />
        <div className="flex gap-3 mt-1">
          <span className="text-xs font-mono" style={{ color: "var(--blanc)" }}>
            B {data.in.blanc !== "0.00" ? `${data.in.blanc.replace(/\.00$/, "")} DH` : "—"}
          </span>
          <span className="text-xs font-mono" style={{ color: "var(--noir)" }}>
            N {data.in.noir !== "0.00" ? `${data.in.noir.replace(/\.00$/, "")} DH` : "—"}
          </span>
        </div>
      </div>

      {/* Sorties */}
      <div className="rounded-lg border border-line bg-bg-card px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted mb-2">
          Sorties
        </p>
        <MoneyDisplay
          value={data.out.total}
          currency="DH"
          positive={false}
          className="text-lg font-medium"
        />
        <div className="flex gap-3 mt-1">
          <span className="text-xs font-mono" style={{ color: "var(--blanc)" }}>
            B {data.out.blanc !== "0.00" ? `${data.out.blanc.replace(/\.00$/, "")} DH` : "—"}
          </span>
          <span className="text-xs font-mono" style={{ color: "var(--noir)" }}>
            N {data.out.noir !== "0.00" ? `${data.out.noir.replace(/\.00$/, "")} DH` : "—"}
          </span>
        </div>
      </div>

      {/* Solde */}
      <div className="rounded-lg border border-line-strong bg-bg-card px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted mb-2">
          Solde
        </p>
        <MoneyDisplay
          value={data.total}
          currency="DH"
          className="text-lg font-medium"
        />
        <div className="flex gap-3 mt-1">
          <span className="text-xs font-mono" style={{ color: "var(--blanc)" }}>
            B {data.blanc !== "0.00" ? `${data.blanc.replace(/\.00$/, "")} DH` : "—"}
          </span>
          <span className="text-xs font-mono" style={{ color: "var(--noir)" }}>
            N {data.noir !== "0.00" ? `${data.noir.replace(/\.00$/, "")} DH` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
