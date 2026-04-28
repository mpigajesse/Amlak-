import type { ReactNode } from "react";
import { clsx } from "clsx";

export interface PageHeaderProps {
  /** Titre principal de la page (Fraunces) */
  title: string;
  /** Sous-titre optionnel — description courte */
  subtitle?: string;
  /** Boutons / actions affichés à droite */
  actions?: ReactNode;
  className?: string;
}

/**
 * En-tête de page réutilisable.
 *
 * Usage :
 * ```tsx
 * <PageHeader
 *   title="Projets"
 *   subtitle="12 projets actifs"
 *   actions={<Button variant="primary"><Plus size={16} /> Nouveau projet</Button>}
 * />
 * ```
 *
 * - Titre en Fraunces (font-display)
 * - Sous-titre optionnel en IBM Plex Sans muted
 * - Actions à droite (desktop) ou en-dessous sur mobile très étroit
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={clsx(
        "flex flex-col sm:flex-row sm:items-start sm:justify-between",
        "gap-3 mb-6",
        className
      )}
    >
      {/* Titre + sous-titre */}
      <div className="min-w-0">
        <h1 className="font-display text-2xl md:text-3xl text-ink tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-ink-muted font-sans">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
