/**
 * API Transactions — Amlak Sprint 3
 * Endpoints : /api/v1/transactions/, /quick/, /cash-position/
 * Montants en string Decimal (jamais de float).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type {
  Transaction,
  TransactionFilters,
  TransactionInput,
  QuickTransactionInput,
  CashPosition,
  Paginated,
} from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Supprime les entrées vides/null/undefined des filtres avant envoi */
function cleanFilters(filters: TransactionFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== "" && v !== null && v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

// ── Hooks lecture ─────────────────────────────────────────────────────────────

/**
 * Liste paginée des transactions avec filtres optionnels.
 * staleTime : 30s (liste fréquemment mise à jour)
 */
export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Transaction>>(
        "/transactions/",
        { params: cleanFilters(filters) }
      );
      return data;
    },
    staleTime: 30_000,
  });
}

/** Détail d'une transaction par id */
export function useTransaction(id: number | null) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Transaction>(`/transactions/${id}/`);
      return data;
    },
    enabled: id !== null && id > 0,
    staleTime: 15_000,
  });
}

/**
 * Cash position (résumé entrées/sorties/solde).
 * Accepte les mêmes filtres que la liste pour un résumé filtré cohérent.
 */
export function useCashPosition(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.cashPosition(filters),
    queryFn: async () => {
      const { data } = await api.get<CashPosition>(
        "/transactions/cash-position/",
        { params: cleanFilters(filters) }
      );
      return data;
    },
    staleTime: 30_000,
  });
}

// ── Hooks mutation ────────────────────────────────────────────────────────────

/** Création d'une transaction complète */
export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation<Transaction, AxiosError, TransactionInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<Transaction>("/transactions/", input);
      return data;
    },
    onSuccess: (tx) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      if (tx.project) {
        qc.invalidateQueries({
          queryKey: queryKeys.projects.detail(tx.project),
        });
      }
    },
  });
}

/** Mise à jour partielle d'une transaction */
export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation<
    Transaction,
    AxiosError,
    { id: number; input: Partial<TransactionInput> }
  >({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.patch<Transaction>(
        `/transactions/${id}/`,
        input
      );
      return data;
    },
    onSuccess: (tx) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({
        queryKey: queryKeys.transactions.detail(tx.id),
      });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      if (tx.project) {
        qc.invalidateQueries({
          queryKey: queryKeys.projects.detail(tx.project),
        });
      }
    },
  });
}

/** Suppression d'une transaction */
export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => {
      await api.delete(`/transactions/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

/**
 * Saisie rapide — POST /transactions/quick/
 * Corps minimal : date, direction, amount_blanc, amount_noir, category
 */
export function useQuickTransaction() {
  const qc = useQueryClient();
  return useMutation<Transaction, AxiosError, QuickTransactionInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<Transaction>(
        "/transactions/quick/",
        input
      );
      return data;
    },
    onSuccess: (tx) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      if (tx.project) {
        qc.invalidateQueries({
          queryKey: queryKeys.projects.detail(tx.project),
        });
      }
    },
  });
}

// ── Fonctions directes (sans hook) ───────────────────────────────────────────

/** Création sans hook (utilitaire si besoin hors composant) */
export async function createTransaction(
  input: TransactionInput
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions/", input);
  return data;
}

/** Mise à jour sans hook */
export async function updateTransaction(
  id: number,
  input: Partial<TransactionInput>
): Promise<Transaction> {
  const { data } = await api.patch<Transaction>(`/transactions/${id}/`, input);
  return data;
}

/** Suppression sans hook */
export async function deleteTransaction(id: number): Promise<void> {
  await api.delete(`/transactions/${id}/`);
}

/** Saisie rapide sans hook */
export async function quickTransaction(
  input: QuickTransactionInput
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions/quick/", input);
  return data;
}

/** Cash position sans hook */
export async function getCashPosition(
  filters: TransactionFilters = {}
): Promise<CashPosition> {
  const { data } = await api.get<CashPosition>(
    "/transactions/cash-position/",
    { params: cleanFilters(filters) }
  );
  return data;
}
