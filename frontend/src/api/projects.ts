/**
 * API hooks pour les Projets.
 * Endpoints : GET/POST /projects/, GET/PATCH/DELETE /projects/:id/
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type {
  Project,
  ProjectFilters,
  ProjectCreateInput,
  ProjectUpdateInput,
  Paginated,
} from "@/lib/types";

// ── Lecture ───────────────────────────────────────────────────────────────────

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Project>>("/projects/", {
        params: filters,
      });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${id}/`);
      return data;
    },
    enabled: id > 0,
    staleTime: 15_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectCreateInput) => {
      const { data } = await api.post<Project>("/projects/", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useUpdateProject(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectUpdateInput) => {
      const { data } = await api.patch<Project>(`/projects/${id}/`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useDeleteProject(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/projects/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}
