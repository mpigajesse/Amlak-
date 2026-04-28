/**
 * Kanban du cycle Achat — 6 colonnes drag-drop via @dnd-kit.
 * Optimistic update sur dragEnd, rollback si erreur 422 / réseau.
 */

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { StagePill } from "@/components/shared/StagePill";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUpdateAcquisitionStage } from "@/api/acquisitions";
import { useToastContext } from "@/components/ui/ToastProvider";
import type { Acquisition, Project, ProjectStage } from "@/lib/types";

export interface AcquisitionKanbanProps {
  project: Project;
  onAddAcquisition?: () => void;
  onEditAcquisition?: (acq: Acquisition) => void;
  onAcquisitionPurchased?: (acq: Acquisition) => void;
}

const STAGES: { key: ProjectStage; label: string }[] = [
  { key: "opportunite", label: "Opportunité" },
  { key: "negociation", label: "Négociation" },
  { key: "promis", label: "Promis" },
  { key: "compromis", label: "Compromis" },
  { key: "reserve", label: "Réservé" },
  { key: "achete", label: "Acheté" },
];

export function AcquisitionKanban({
  project,
  onAddAcquisition,
  onEditAcquisition,
  onAcquisitionPurchased,
}: AcquisitionKanbanProps) {
  const { show: showToast } = useToastContext();
  const updateStage = useUpdateAcquisitionStage();
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const byStage: Partial<Record<ProjectStage, Acquisition[]>> =
    project.acquisitions_by_stage ?? {};
  const allAcqs: Acquisition[] = Object.values(byStage).flat();
  const draggingAcq = draggingId
    ? allAcqs.find((a) => a.id === draggingId) ?? null
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;

    const acqId = Number(active.id);
    const newStage = String(over.id) as ProjectStage;
    const acq = allAcqs.find((a) => a.id === acqId);
    if (!acq || acq.stage === newStage) return;

    updateStage.mutate(
      { id: acqId, stage: newStage, projectId: project.id },
      {
        onError: () => {
          showToast("Impossible de déplacer l'acquisition", "error");
        },
        onSuccess: (data) => {
          if (data.stage === "achete") {
            showToast(
              `Acquisition "${data.label}" passée en acheté`,
              "success"
            );
            onAcquisitionPurchased?.(data);
          }
        },
      }
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory md:snap-none pb-4 min-h-[400px]">
        {STAGES.map(({ key }) => (
          <KanbanColumn
            key={key}
            stage={key}
            items={byStage[key] ?? []}
            draggingId={draggingId}
            onAddAcquisition={key === "opportunite" ? onAddAcquisition : undefined}
            onEdit={onEditAcquisition}
          />
        ))}
      </div>

      <DragOverlay>
        {draggingAcq ? (
          <AcquisitionCard acq={draggingAcq} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── Colonne ───────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: ProjectStage;
  items: Acquisition[];
  draggingId: number | null;
  onAddAcquisition?: () => void;
  onEdit?: (acq: Acquisition) => void;
}

function KanbanColumn({
  stage,
  items,
  draggingId,
  onAddAcquisition,
  onEdit,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });

  return (
    <div
      className="flex-shrink-0 w-64 snap-start flex flex-col"
      style={{ minWidth: "240px" }}
    >
      {/* Header de colonne */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <StagePill stage={stage} />
          {items.length > 0 && (
            <span className="text-xs text-ink-muted font-mono">
              {items.length}
            </span>
          )}
        </div>
        {onAddAcquisition && (
          <Button
            size="sm"
            variant="ghost"
            aria-label="Ajouter une acquisition"
            onClick={onAddAcquisition}
          >
            <Plus size={14} aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Zone droppable */}
      <div
        ref={setNodeRef}
        className={clsx(
          "flex flex-col gap-2 flex-1 p-2 rounded-lg min-h-[200px]",
          "transition-colors",
          isOver
            ? "bg-accent-bg border-2 border-dashed border-accent"
            : "bg-black/[0.02] border-2 border-transparent"
        )}
        style={{ transitionDuration: "var(--transition-fast)" }}
      >
        {items.length === 0 && !draggingId && (
          <p className="text-xs text-ink-muted text-center py-4">Vide</p>
        )}
        {items.map((acq) => (
          <AcquisitionCard
            key={acq.id}
            acq={acq}
            isDragging={draggingId === acq.id}
            onClick={() => onEdit?.(acq)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface AcquisitionCardProps {
  acq: Acquisition;
  isDragging?: boolean;
  onClick?: () => void;
}

function AcquisitionCard({
  acq,
  isDragging = false,
  onClick,
}: AcquisitionCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: acq.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      tabIndex={0}
      role="button"
      aria-label={`Acquisition : ${acq.label}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onClick={onClick}
      className={clsx(
        "bg-bg-card border border-line rounded-lg p-3",
        "cursor-grab active:cursor-grabbing",
        "transition-all select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isDragging && "opacity-40",
        !isDragging && "hover:border-line-strong hover:shadow-sm"
      )}
      style={
        { ...style, transitionDuration: "var(--transition-fast)" } as React.CSSProperties
      }
    >
      {/* Titre + badge option */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-sm font-medium text-ink leading-tight line-clamp-2">
          {acq.label}
        </span>
        {acq.option_days_left != null && acq.option_days_left <= 7 && (
          <Badge variant="warning" className="flex-shrink-0 ml-1">
            <AlertTriangle size={10} aria-hidden="true" />
            J-{acq.option_days_left}
          </Badge>
        )}
      </div>

      {/* Surface + vendeur */}
      {(acq.surface || acq.seller_name) && (
        <p className="text-xs text-ink-muted mb-2 line-clamp-1">
          {acq.surface && `${acq.surface} m²`}
          {acq.surface && acq.seller_name && " · "}
          {acq.seller_name}
        </p>
      )}

      {/* Montant */}
      {(acq.price_agreed || acq.price_target) && (
        <MoneyDisplay
          value={acq.price_agreed ?? acq.price_target ?? "0"}
          positive={undefined}
          className="text-sm"
        />
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function AcquisitionKanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map(({ key }) => (
        <div key={key} className="flex-shrink-0 w-64 space-y-2">
          <Skeleton variant="text" className="w-24 h-5" />
          <Skeleton variant="rect" className="h-20 w-full" />
          <Skeleton variant="rect" className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
