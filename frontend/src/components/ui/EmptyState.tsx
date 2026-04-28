import { type ReactNode, type ComponentType } from "react";
import { clsx } from "clsx";
import { type LucideProps } from "lucide-react";

export interface EmptyStateProps {
  /** Icône lucide-react (composant, pas instance JSX) */
  icon?: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Composant pour les états vides (listes vides, aucune donnée).
 * Centré verticalement, icône en haut, titre font-display, description muted.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center",
        "py-16 px-4",
        className
      )}
    >
      {Icon && (
        <div
          className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-bg-subtle text-ink-muted"
          aria-hidden="true"
        >
          <Icon size={24} />
        </div>
      )}

      <h3 className="font-display text-lg text-ink mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-ink-muted max-w-md leading-relaxed mb-4">
          {description}
        </p>
      )}

      {action && (
        <div className={clsx(!description && "mt-4")}>{action}</div>
      )}
    </div>
  );
}
