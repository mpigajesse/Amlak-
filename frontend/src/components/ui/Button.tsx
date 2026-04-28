import { forwardRef } from "react";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-bg-elevated hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  secondary:
    "bg-bg-card border border-line-strong text-ink hover:border-accent hover:text-accent",
  ghost:
    "bg-transparent text-ink hover:bg-black/[0.04]",
  destructive:
    "bg-transparent text-negative hover:bg-negative/[0.06]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-xs",
  lg: "px-5 py-3 text-sm",
};

/**
 * Bouton primitif de l'UI kit Amlak.
 * Max un seul `primary` par écran/modal.
 * Respecte les contraintes design : max rounded-lg, pas de gradients.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      children,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          // Base
          "inline-flex items-center justify-center gap-1.5",
          "font-sans font-medium tracking-[0.04em]",
          "rounded-lg transition-all",
          "cursor-pointer select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Variant + size
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        style={{ transitionDuration: "var(--transition-fast)" }}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : iconLeft ? (
          <span aria-hidden="true">{iconLeft}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
