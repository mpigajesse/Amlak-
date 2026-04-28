/**
 * API hooks pour les Acquisitions.
 * Endpoints : CRUD /acquisitions/, action POST /acquisitions/:id/advance-stage/
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type {
  Acquisition,
  AcquisitionCreateInput,
  AcquisitionUpdateInput,
  Project,
  ProjectStage,
  Paginated,
} from "@/lib/types";

// ── Lecture ───────────────────────────────────────────────────────────────────

export function useAcquisitions(projectId: number) {
  return useQuery({
    queryKey: queryKeys.acquisitions.list(projectId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Acquisition>>("/acquisitions/", {
        params: { project: projectId },
      });
      return data;
    },
    enabled: projectId > 0,
    staleTime: 15_000,
  });
}

export function useAcquisition(id: number) {
  return useQuery({
    queryKey: queryKeys.acquisitions.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Acquisition>(`/acquisitions/${id}/`);
      return data;
    },
    enabled: id > 0,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateAcquisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AcquisitionCreateInput) => {
      const { data } = await api.post<Acquisition>("/acquisitions/", input);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.acquisitions.list(variables.project),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.project),
      });
    },
  });
}

export function useUpdateAcquisition(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AcquisitionUpdateInput) => {
      const { data } = await api.patch<Acquisition>(
        `/acquisitions/${id}/`,
        input
      );
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.acquisitions.detail(id) });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(data.project),
      });
    },
  });
}

export function useDeleteAcquisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: number;
      projectId: number;
    }) => {
      await api.delete(`/acquisitions/${id}/`);
      return { projectId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.acquisitions.list(variables.projectId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
  });
}

/**
 * Mutation de déplacement d'acquisition dans le kanban.
 * Applique un optimistic update immédiat sur le détail du projet,
 * rollback sur erreur 422 ou toute erreur réseau.
 */
export function useUpdateAcquisitionStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      stage,
    }: {
      id: number;
      stage: ProjectStage;
      projectId: number;
    }) => {
      const { data } = await api.patch<Acquisition>(`/acquisitions/${id}/`, {
        stage,
      });
      return data;
    },
    onMutate: async ({ id, stage, projectId }) => {
      const key = queryKeys.projects.detail(projectId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Project>(key);
      if (!prev?.acquisitions_by_stage) return { prev };

      // Construire la nouvelle map optimiste
      const oldByStage = prev.acquisitions_by_stage;
      const allAcqs = Object.values(oldByStage).flat();
      const acq = allAcqs.find((a) => a.id === id);
      if (!acq) return { prev };

      const newByStage: Record<ProjectStage, Acquisition[]> = Object
        .fromEntries(
          Object.entries(oldByStage).map(([s, items]) => [
            s,
            (items as Acquisition[]).filter((a) => a.id !== id),
          ])
        ) as Record<ProjectStage, Acquisition[]>;
      newByStage[stage] = [
        ...(newByStage[stage] ?? []),
        { ...acq, stage },
      ];

      qc.setQueryData<Project>(key, { ...prev, acquisitions_by_stage: newByStage });
      return { prev };
    },
    onError: (_err, vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.projects.detail(vars.projectId), context.prev);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(vars.projectId),
      });
    },
  });
}

/**
 * POST /acquisitions/:id/advance-stage/ — passe au stage suivant.
 */
export function useAdvanceAcquisitionStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: number;
      projectId: number;
    }) => {
      const { data } = await api.post<Acquisition>(
        `/acquisitions/${id}/advance-stage/`
      );
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(vars.projectId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.acquisitions.list(vars.projectId),
      });
    },
  });
}
