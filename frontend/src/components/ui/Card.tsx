import type { ReactNode } from "react";
import { clsx } from "clsx";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card primitive — bg-card, border line, rounded-lg.
 * Shadow sm par défaut, shadow au hover si cliquable.
 */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-bg-card border border-line rounded-lg",
        "shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx("flex items-center justify-between px-5 pt-5 pb-3", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={clsx("px-5 pb-5", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={clsx(
        "px-5 py-3 border-t border-line",
        "flex items-center justify-end gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}
