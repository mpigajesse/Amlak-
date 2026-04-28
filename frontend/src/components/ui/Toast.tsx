import { useEffect, useRef } from "react";
import { X, CheckCircle, XCircle, Info } from "lucide-react";
import { clsx } from "clsx";
import { type ToastItem } from "./ToastProvider";

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    containerClass: "border-l-4 border-l-positive",
    iconClass: "text-positive",
    label: "Succès",
  },
  error: {
    icon: XCircle,
    containerClass: "border-l-4 border-l-negative",
    iconClass: "text-negative",
    label: "Erreur",
  },
  info: {
    icon: Info,
    containerClass: "border-l-4 border-l-accent",
    iconClass: "text-accent",
    label: "Information",
  },
} as const;

/**
 * Toast individuel.
 * Affiche un message avec icône, auto-dismiss via progress bar visuelle.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  const { id, message, variant, duration } = toast;
  const config = variantConfig[variant];
  const IconComponent = config.icon;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!duration || duration <= 0) return;

    timerRef.current = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={clsx(
        "flex items-start gap-3 w-full",
        "bg-bg-card border border-line rounded-lg shadow-lg",
        "px-4 py-3",
        config.containerClass,
        "animate-toast-in"
      )}
      style={{
        animation: "toastIn 200ms ease-out both",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <IconComponent
        size={18}
        aria-hidden="true"
        className={clsx("flex-shrink-0 mt-0.5", config.iconClass)}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-sans text-ink leading-snug">{message}</p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Fermer la notification"
        className={clsx(
          "flex-shrink-0 flex items-center justify-center w-6 h-6 -mr-1 -mt-0.5",
          "rounded text-ink-muted hover:text-ink hover:bg-black/[0.04]",
          "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        )}
        style={{ transitionDuration: "var(--transition-fast)" }}
      >
        <X size={14} aria-hidden="true" />
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
