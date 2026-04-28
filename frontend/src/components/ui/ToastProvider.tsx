import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Toast } from "./Toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  /** Durée en ms avant auto-dismiss. 0 = persistant. Default: 4000 */
  duration: number;
}

export interface ToastOptions {
  duration?: number;
}

// ── Contexte ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  show: (message: string, variant: ToastVariant, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast doit être utilisé dans <ToastProvider>");
  }
  return ctx;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "ADD"; toast: ToastItem }
  | { type: "DISMISS"; id: string };

function reducer(state: ToastItem[], action: Action): ToastItem[] {
  switch (action.type) {
    case "ADD":
      // Limite à 5 toasts simultanés
      return [...state.slice(-4), action.toast];
    case "DISMISS":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

let counter = 0;

export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Fournit le contexte Toast et rend le portail de toasts en bas-droite.
 * Placer en haut de l'arbre React, une seule fois.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const show = useCallback(
    (
      message: string,
      variant: ToastVariant,
      options?: ToastOptions
    ) => {
      const id = `toast-${++counter}`;
      dispatch({
        type: "ADD",
        toast: {
          id,
          message,
          variant,
          duration: options?.duration ?? 4000,
        },
      });
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "DISMISS", id });
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}

      {createPortal(
        <div
          aria-live="polite"
          aria-label="Notifications"
          className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
