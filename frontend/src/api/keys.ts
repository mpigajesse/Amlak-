/**
 * Clés TanStack Query centralisées.
 * Toutes les queryKeys passent par ce fichier pour éviter les collisions.
 */

import type { ProjectFilters, TransactionFilters, ChequeFilters, SupplierFilters } from "@/lib/types";

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  projects: {
    all: () => ["projects"] as const,
    list: (filters: ProjectFilters) => ["projects", "list", filters] as const,
    detail: (id: number) => ["projects", "detail", id] as const,
  },
  acquisitions: {
    all: () => ["acquisitions"] as const,
    list: (projectId: number) =>
      ["acquisitions", "list", projectId] as const,
    detail: (id: number) => ["acquisitions", "detail", id] as const,
  },
  units: {
    all: () => ["units"] as const,
    list: (projectId: number) => ["units", "list", projectId] as const,
    detail: (id: number) => ["units", "detail", id] as const,
  },
  transactions: {
    all: () => ["transactions"] as const,
    list: (filters: TransactionFilters) =>
      ["transactions", "list", filters] as const,
    detail: (id: number) => ["transactions", "detail", id] as const,
    cashPosition: (filters: TransactionFilters) =>
      ["transactions", "cash-position", filters] as const,
  },
  cheques: {
    all: () => ["cheques"] as const,
    list: (filters: ChequeFilters) => ["cheques", "list", filters] as const,
    detail: (id: number) => ["cheques", "detail", id] as const,
  },
  suppliers: {
    all: () => ["suppliers"] as const,
    list: (filters: SupplierFilters) => ["suppliers", "list", filters] as const,
    detail: (id: number) => ["suppliers", "detail", id] as const,
    transactions: (id: number) => ["suppliers", id, "transactions"] as const,
    cheques: (id: number) => ["suppliers", id, "cheques"] as const,
  },
  dashboard: () => ["dashboard"] as const,
} as const;
