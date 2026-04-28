/**
 * Grille responsive de cards unités.
 * Vue alternative au kanban (toggle depuis l'onglet Stock & Ventes).
 */

import { Home } from "lucide-react";
import { clsx } from "clsx";
import { StagePill } from "@/components/shared/StagePill";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { StockUnit } from "@/lib/types";

export interface StockGridProps {
  units: StockUnit[];
  onUnitClick: (unit: StockUnit) => void;
}

export function StockGrid({ units, onUnitClick }: StockGridProps) {
  if (units.length === 0) {
    return (
      <EmptyState
        icon={Home}
        title="Aucune unité"
        description="Générez le stock depuis une acquisition pour commencer à vendre."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {units
        .filter((u) => u.status !== "annule")
        .map((unit) => (
          <UnitGridCard key={unit.id} unit={unit} onClick={() => onUnitClick(unit)} />
        ))}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface UnitGridCardProps {
  unit: StockUnit;
  onClick: () => void;
}

function UnitGridCard({ unit, onClick }: UnitGridCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "bg-bg-card border border-line rounded-lg p-4 text-left",
        "hover:border-line-strong hover:shadow-sm",
        "transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "w-full"
      )}
      style={{ transitionDuration: "var(--transition-fast)" }}
    >
      {/* Icône + référence */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-bg-subtle text-ink-muted"
          aria-hidden="true"
        >
          <Home size={20} />
        </div>
        <StagePill stage={unit.status} cycle="vente" />
      </div>

      {/* Référence + type */}
      <p className="text-sm font-medium text-ink font-mono mb-0.5">
        {unit.reference}
      </p>
      <p className="text-xs text-ink-muted mb-2">
        {unit.unit_type}
        {unit.floor && ` · ${unit.floor}`}
      </p>

      {/* Surface */}
      <p className="text-xs text-ink-muted mb-3">
        {unit.surface} m²
      </p>

      {/* Acheteur */}
      {unit.buyer_name && (
        <p className="text-xs text-ink font-medium mb-2 truncate">
          {unit.buyer_name}
        </p>
      )}

      {/* Prix */}
      <MoneyDisplay value={unit.price_target} positive={undefined} className="text-base font-medium" />

      {/* Marge si disponible */}
      {unit.margin && (
        <p
          className={clsx(
            "text-xs font-mono mt-1",
            unit.margin.pct >= 0 ? "text-positive" : "text-negative"
          )}
        >
          Marge : {unit.margin.pct.toFixed(1)} %
        </p>
      )}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function StockGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-bg-card border border-line rounded-lg p-4 space-y-2">
          <Skeleton variant="rect" className="h-10 w-10" />
          <Skeleton variant="text" className="w-20" />
          <Skeleton variant="text" className="w-16 h-3" />
          <Skeleton variant="text" className="w-24 h-4 mt-2" />
        </div>
      ))}
    </div>
  );
}
