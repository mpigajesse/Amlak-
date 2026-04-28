import { type ReactNode } from "react";
import { clsx } from "clsx";

export type BadgeVariant = "neutral" | "positive" | "negative" | "warning" | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-black/[0.05] text-ink-soft",
  positive: "bg-positive/[0.1] text-positive",
  negative: "bg-negative/[0.1] text-negative",
  warning: "bg-warning/[0.1] text-warning",
  info: "bg-accent-bg text-accent",
};

/**
 * Badge — étiquette compacte sans icône.
 * Radius: radius-sm (3px), uppercase, tracking-wider.
 * Variants depuis les tokens CSS.
 */
export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1",
        "px-2 py-0.5",
        "text-[10px] font-medium font-sans uppercase tracking-wider",
        "rounded-sm",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
