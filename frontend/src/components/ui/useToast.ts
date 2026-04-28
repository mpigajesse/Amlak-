import { useToastContext, type ToastOptions } from "./ToastProvider";

/**
 * Hook d'accès au système Toast.
 *
 * Doit être utilisé dans l'arbre enfant d'un <ToastProvider>.
 *
 * @example
 * ```tsx
 * const toast = useToast();
 * toast.success("Projet enregistré");
 * toast.error("Erreur lors de la sauvegarde");
 * toast.info("Traitement en cours…");
 * ```
 */
export function useToast() {
  const { show, dismiss } = useToastContext();

  return {
    success: (message: string, options?: ToastOptions) =>
      show(message, "success", options),
    error: (message: string, options?: ToastOptions) =>
      show(message, "error", options),
    info: (message: string, options?: ToastOptions) =>
      show(message, "info", options),
    dismiss,
  };
}
