/**
 * API hooks pour les StockUnits.
 * Endpoints : CRUD /units/, actions réservation/compromis/encaissement,
 * et génération en masse depuis une acquisition.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type {
  StockUnit,
  StockUnitCreateInput,
  GenerateStockInput,
  Paginated,
} from "@/lib/types";

// ── Lecture ───────────────────────────────────────────────────────────────────

export function useUnits(projectId: number) {
  return useQuery({
    queryKey: queryKeys.units.list(projectId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<StockUnit>>("/units/", {
        params: { project: projectId },
      });
      return data;
    },
    enabled: projectId > 0,
    staleTime: 15_000,
  });
}

export function useUnit(id: number) {
  return useQuery({
    queryKey: queryKeys.units.detail(id),
    queryFn: async () => {
      const { data } = await api.get<StockUnit>(`/units/${id}/`);
      return data;
    },
    enabled: id > 0,
  });
}

// ── Mutations CRUD ────────────────────────────────────────────────────────────

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockUnitCreateInput) => {
      const { data } = await api.post<StockUnit>("/units/", input);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.units.list(variables.project) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.project),
      });
    },
  });
}

export function useUpdateUnit(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<StockUnitCreateInput>
    ) => {
      const { data } = await api.patch<StockUnit>(`/units/${id}/`, input);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.units.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.units.list(data.project) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(data.project),
      });
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: number;
      projectId: number;
    }) => {
      await api.delete(`/units/${id}/`);
      return { projectId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.units.list(variables.projectId) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
  });
}

// ── Actions métier ────────────────────────────────────────────────────────────

export interface ReserveUnitInput {
  buyer_name: string;
  buyer_phone?: string;
  date_reservation: string;
  amount_blanc: string;
  amount_noir: string;
  payment_mode: "espece" | "cheque" | "virement" | "autre";
  cheque_data?: {
    number: string;
    bank: string;
    due_date: string;
  };
}

export function useReserveUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      projectId: number;
      input: ReserveUnitInput;
    }) => {
      const { data } = await api.post<StockUnit>(`/units/${id}/reserve/`, input);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.units.list(variables.projectId) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export interface CompromisUnitInput {
  date_compromis: string;
  amount_blanc: string;
  amount_noir: string;
  payment_mode: "espece" | "cheque" | "virement" | "autre";
  cheque_data?: {
    number: string;
    bank: string;
    due_date: string;
  };
}

export function useSignCompromis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      projectId: number;
      input: CompromisUnitInput;
    }) => {
      const { data } = await api.post<StockUnit>(`/units/${id}/sign-compromis/`, input);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.units.list(variables.projectId) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export interface CashoutUnitInput {
  date_encaissement: string;
  amount_blanc: string;
  amount_noir: string;
  payment_mode: "espece" | "cheque" | "virement" | "autre";
}

export function useCashUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      projectId: number;
      input: CashoutUnitInput;
    }) => {
      const { data } = await api.post<StockUnit>(`/units/${id}/cash/`, input);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.units.list(variables.projectId) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

/**
 * POST /units/generate-from-acquisition/
 * Génère en masse les StockUnits depuis une acquisition.
 * Body : { acquisition: id, units: [...] }
 */
export function useGenerateFromAcquisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      acquisitionId,
      input,
    }: {
      acquisitionId: number;
      projectId: number;
      input: GenerateStockInput;
    }) => {
      const { data } = await api.post<StockUnit[]>(
        `/units/generate-from-acquisition/`,
        { acquisition: acquisitionId, ...input }
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.units.list(variables.projectId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}
