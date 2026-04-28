/**
 * Tableau de la liste des projets.
 * Desktop : table responsive. Mobile : cards empilées via le composant Table.
 */

import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { StagePill } from "@/components/shared/StagePill";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { Badge } from "@/components/ui/Badge";
import type { Project } from "@/lib/types";

export interface ProjectsTableProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectsTable({
  projects,
  onEdit,
  onDelete,
}: ProjectsTableProps) {
  return (
    <Table responsive>
      <TableHead>
        <tr>
          <TableHeader>Nom</TableHeader>
          <TableHeader>Stage</TableHeader>
          <TableHeader align="right">Budget total</TableHeader>
          <TableHeader align="right">Position cash</TableHeader>
          <TableHeader align="right">Unités</TableHeader>
          <TableHeader />
        </tr>
      </TableHead>
      <TableBody>
        {projects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}

// ── Ligne individuelle ────────────────────────────────────────────────────────

interface ProjectRowProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function ProjectRow({ project, onEdit, onDelete }: ProjectRowProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Ferme le menu au clic extérieur
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const position = project.position?.net;

  return (
    <TableRow
      onClick={() => navigate(`/projets/${project.id}`)}
      className="group"
    >
      {/* Nom */}
      <TableCell label="Nom">
        <span className="font-medium text-ink group-hover:text-accent transition-colors">
          {project.name}
        </span>
        {project.location && (
          <span className="block text-xs text-ink-muted mt-0.5">
            {project.location}
          </span>
        )}
      </TableCell>

      {/* Stage */}
      <TableCell label="Stage">
        <StagePill stage={project.stage} />
      </TableCell>

      {/* Budget total */}
      <TableCell label="Budget total" align="right">
        <MoneyDisplay value={project.budget_total ?? "0"} positive={undefined} />
      </TableCell>

      {/* Position cash */}
      <TableCell label="Position cash" align="right">
        {position ? (
          <MoneyDisplay value={position} />
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </TableCell>

      {/* Unités */}
      <TableCell label="Unités" align="right">
        <span className="font-mono tabular-nums text-sm text-ink">
          {project.units_sold_count}
          <span className="text-ink-muted">/{project.units_count}</span>
        </span>
        {project.units_count > 0 && (
          <span className="ml-1">
            <Badge variant="neutral">
              {Math.round(
                (project.units_sold_count / project.units_count) * 100
              )}
              %
            </Badge>
          </span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell label="Actions" align="right">
        <div
          ref={menuRef}
          className="relative inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Actions"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={clsx(
              "flex items-center justify-center w-7 h-7 rounded",
              "text-ink-muted hover:text-ink hover:bg-black/[0.04]",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            )}
            style={{ transitionDuration: "var(--transition-fast)" }}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              className={clsx(
                "absolute right-0 z-[50] mt-1 w-44",
                "bg-bg-card border border-line rounded-lg shadow-lg",
                "py-1"
              )}
              style={{ boxShadow: "var(--shadow-lg)" }}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(project);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink hover:bg-black/[0.04] transition-colors"
              >
                <Pencil size={14} aria-hidden="true" />
                Modifier
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(project);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-negative hover:bg-negative/[0.06] transition-colors"
              >
                <Trash2 size={14} aria-hidden="true" />
                Supprimer
              </button>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
