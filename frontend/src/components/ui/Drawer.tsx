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

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
}

/**
 * Panneau latéral accessible.
 * - Même mécanique de focus trap que Modal
 * - Slide-in depuis left ou right
 * - Fermeture sur Echap et clic backdrop
 */
export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  ({ open, onClose, title, children, side = "right", className }, ref) => {
    const titleId = useId();
    const contentRef = useRef<HTMLDivElement | null>(null);
    const previousFocusRef = useRef<Element | null>(null);

    useEffect(() => {
      if (open) {
        previousFocusRef.current = document.activeElement;
        document.body.style.overflow = "hidden";
        const id = requestAnimationFrame(() => {
          const el = contentRef.current;
          if (!el) return;
          const focusable = getFocusableElements(el);
          focusable[0]?.focus();
        });
        return () => {
          cancelAnimationFrame(id);
          document.body.style.overflow = "";
        };
      } else {
        document.body.style.overflow = "";
        if (previousFocusRef.current instanceof HTMLElement) {
          previousFocusRef.current.focus();
        }
      }
    }, [open]);

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

    const animationName =
      side === "right" ? "drawerInRight" : "drawerInLeft";

    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Panel */}
        <div
          ref={(node) => {
            contentRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          role="document"
          className={clsx(
            "absolute top-0 bottom-0 z-10",
            "w-full max-w-md bg-bg-card border-line shadow-lg",
            "flex flex-col",
            side === "right"
              ? "right-0 border-l"
              : "left-0 border-r",
            className
          )}
          style={{
            animation: `${animationName} 200ms ease-out both`,
          }}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-line flex-shrink-0">
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

          {/* Corps scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </div>

        <style>{`
          @keyframes drawerInRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          @keyframes drawerInLeft {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
          }
        `}</style>
      </div>,
      document.body
    );
  }
);

Drawer.displayName = "Drawer";

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
