import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useCallback,
  type MutableRefObject,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { clsx } from "clsx";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  /** Empêche la fermeture au clic sur le backdrop (ex: formulaire dirty) */
  disableBackdropClose?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Modal accessible :
 * - Focus trap complet (Tab / Shift+Tab circulent dans le dialog)
 * - Fermeture sur Echap
 * - Scroll lock sur body à l'ouverture
 * - Restore du focus précédent à la fermeture
 * - Pas d'alert()/confirm() natif
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      title,
      children,
      size = "md",
      footer,
      disableBackdropClose = false,
      className,
    },
    ref
  ) => {
    const titleId = useId();
    const contentRef = useRef<HTMLDivElement | null>(null);
    const previousFocusRef = useRef<Element | null>(null);

    // Sauvegarde du focus et scroll-lock
    useEffect(() => {
      if (open) {
        previousFocusRef.current = document.activeElement;
        document.body.style.overflow = "hidden";
        // Focus le premier élément focusable après le rendu
        const id = requestAnimationFrame(() => {
          const el = contentRef.current;
          if (!el) return;
          const focusable = getFocusableElements(el);
          focusable[0]?.focus();
        });
        return () => {
          cancelAnimationFrame(id);
          // Restaurer overflow même si l'effet est nettoyé sans repasser par open=false
          // (StrictMode double-mount, HMR, démontage soudain)
          document.body.style.overflow = "";
        };
      } else {
        document.body.style.overflow = "";
        // Restaure le focus précédent
        if (previousFocusRef.current instanceof HTMLElement) {
          previousFocusRef.current.focus();
        }
      }
    }, [open]);

    // Nettoyage scroll-lock si composant démonté alors qu'ouvert
    useEffect(() => {
      return () => {
        document.body.style.overflow = "";
      };
    }, []);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
          return;
        }

        if (e.key === "Tab") {
          const el = contentRef.current;
          if (!el) return;
          const focusable = getFocusableElements(el);
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      },
      [onClose]
    );

    if (!open) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={disableBackdropClose ? undefined : onClose}
        />

        {/* Contenu */}
        <div
          ref={(node) => {
            contentRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          role="document"
          className={clsx(
            "relative z-10 w-full bg-bg-card border border-line",
            "rounded-xl shadow-lg",
            "max-h-[90vh] flex flex-col",
            "animate-modal-in",
            sizeClasses[size],
            className
          )}
          style={{
            animation: "modalIn 200ms ease-out both",
          }}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-line flex-shrink-0">
            <h2
              id={titleId}
              className="font-display text-xl text-ink leading-snug"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className={clsx(
                "flex items-center justify-center w-8 h-8 -mr-1",
                "rounded text-ink-muted hover:text-ink hover:bg-black/[0.04]",
                "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              )}
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Corps */}
          <div className="px-7 py-5 overflow-y-auto flex-1 min-h-0">
            {children}
          </div>

          {/* Pied */}
          {footer && (
            <div className="px-7 py-4 border-t border-line flex items-center justify-end gap-2 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>

        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>,
      document.body
    );
  }
);

Modal.displayName = "Modal";

// ── Utilitaire focus trap ─────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "area[href]",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "details > summary",
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}
