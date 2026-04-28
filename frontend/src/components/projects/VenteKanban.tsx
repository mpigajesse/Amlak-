/**
 * Kanban du cycle Vente — 4 colonnes (Stock / Réservation / Compromis / Encaissé).
 * Les unités sont draggables pour passer à l'étape suivante.
 * Chaque drag ouvre une modal de transition avec formulaire de paiement.
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
import { clsx } from "clsx";
import Decimal from "decimal.js";
import { StagePill } from "@/components/shared/StagePill";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/lib/format";
import type { StockUnit, StockUnitStatus } from "@/lib/types";

export interface VenteKanbanProps {
  units: StockUnit[];
  onUnitClick: (unit: StockUnit) => void;
  onStageTransition?: (unit: StockUnit, newStatus: StockUnitStatus) => void;
}

const VENTE_STAGES: { key: StockUnitStatus; label: string }[] = [
  { key: "stock", label: "Stock dispo" },
  { key: "reservation", label: "Réservation" },
  { key: "compromis", label: "Compromis" },
  { key: "encaisse", label: "Encaissé" },
];

const VALID_TRANSITIONS: Record<StockUnitStatus, StockUnitStatus | null> = {
  stock: "reservation",
  reservation: "compromis",
  compromis: "encaisse",
  encaisse: null,
  annule: null,
};

export function VenteKanban({
  units,
  onUnitClick,
  onStageTransition,
}: VenteKanbanProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const byStatus: Record<StockUnitStatus, StockUnit[]> = {
    stock: [],
    reservation: [],
    compromis: [],
    encaisse: [],
    annule: [],
  };
  units.forEach((u) => {
    if (u.status !== "annule") {
      byStatus[u.status].push(u);
    }
  });

  const draggingUnit = draggingId
    ? units.find((u) => u.id === draggingId)
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

    const unitId = Number(active.id);
    const newStatus = String(over.id) as StockUnitStatus;
    const unit = units.find((u) => u.id === unitId);
    if (!unit || unit.status === newStatus) return;

    // N'autoriser que la transition suivante naturelle
    const allowed = VALID_TRANSITIONS[unit.status];
    if (allowed !== newStatus) return;

    onStageTransition?.(unit, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory md:snap-none pb-4 min-h-[300px]">
        {VENTE_STAGES.map(({ key, label }) => (
          <VenteColumn
            key={key}
            status={key}
            label={label}
            items={byStatus[key]}
            draggingId={draggingId}
            onUnitClick={onUnitClick}
          />
        ))}
      </div>

      <DragOverlay>
        {draggingUnit ? <UnitCard unit={draggingUnit} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── Colonne ───────────────────────────────────────────────────────────────────

interface VenteColumnProps {
  status: StockUnitStatus;
  label: string;
  items: StockUnit[];
  draggingId: number | null;
  onUnitClick: (unit: StockUnit) => void;
}

function VenteColumn({
  status,
  label: _label,
  items,
  draggingId,
  onUnitClick,
}: VenteColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      className="flex-shrink-0 w-64 snap-start flex flex-col"
      style={{ minWidth: "240px" }}
    >
      <div className="flex items-center gap-2 mb-2 px-1">
        <StagePill stage={status} cycle="vente" />
        {items.length > 0 && (
          <span className="text-xs text-ink-muted font-mono">{items.length}</span>
        )}
      </div>

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
        {items.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            isDragging={draggingId === unit.id}
            onClick={() => onUnitClick(unit)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Card unité ────────────────────────────────────────────────────────────────

interface UnitCardProps {
  unit: StockUnit;
  isDragging?: boolean;
  onClick?: () => void;
}

function UnitCard({ unit, isDragging = false, onClick }: UnitCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: unit.id,
    disabled: unit.status === "encaisse" || unit.status === "annule",
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  // Calcul progression paiement
  let progressPct = 0;
  if (unit.status !== "stock") {
    try {
      const received = new Decimal(unit.total_received || "0");
      const target = new Decimal(unit.price_target || "1");
      if (!target.isZero()) {
        progressPct = Math.min(
          received.div(target).mul(100).toNumber(),
          100
        );
      }
    } catch {
      progressPct = 0;
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      tabIndex={0}
      role="button"
      aria-label={`Unité ${unit.reference}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onClick={onClick}
      className={clsx(
        "bg-bg-card border border-line rounded-lg p-3",
        "cursor-pointer transition-all select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isDragging && "opacity-40",
        !isDragging && unit.status !== "encaisse" && "cursor-grab active:cursor-grabbing",
        !isDragging && "hover:border-line-strong hover:shadow-sm",
        unit.status === "encaisse" && "cursor-default"
      )}
      style={
        { ...style, transitionDuration: "var(--transition-fast)" } as React.CSSProperties
      }
    >
      {/* Référence + type */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <div>
          <span className="text-xs font-medium text-ink font-mono">
            {unit.reference}
          </span>
          <span className="text-xs text-ink-muted ml-1">· {unit.unit_type}</span>
        </div>
        {unit.status === "encaisse" && (
          <Badge variant="positive">Payé</Badge>
        )}
      </div>

      {/* Surface + étage */}
      <p className="text-xs text-ink-muted mb-2">
        {unit.surface} m²
        {unit.floor && ` · ${unit.floor}`}
      </p>

      {/* Acheteur (si réservé+) */}
      {unit.buyer_name && (
        <p className="text-xs font-medium text-ink mb-1 truncate">
          {unit.buyer_name}
        </p>
      )}

      {/* Prix cible */}
      <MoneyDisplay value={unit.price_target} positive={undefined} className="text-sm" />

      {/* Barre de progression paiement (si réservé+) */}
      {unit.status !== "stock" && (
        <div className="mt-2">
          <div className="h-1 bg-line rounded-sm overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-sm transition-all",
                progressPct >= 100 ? "bg-positive" : "bg-accent"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-ink-muted mt-0.5 font-mono">
            {formatMoney(unit.total_received)} / {formatMoney(unit.price_target)} DH
          </p>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function VenteKanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {VENTE_STAGES.map(({ key }) => (
        <div key={key} className="flex-shrink-0 w-64 space-y-2">
          <Skeleton variant="text" className="w-24 h-5" />
          <Skeleton variant="rect" className="h-20 w-full" />
          <Skeleton variant="rect" className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
