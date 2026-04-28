import { type ReactNode, type TdHTMLAttributes } from "react";
import { clsx } from "clsx";

// ── Table (wrapper) ───────────────────────────────────────────────────────────

export interface TableProps {
  children: ReactNode;
  /** Masque la table et affiche les lignes en cards sous 640px */
  responsive?: boolean;
  className?: string;
}

/**
 * Table sobre sans zebra striping.
 * Responsive : sous 640px, chaque <TableRow> se transforme en card
 * (les lignes basculent en `display: block` via la classe `sm-card`).
 */
export function Table({
  children,
  className,
  responsive = true,
}: TableProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-line overflow-hidden bg-bg-card",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table
          className={clsx(
            "w-full",
            responsive && "amlak-responsive-table"
          )}
        >
          {children}
        </table>
      </div>

      {responsive && (
        <style>{`
          @media (max-width: 639px) {
            .amlak-responsive-table thead {
              display: none;
            }
            .amlak-responsive-table tbody tr {
              display: block;
              border-bottom: 1px solid var(--line);
              padding: 12px 16px;
            }
            .amlak-responsive-table tbody tr:last-child {
              border-bottom: none;
            }
            .amlak-responsive-table tbody td {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 4px 0;
              font-size: 0.875rem;
              border: none;
            }
            .amlak-responsive-table tbody td[data-label]::before {
              content: attr(data-label);
              font-size: 10px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: var(--ink-muted);
              flex-shrink: 0;
              margin-right: 8px;
            }
          }
        `}</style>
      )}
    </div>
  );
}

// ── TableHead ─────────────────────────────────────────────────────────────────

export interface TableHeadProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function TableHead({ children, sticky = false, className }: TableHeadProps) {
  return (
    <thead
      className={clsx(
        "bg-black/[0.015] border-b border-line",
        sticky && "sticky top-0 z-10",
        className
      )}
    >
      {children}
    </thead>
  );
}

// ── TableHeader (th) ──────────────────────────────────────────────────────────

export interface TableHeaderProps {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export function TableHeader({
  children,
  className,
  align = "left",
}: TableHeaderProps) {
  return (
    <th
      scope="col"
      className={clsx(
        "px-5 py-3",
        "text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted font-sans",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </th>
  );
}

// ── TableBody ─────────────────────────────────────────────────────────────────

export function TableBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tbody className={className}>{children}</tbody>;
}

// ── TableRow ──────────────────────────────────────────────────────────────────

export interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function TableRow({ children, onClick, className }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={clsx(
        "border-b border-line last:border-0",
        onClick &&
          "cursor-pointer hover:bg-black/[0.015] focus-visible:bg-black/[0.015] focus:outline-none",
        "transition-colors",
        className
      )}
      style={{ transitionDuration: "var(--transition-fast)" }}
    >
      {children}
    </tr>
  );
}

// ── TableCell (td) ────────────────────────────────────────────────────────────

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  /** Affiché comme label sur mobile (data-label) */
  label?: string;
  align?: "left" | "right" | "center";
}

export function TableCell({
  children,
  className,
  label,
  align = "left",
  ...props
}: TableCellProps) {
  return (
    <td
      data-label={label}
      className={clsx(
        "px-5 py-4 text-sm text-ink font-sans",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}
