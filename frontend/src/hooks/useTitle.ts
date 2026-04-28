import { useEffect } from "react";

/**
 * Modifie le titre du document de la page courante.
 *
 * Format : "Amlak · <title>"
 * Exemple : useTitle("Projets") → "Amlak · Projets"
 *
 * Le titre est restauré à "Amlak" au démontage du composant.
 */
export function useTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `Amlak · ${title}` : "Amlak";
    return () => {
      document.title = previous;
    };
  }, [title]);
}
