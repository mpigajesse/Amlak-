import { useState, useEffect } from "react";

/**
 * Retarde la mise à jour d'une valeur jusqu'à ce qu'elle cesse de changer.
 * Utilisé pour les recherches en temps réel (Sprint 2+).
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
