/**
 * Page liste des projets — /projets
 * Filtres (stage, search), table desktop / cards mobile, modal création.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";
import { Plus, Search, FolderOpen } from "lucide-react";
import { isAxiosError } from "axios";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useProjects, useCreateProject, useDeleteProject } from "@/api/projects";
import { useToastContext } from "@/components/ui/ToastProvider";
import type { Project, ProjectLifecycleStage, ProjectFilters } from "@/lib/types";
import type { ProjectCreateValues } from "@/lib/validation";

const STAGE_OPTIONS = [
  { value: "", label: "Tous les stages" },
  { value: "opportunite", label: "Opportunité" },
  { value: "actif", label: "Actif" },
  { value: "cloture", label: "Clôturé" },
];

export function ProjectsPage() {
  useTitle("Projets");
  const navigate = useNavigate();
  const { show: showToast } = useToastContext();

  // Filtres
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<ProjectLifecycleStage | "">("");

  const filters: ProjectFilters = {
    ...(search.trim() && { search: search.trim() }),
    ...(stageFilter && { stage: stageFilter }),
  };

  const { data, isLoading, error } = useProjects(filters);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const createProject = useCreateProject();
  const deleteProject = useDeleteProject(deletingProject?.id ?? 0);

  const handleCreate = async (values: ProjectCreateValues) => {
    try {
      const project = await createProject.mutateAsync(values);
      showToast(`Projet « ${project.name} » créé`, "success");
      setShowCreateModal(false);
      navigate(`/projets/${project.id}`);
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.errors?.name) {
        throw err; // ProjectForm handle les erreurs champ par champ
      }
      showToast(
        isAxiosError(err)
          ? (err.response?.data?.detail ?? "Erreur inattendue")
          : "Erreur inattendue",
        "error"
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    try {
      await deleteProject.mutateAsync();
      showToast(`Projet « ${deletingProject.name} » supprimé`, "success");
      setDeletingProject(null);
    } catch (err) {
      showToast(
        isAxiosError(err)
          ? (err.response?.data?.detail ?? "Impossible de supprimer ce projet")
          : "Erreur inattendue",
        "error"
      );
    }
  };

  const projects = data?.results ?? [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Projets"
        subtitle={
          data
            ? `${data.count} projet${data.count !== 1 ? "s" : ""}`
            : undefined
        }
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            Nouveau projet
          </Button>
        }
      />

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un projet…"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-52">
          <Select
            value={stageFilter}
            onChange={(v) =>
              setStageFilter(v as ProjectLifecycleStage | "")
            }
            options={STAGE_OPTIONS}
            aria-label="Filtrer par stage"
          />
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <ProjectsTableSkeleton />
      ) : error ? (
        <div className="py-10 text-center text-sm text-negative">
          Erreur lors du chargement des projets.
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={
            search || stageFilter
              ? "Aucun projet ne correspond aux filtres"
              : "Aucun projet pour l'instant"
          }
          description={
            search || stageFilter
              ? "Essayez d'autres filtres ou créez un nouveau projet."
              : "Commencez par créer votre première opération immobilière."
          }
          action={
            !search && !stageFilter ? (
              <Button
                variant="primary"
                iconLeft={<Plus size={16} />}
                onClick={() => setShowCreateModal(true)}
              >
                Nouveau projet
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ProjectsTable
          projects={projects}
          onEdit={(project) => setEditingProject(project)}
          onDelete={(project) => setDeletingProject(project)}
        />
      )}

      {/* Modal création */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouveau projet"
        size="lg"
        disableBackdropClose={createProject.isPending}
      >
        <ProjectForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          isSubmitting={createProject.isPending}
        />
      </Modal>

      {/* Modal édition */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}

      {/* Modal confirmation suppression */}
      <Modal
        open={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        title="Supprimer le projet ?"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeletingProject(null)}
              disabled={deleteProject.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              loading={deleteProject.isPending}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Voulez-vous vraiment supprimer le projet{" "}
          <strong>« {deletingProject?.name} »</strong> ? Cette action est
          irréversible.
        </p>
        <p className="text-xs text-ink-muted mt-2">
          La suppression est impossible si des transactions sont liées à ce
          projet.
        </p>
      </Modal>
    </div>
  );
}

// ── Edition inline ──────────────────────────────────────────────────────────��─

import { useUpdateProject } from "@/api/projects";

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
}

function EditProjectModal({ project, onClose }: EditProjectModalProps) {
  const { show: showToast } = useToastContext();
  const updateProject = useUpdateProject(project.id);

  const handleUpdate = async (values: ProjectCreateValues) => {
    try {
      await updateProject.mutateAsync(values);
      showToast("Projet mis à jour", "success");
      onClose();
    } catch (err) {
      showToast(
        isAxiosError(err)
          ? (err.response?.data?.detail ?? "Erreur inattendue")
          : "Erreur inattendue",
        "error"
      );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Modifier — ${project.name}`}
      size="lg"
      disableBackdropClose={updateProject.isPending}
    >
      <ProjectForm
        initialValues={project}
        onSubmit={handleUpdate}
        onCancel={onClose}
        isSubmitting={updateProject.isPending}
      />
    </Modal>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProjectsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="rect" className="h-14 w-full" />
      ))}
    </div>
  );
}
