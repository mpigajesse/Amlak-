import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { clsx } from "clsx";
import { Menu, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";

/** Mapping path → titre de page en français */
const PAGE_TITLES: Record<string, string> = {
  [ROUTES.DASHBOARD]:     "Tableau de bord",
  [ROUTES.PROJECTS]:      "Projets",
  [ROUTES.TRANSACTIONS]:  "Transactions",
  [ROUTES.CHEQUES]:       "Chèques",
  [ROUTES.SUPPLIERS]:     "Fournisseurs",
  [ROUTES.REPORTS]:       "Rapports",
  [ROUTES.SETTINGS]:      "Paramètres",
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  // Correspondance exacte d'abord, puis préfixe pour les sous-routes
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const prefix = Object.keys(PAGE_TITLES)
    .filter((k) => k !== "/")
    .find((k) => pathname.startsWith(k));
  return prefix ? PAGE_TITLES[prefix] : "";
}

/** Initiales à partir du nom complet ou de l'email */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export interface TopbarProps {
  /** Callback pour ouvrir le drawer sidebar sur mobile */
  onMenuClick?: () => void;
  className?: string;
}

/**
 * Barre supérieure de l'AppShell.
 *
 * - Bouton hamburger (mobile) pour ouvrir la sidebar drawer
 * - Wordmark "Amlak" (mobile uniquement)
 * - Titre de la page courante (desktop)
 * - Avatar utilisateur avec menu déroulant (Profil / Paramètres / Déconnexion)
 */
export function Topbar({ onMenuClick, className }: TopbarProps) {
  const { user, logout } = useAuth();
  const pageTitle = usePageTitle();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const displayName = user
    ? user.first_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.email
    : "";

  const initials = displayName ? getInitials(displayName) : "?";

  const toggleDropdown = useCallback(() => setDropdownOpen((v) => !v), []);
  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  /* Ferme le menu sur clic extérieur ou Echap */
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDropdown();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen, closeDropdown]);

  const handleLogout = useCallback(() => {
    closeDropdown();
    void logout();
  }, [logout, closeDropdown]);

  return (
    <header
      className={clsx(
        "flex items-center justify-between h-14 px-4 md:px-6",
        "bg-bg-card border-b border-line shrink-0",
        className
      )}
      role="banner"
    >
      {/* ── Gauche ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile uniquement */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu de navigation"
          className={clsx(
            "md:hidden flex items-center justify-center w-9 h-9 -ml-1",
            "rounded text-ink-muted hover:text-ink hover:bg-black/[0.04]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          )}
          style={{ transitionDuration: "var(--transition-fast)" }}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {/* Wordmark — mobile uniquement */}
        <span className="md:hidden font-display italic text-lg text-ink tracking-tight select-none">
          Amlak
        </span>

        {/* Titre page — desktop uniquement */}
        {pageTitle && (
          <h1 className="hidden md:block font-display text-xl text-ink tracking-tight truncate">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* ── Droite : avatar + dropdown ──────────────────────────────── */}
      <div className="relative flex items-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleDropdown}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
          aria-label={`Menu utilisateur — ${displayName}`}
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 rounded",
            "text-sm text-ink-soft hover:text-ink hover:bg-black/[0.04]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          )}
          style={{ transitionDuration: "var(--transition-fast)" }}
        >
          {/* Avatar initiales */}
          <div
            className={clsx(
              "flex items-center justify-center",
              "w-7 h-7 rounded-full",
              "bg-accent-bg text-accent",
              "text-[11px] font-medium font-sans leading-none select-none"
            )}
            aria-hidden="true"
          >
            {initials}
          </div>

          {/* Nom — masqué sur très petits écrans */}
          <span className="hidden sm:block font-sans text-sm truncate max-w-[120px]">
            {displayName}
          </span>

          <ChevronDown
            size={14}
            aria-hidden="true"
            className={clsx(
              "hidden sm:block text-ink-muted transition-transform",
              dropdownOpen && "rotate-180"
            )}
            style={{ transitionDuration: "var(--transition-fast)" }}
          />
        </button>

        {/* Menu déroulant */}
        {dropdownOpen && (
          <div
            ref={dropdownRef}
            role="menu"
            aria-label="Options utilisateur"
            className={clsx(
              "absolute right-0 top-full mt-1",
              "w-48 py-1",
              "bg-bg-card border border-line rounded-lg shadow-lg",
              "z-[50]"
            )}
            style={{ zIndex: "var(--z-dropdown)" }}
          >
            {/* Infos utilisateur */}
            <div className="px-3 py-2 border-b border-line mb-1">
              <p className="text-xs font-medium text-ink truncate">{displayName}</p>
              {user?.email && (
                <p className="text-[11px] text-ink-muted truncate mt-0.5">{user.email}</p>
              )}
            </div>

            <DropdownItem
              icon={<User size={14} aria-hidden="true" />}
              label="Mon profil"
              onClick={closeDropdown}
            />
            <DropdownItem
              icon={<Settings size={14} aria-hidden="true" />}
              label="Paramètres"
              href={ROUTES.SETTINGS}
              onClick={closeDropdown}
            />

            <div className="border-t border-line mt-1 pt-1">
              <DropdownItem
                icon={<LogOut size={14} aria-hidden="true" />}
                label="Se déconnecter"
                onClick={handleLogout}
                danger
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ── Composant interne DropdownItem ────────────────────────────────────────── */

interface DropdownItemProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}

function DropdownItem({ icon, label, onClick, href, danger }: DropdownItemProps) {
  const baseClass = clsx(
    "flex items-center gap-2.5 w-full px-3 py-2",
    "text-sm font-sans transition-colors",
    "focus-visible:outline-none focus-visible:bg-black/[0.04]",
    danger
      ? "text-negative hover:bg-negative/[0.06]"
      : "text-ink-soft hover:text-ink hover:bg-black/[0.04]"
  );

  if (href) {
    return (
      <Link
        to={href}
        role="menuitem"
        className={baseClass}
        onClick={onClick}
        style={{ transitionDuration: "var(--transition-fast)" }}
      >
        {icon}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={baseClass}
      onClick={onClick}
      style={{ transitionDuration: "var(--transition-fast)" }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
