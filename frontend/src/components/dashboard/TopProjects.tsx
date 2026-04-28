/**
 * TopProjects — Top projets actifs avec StagePill et BudgetBar.
 * Affiche les 5 projets actifs les plus récents.
 * Note : volume par projet nécessiterait N appels cash-position.
 * MVP : on affiche les projets triés par created_at desc avec budget_status.
 */

import { Link } from "react-router-dom";
import { FolderOpen, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StagePill } from "@/components/shared/StagePill";
import { BudgetBar } from "@/components/shared/BudgetBar";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { useDashboardProjects } from "@/api/dashboard";
import type { Project } from "@/lib/types";

// ── Ligne projet ──────────────────────────────────────────────────────────────

interface ProjectRowProps {
  project: Project;
}

function ProjectRow({ project }: ProjectRowProps) {
  const consumed = project.position?.total_out ?? "0";
  const budget = project.budget_total;

  return (
    <li className="py-3 border-b border-line last:border-b-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-col min-w-0">
          <Link
            to={`/projets/${project.id}`}
            className="text-sm font-medium text-ink hover:text-accent transition-colors truncate"
            aria-label={`Voir le projet ${project.name}`}
          >
            {project.name}
          </Link>
          {project.location && (
            <span className="text-xs text-ink-muted mt-0.5 truncate">
              {project.location}
            </span>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <StagePill stage={project.stage} />
          <MoneyDisplay
            value={budget}
            className="text-xs text-ink-muted"
          />
        </div>
      </div>

      {/* BudgetBar global */}
      <BudgetBar
        consumed={consumed}
        budget={budget}
        label="Consommé"
        className="mt-1"
      />
    </li>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export interface TopProjectsProps {
  className?: string;
}

export function TopProjects({ className }: TopProjectsProps) {
  const { data: projects, isLoading, error } = useDashboardProjects();

  return (
    <Card className={clsx("flex flex-col", className)} aria-label="Projets actifs">
      <CardHeader>
        <h2 className="font-sans text-sm font-semibold text-ink">
          Projets actifs
        </h2>
        {projects?.length ? (
          <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            {projects.length} projet{projects.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        {isLoading ? (
          <ul className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="py-3 border-b border-line last:border-b-0">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton variant="text" className="w-40 h-4" />
                    <Skeleton variant="text" className="w-24 h-3" />
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <Skeleton variant="rect" className="w-16 h-5" />
                    <Skeleton variant="text" className="w-20 h-3" />
                  </div>
                </div>
                <Skeleton variant="rect" className="w-full h-5" />
              </li>
            ))}
          </ul>
        ) : error || !projects ? (
          <EmptyState
            icon={FolderOpen}
            title="Impossible de charger les projets"
            className="py-8"
          />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Aucun projet actif"
            description="Créez votre premier projet pour le voir ici."
            className="py-8"
          />
        ) : (
          <ul
            className="flex flex-col"
            aria-label="Liste des projets actifs"
          >
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}
      </CardContent>

      {projects && projects.length > 0 && (
        <CardFooter className="justify-start">
          <Link
            to="/projets"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
            aria-label="Voir tous les projets"
          >
            Voir tous les projets
            <ChevronRight size={12} aria-hidden="true" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
