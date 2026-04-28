import {
  Search,
  MessageCircle,
  FileText,
  Handshake,
  BookmarkCheck,
  CheckCircle2,
  Package,
  CalendarCheck,
  Banknote,
  XCircle,
  Activity,
  Archive,
} from "lucide-react";
import { clsx } from "clsx";
import type { ProjectStage, StockUnitStage } from "@/lib/types";

// Union des stages connus
type KnownStage = ProjectStage | StockUnitStage | "annule" | "actif" | "cloture";

export interface StagePillProps {
  stage: KnownStage | string;
  cycle?: "achat" | "vente";
  className?: string;
}

interface StageMeta {
  label: string;
  variant: "accent" | "warning" | "default" | "positive" | "negative";
  Icon: React.ElementType;
}

const STAGE_META: Record<string, StageMeta> = {
  // Cycle Achat
  opportunite: {
    label: "Opportunité",
    variant: "default",
    Icon: Search,
  },
  negociation: {
    label: "Négociation",
    variant: "warning",
    Icon: MessageCircle,
  },
  promis: {
    label: "Promis",
    variant: "warning",
    Icon: FileText,
  },
  compromis: {
    label: "Compromis",
    variant: "accent",
    Icon: Handshake,
  },
  reserve: {
    label: "Réservé",
    variant: "accent",
    Icon: BookmarkCheck,
  },
  achete: {
    label: "Acheté",
    variant: "positive",
    Icon: CheckCircle2,
  },
  // Cycle Vente
  stock: {
    label: "Stock dispo",
    variant: "accent",
    Icon: Package,
  },
  reservation: {
    label: "Réservé",
    variant: "warning",
    Icon: CalendarCheck,
  },
  encaisse: {
    label: "Encaissé",
    variant: "positive",
    Icon: Banknote,
  },
  // États généraux
  annule: {
    label: "Annulé",
    variant: "negative",
    Icon: XCircle,
  },
  actif: {
    label: "Actif",
    variant: "accent",
    Icon: Activity,
  },
  cloture: {
    label: "Clôturé",
    variant: "default",
    Icon: Archive,
  },
};

const VARIANT_CLASSES: Record<StageMeta["variant"], string> = {
  default: "bg-black/5 text-ink-soft",
  accent: "bg-accent-bg text-accent",
  positive: "bg-[rgba(31,61,43,0.10)] text-positive",
  negative: "bg-[rgba(124,45,40,0.10)] text-negative",
  warning: "bg-[rgba(143,90,31,0.10)] text-warning",
};

/**
 * Badge de statut pour les cycles Achat et Vente.
 * Affiche un label FR + icône lucide-react selon le stage.
 * Le prop `cycle` est documenté pour usage futur (affichage conditionnel).
 */
export function StagePill({ stage, cycle: _cycle, className }: StagePillProps) {
  const meta: StageMeta = STAGE_META[stage] ?? {
    label: stage,
    variant: "default",
    Icon: Activity,
  };

  const { label, variant, Icon } = meta;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1",
        "px-2 py-0.5",
        "text-[10px] uppercase tracking-wider font-medium",
        "rounded-[3px]",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      <Icon size={10} aria-hidden="true" />
      {label}
    </span>
  );
}
