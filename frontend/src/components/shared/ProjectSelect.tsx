import { clsx } from "clsx";

export interface ProjectSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Placeholder Sprint 1 — sélecteur de projet désactivé.
 * L'intégration API /projects/ sera réalisée dans un sprint ultérieur
 * par l'agent dédié aux listes de projets.
 *
 * La signature des props est déjà définitive pour permettre
 * l'intégration dans les formulaires sans modification.
 */
export function ProjectSelect({
  // value et onChange sont ignorés dans le placeholder — seront utilisés au sprint suivant
  value: _value,
  onChange: _onChange,
  disabled: _disabled,
  label,
  className,
}: ProjectSelectProps) {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {label && (
        <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted">
          {label}
        </span>
      )}
      <div
        className={clsx(
          "w-full flex items-center justify-between",
          "px-3 py-2.5 text-sm",
          "bg-bg-subtle border border-line rounded",
          "text-ink-disabled cursor-not-allowed"
        )}
        aria-disabled="true"
        role="combobox"
        aria-expanded="false"
        aria-label={label ?? "Projet"}
      >
        <span className="text-ink-disabled italic">À venir</span>
      </div>
    </div>
  );
}
