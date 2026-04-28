import { useEffect, useRef, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Briefcase,
  ArrowRightLeft,
  FileText,
  Users,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: ROUTES.DASHBOARD,
    icon: <LayoutDashboard size={18} aria-hidden="true" />,
    label: "Accueil",
    end: true,
  },
  {
    to: ROUTES.PROJECTS,
    icon: <Briefcase size={18} aria-hidden="true" />,
    label: "Projets",
  },
  {
    to: ROUTES.TRANSACTIONS,
    icon: <ArrowRightLeft size={18} aria-hidden="true" />,
    label: "Transactions",
  },
  {
    to: ROUTES.CHEQUES,
    icon: <FileText size={18} aria-hidden="true" />,
    label: "Chèques",
  },
  {
    to: ROUTES.SUPPLIERS,
    icon: <Users size={18} aria-hidden="true" />,
    label: "Fournisseurs",
  },
  {
    to: ROUTES.REPORTS,
    icon: <BarChart3 size={18} aria-hidden="true" />,
    label: "Rapports",
  },
  {
    to: ROUTES.SETTINGS,
    icon: <Settings size={18} aria-hidden="true" />,
    label: "Paramètres",
  },
];

export interface SidebarProps {
  /** Contrôle l'ouverture du drawer sur mobile */
  mobileOpen?: boolean;
  /** Callback quand l'utilisateur ferme le drawer mobile */
  onMobileClose?: () => void;
  className?: string;
}

/**
 * Sidebar de navigation principale.
 *
 * Desktop (≥ 768px) : panneau fixe à gauche, toujours visible.
 * Mobile (< 768px) : drawer overlay, ouvert/fermé via mobileOpen.
 *
 * Accessibilité :
 * - aria-current="page" géré par NavLink
 * - Fermeture sur Echap dans le drawer
 * - aria-label sur les éléments nav
 */
export function Sidebar({ mobileOpen = false, onMobileClose, className }: SidebarProps) {
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  /* Ferme le drawer sur Echap + verrouille le scroll body */
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onMobileClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen, onMobileClose]);

  /* Focus automatique à l'ouverture du drawer */
  useEffect(() => {
    if (mobileOpen && mobileDrawerRef.current) {
      const id = requestAnimationFrame(() => {
        mobileDrawerRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [mobileOpen]);

  return (
    <>
      {/* ── Sidebar desktop (toujours visible ≥ md) ────────────── */}
      <aside
        className={clsx(
          "hidden md:flex flex-col",
          "bg-bg-card border-r border-line",
          "py-4 md:w-60 md:min-h-screen md:shrink-0",
          className
        )}
        aria-label="Navigation principale"
      >
        <SidebarInner onNavClick={undefined} />
      </aside>

      {/* ── Drawer mobile — portal ───────────────────────────────── */}
      {mobileOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              aria-hidden="true"
              onClick={onMobileClose}
            />

            {/* Panel */}
            <div
              ref={mobileDrawerRef}
              tabIndex={-1}
              className={clsx(
                "absolute left-0 top-0 bottom-0",
                "w-72 max-w-[85vw]",
                "flex flex-col",
                "bg-bg-card border-r border-line",
                "py-4",
                "sidebar-drawer-in"
              )}
            >
              {/* Bouton fermeture */}
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Fermer le menu"
                className={clsx(
                  "absolute top-3 right-3",
                  "flex items-center justify-center w-8 h-8",
                  "rounded text-ink-muted hover:text-ink hover:bg-black/[0.04]",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                )}
                style={{ transitionDuration: "var(--transition-fast)" }}
              >
                <X size={18} aria-hidden="true" />
              </button>

              <SidebarInner onNavClick={onMobileClose} />
            </div>

            <style>{`
              @keyframes sidebarDrawerIn {
                from { transform: translateX(-100%); }
                to   { transform: translateX(0); }
              }
              .sidebar-drawer-in {
                animation: sidebarDrawerIn 200ms ease-out both;
              }
            `}</style>
          </div>,
          document.body
        )}
    </>
  );
}

/* ── Contenu interne partagé desktop + drawer ──────────────────────────────── */

interface SidebarInnerProps {
  /** Callback au clic sur un lien nav (pour fermer le drawer mobile) */
  onNavClick: (() => void) | undefined;
}

function SidebarInner({ onNavClick }: SidebarInnerProps) {
  return (
    <>
      {/* Wordmark */}
      <div className="px-5 pb-5 border-b border-line mb-2">
        <span className="font-display italic text-xl text-ink tracking-tight select-none">
          Amlak
        </span>
      </div>

      {/* Nav links */}
      <nav
        className="flex-1 px-2 overflow-y-auto scrollbar-thin"
        aria-label="Navigation principale"
      >
        <ul role="list" className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavClick}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded",
                    "text-sm font-sans transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
                    isActive
                      ? "bg-accent-bg text-accent font-medium"
                      : "text-ink-soft hover:bg-black/[0.04] hover:text-ink"
                  )
                }
                style={{ transitionDuration: "var(--transition-fast)" }}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        "shrink-0 transition-colors",
                        isActive ? "text-accent" : "text-ink-muted"
                      )}
                      style={{ transitionDuration: "var(--transition-fast)" }}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Pied : indicateur sprint */}
      <div className="px-5 pt-4 border-t border-line mt-auto">
        <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-disabled select-none">
          Sprint 1
        </span>
      </div>
    </>
  );
}
