import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";
import { useSuppliers } from "@/api/suppliers";

export interface SupplierSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Sélecteur de fournisseur avec recherche temps réel.
 * Remplace le placeholder Sprint 1.
 * API : GET /suppliers/?search=&is_active=true
 */
export function SupplierSelect({
  value,
  onChange,
  disabled = false,
  label,
  className,
}: SupplierSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useSuppliers({
    ...(search ? { search } : {}),
    is_active: true,
  });

  const suppliers = data?.results ?? [];
  const selected = value
    ? suppliers.find((s) => s.id === value) ?? null
    : null;

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  // Ferme au clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      {label && (
        <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans block mb-1.5">
          {label}
        </span>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className={clsx(
          "w-full flex items-center justify-between gap-2",
          "px-3 py-2.5 text-sm font-sans",
          "bg-bg border border-line rounded",
          "transition-colors focus:outline-none",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-bg-subtle",
          open ? "border-accent text-ink" : "hover:border-line-strong text-ink"
        )}
        style={{ transitionDuration: "var(--transition-fast)" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ?? "Fournisseur"}
      >
        <span className={clsx("truncate text-left", !selected && "text-ink-muted")}>
          {selected ? selected.name : "Sélectionner un fournisseur…"}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={clsx(
            "flex-shrink-0 text-ink-muted transition-transform",
            open && "rotate-180"
          )}
          style={{ transitionDuration: "var(--transition-fast)" }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={clsx(
            "absolute z-[50] w-full mt-1",
            "bg-bg-card border border-line rounded-lg shadow-lg",
            "max-h-60 overflow-hidden flex flex-col",
            "focus:outline-none"
          )}
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          {/* Search */}
          <div className="px-2 py-2 border-b border-line flex-shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              autoFocus
              className="w-full px-2 py-1.5 text-sm font-sans bg-bg-subtle rounded border border-line focus:outline-none focus:border-accent placeholder:text-ink-muted"
            />
          </div>

          {/* Option "Aucun" */}
          <ul role="listbox" className="overflow-y-auto py-1 flex-1">
            <li
              role="option"
              aria-selected={value === null}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(null);
                close();
              }}
              className={clsx(
                "flex items-center justify-between px-3 py-2.5 text-sm font-sans cursor-pointer",
                "transition-colors hover:bg-black/[0.03]",
                value === null && "font-medium"
              )}
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              <span className="text-ink-muted italic">Aucun fournisseur</span>
              {value === null && (
                <Check size={14} aria-hidden="true" className="text-accent" />
              )}
            </li>

            {suppliers.map((s) => {
              const isSelected = s.id === value;
              return (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s.id);
                    close();
                  }}
                  className={clsx(
                    "flex items-center justify-between px-3 py-2.5 text-sm font-sans cursor-pointer",
                    "transition-colors hover:bg-black/[0.03]",
                    isSelected && "font-medium"
                  )}
                  style={{ transitionDuration: "var(--transition-fast)" }}
                >
                  <span className="truncate text-ink">{s.name}</span>
                  {isSelected && (
                    <Check size={14} aria-hidden="true" className="text-accent flex-shrink-0" />
                  )}
                </li>
              );
            })}

            {suppliers.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-ink-muted text-center">
                Aucun fournisseur trouvé
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
