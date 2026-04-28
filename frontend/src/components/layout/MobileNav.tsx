import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Briefcase,
  ArrowRightLeft,
  FileText,
  Settings,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

interface MobileNavItem {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}

/**
 * 5 items max — en cohérence avec les routes principales.
 * "Rapports" et "Fournisseurs" accessibles via la sidebar drawer.
 */
const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    to: ROUTES.DASHBOARD,
    icon: <LayoutDashboard size={20} aria-hidden="true" />,
    label: "Accueil",
    end: true,
  },
  {
    to: ROUTES.PROJECTS,
    icon: <Briefcase size={20} aria-hidden="true" />,
    label: "Projets",
  },
  {
    to: ROUTES.TRANSACTIONS,
    icon: <ArrowRightLeft size={20} aria-hidden="true" />,
    label: "Transactions",
  },
  {
    to: ROUTES.CHEQUES,
    icon: <FileText size={20} aria-hidden="true" />,
    label: "Chèques",
  },
  {
    to: ROUTES.SETTINGS,
    icon: <Settings size={20} aria-hidden="true" />,
    label: "Paramètres",
  },
];

/**
 * Navigation bas de page — mobile uniquement (< 768px).
 *
 * - 5 items maximum avec icône + label
 * - État actif : couleur accent + léger scale sur l'icône
 * - aria-current="page" sur le lien actif
 * - Safe area inset bottom (iOS)
 */
export function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0"
      aria-label="Navigation mobile"
      style={{ zIndex: "var(--z-dropdown)" }}
    >
      <div
        className="bg-bg-card border-t border-line px-1"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        <ul role="list" className="flex items-center justify-around">
          {MOBILE_NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "flex flex-col items-center justify-center gap-0.5",
                    "py-2.5 px-1 min-h-[48px]",
                    "text-[10px] font-medium font-sans tracking-wide uppercase",
                    "transition-colors",
                    isActive
                      ? "text-accent"
                      : "text-ink-muted hover:text-ink-soft"
                  )
                }
                style={{ transitionDuration: "var(--transition-fast)" }}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        "transition-transform",
                        isActive ? "scale-110 text-accent" : "text-ink-muted"
                      )}
                      style={{ transitionDuration: "var(--transition-fast)" }}
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
      </div>
    </nav>
  );
}
