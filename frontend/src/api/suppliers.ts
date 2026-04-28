/**
 * API Fournisseurs — Amlak Sprint 3
 * Endpoints : /api/v1/suppliers/
 * Filtres : ?category= &is_active= &search=
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type {
  Supplier,
  SupplierList,
  SupplierFilters,
  SupplierCreateInput,
  SupplierUpdateInput,
  Paginated,
  Transaction,
  TransactionFilters,
  Cheque,
  ChequeFilters,
} from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanFilters(
  filters: SupplierFilters | TransactionFilters | ChequeFilters
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== "" && v !== null && v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

// ── Hooks lecture ─────────────────────────────────────────────────────────────

/** Liste paginée des fournisseurs avec filtres optionnels */
export function useSuppliers(filters: SupplierFilters = {}) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Paginated<SupplierList>>("/suppliers/", {
        params: cleanFilters(filters),
      });
      return data;
    },
    staleTime: 30_000,
  });
}

/** Détail d'un fournisseur par id */
export function useSupplier(id: number | null) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Supplier>(`/suppliers/${id}/`);
      return data;
    },
    enabled: id !== null && id > 0,
    staleTime: 15_000,
  });
}

/**
 * Transactions paginées d'un fournisseur.
 * Utilise le filtre `?supplier=id` sur /transactions/ — l'endpoint
 * /suppliers/:id/transactions/ n'est pas exposé par le backend.
 */
export function useSupplierTransactions(
  supplierId: number,
  filters: TransactionFilters = {}
) {
  return useQuery({
    queryKey: queryKeys.suppliers.transactions(supplierId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Transaction>>(
        "/transactions/",
        { params: cleanFilters({ ...filters, supplier: supplierId }) }
      );
      return data;
    },
    enabled: supplierId > 0,
    staleTime: 30_000,
  });
}

/**
 * Chèques paginés d'un fournisseur.
 * Utilise le filtre `?supplier=id` sur /cheques/ — l'endpoint
 * /suppliers/:id/cheques/ n'est pas exposé par le backend.
 */
export function useSupplierCheques(
  supplierId: number,
  filters: ChequeFilters = {}
) {
  return useQuery({
    queryKey: queryKeys.suppliers.cheques(supplierId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Cheque>>(
        "/cheques/",
        { params: cleanFilters({ ...filters, supplier: supplierId }) }
      );
      return data;
    },
    enabled: supplierId > 0,
    staleTime: 30_000,
  });
}

// ── Hooks mutation ────────────────────────────────────────────────────────────

/** Création d'un fournisseur */
export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation<Supplier, AxiosError, SupplierCreateInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<Supplier>("/suppliers/", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
    },
  });
}

/** Mise à jour partielle d'un fournisseur */
export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation<
    Supplier,
    AxiosError,
    { id: number; input: SupplierUpdateInput }
  >({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.patch<Supplier>(`/suppliers/${id}/`, input);
      return data;
    },
    onSuccess: (supplier) => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
      qc.invalidateQueries({
        queryKey: queryKeys.suppliers.detail(supplier.id),
      });
    },
  });
}

/** Suppression d'un fournisseur */
export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => {
      await api.delete(`/suppliers/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
    },
  });
}

/** Bascule is_active d'un fournisseur */
export function useToggleSupplierActive() {
  const qc = useQueryClient();
  return useMutation<Supplier, AxiosError, { id: number; is_active: boolean }>({
    mutationFn: async ({ id, is_active }) => {
      const { data } = await api.patch<Supplier>(`/suppliers/${id}/`, {
        is_active,
      });
      return data;
    },
    onSuccess: (supplier) => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
      qc.invalidateQueries({
        queryKey: queryKeys.suppliers.detail(supplier.id),
      });
    },
  });
}

// ── Fonctions directes (sans hook) ───────────────────────────────────────────

export async function listSuppliers(
  filters: SupplierFilters = {}
): Promise<Paginated<SupplierList>> {
  const { data } = await api.get<Paginated<SupplierList>>("/suppliers/", {
    params: cleanFilters(filters),
  });
  return data;
}

export async function getSupplier(id: number): Promise<Supplier> {
  const { data } = await api.get<Supplier>(`/suppliers/${id}/`);
  return data;
}

export async function createSupplier(
  input: SupplierCreateInput
): Promise<Supplier> {
  const { data } = await api.post<Supplier>("/suppliers/", input);
  return data;
}

export async function updateSupplier(
  id: number,
  input: SupplierUpdateInput
): Promise<Supplier> {
  const { data } = await api.patch<Supplier>(`/suppliers/${id}/`, input);
  return data;
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/suppliers/${id}/`);
}

export async function toggleActive(
  id: number,
  is_active: boolean
): Promise<Supplier> {
  const { data } = await api.patch<Supplier>(`/suppliers/${id}/`, {
    is_active,
  });
  return data;
}
