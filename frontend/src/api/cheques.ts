/**
 * API Chèques — hooks TanStack Query + mutations.
 * Endpoint base : /api/v1/cheques/
 * Règle : jamais de log de number ni amount_* — seulement id et verbes HTTP.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { queryKeys } from "./keys";
import type {
  Cheque,
  ChequeCreateInput,
  ChequeUpdateInput,
  ChequeFilters,
  OcrResult,
  Paginated,
} from "@/lib/types";

// ── Lecture ───────────────────────────────────────────────────────────────────

export function useCheques(filters: ChequeFilters = {}) {
  return useQuery({
    queryKey: queryKeys.cheques.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Cheque>>("/cheques/", {
        params: filters,
      });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCheque(id: number) {
  return useQuery({
    queryKey: queryKeys.cheques.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Cheque>(`/cheques/${id}/`);
      return data;
    },
    enabled: !!id,
    staleTime: 15_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChequeCreateInput) => {
      const { data } = await api.post<Cheque>("/cheques/", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cheques.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useUpdateCheque(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChequeUpdateInput) => {
      const { data } = await api.patch<Cheque>(`/cheques/${id}/`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cheques.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.cheques.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

/** Marquer un chèque encaissé — crée une Transaction automatiquement */
export function useCashCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<Cheque>(`/cheques/${id}/cash/`);
      return data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.cheques.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.cheques.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
      // Invalide les transactions aussi car une Transaction a été créée côté backend
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/** Marquer un chèque rejeté */
export function useRejectCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<Cheque>(`/cheques/${id}/reject/`);
      return data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.cheques.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.cheques.all() });
    },
  });
}

/** OCR d'une photo de chèque — throttle 10/min côté backend */
export function useOcrCheque() {
  return useMutation({
    mutationFn: async (file: File): Promise<OcrResult> => {
      const form = new FormData();
      form.append("photo", file);
      const { data } = await api.post<OcrResult>("/cheques/ocr/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
  });
}

/** Upload photo recto/verso d'un chèque existant */
export function useUploadChequePhoto(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: { front?: File; back?: File }) => {
      const form = new FormData();
      if (files.front) form.append("photo_front", files.front);
      if (files.back) form.append("photo_back", files.back);
      const { data } = await api.post<Cheque>(
        `/cheques/${id}/upload-photo/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cheques.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.cheques.all() });
    },
  });
}
