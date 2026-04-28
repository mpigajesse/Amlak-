import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Détecte si le viewport est mobile (< 768px).
 * Utilisé pour adapter le layout (MobileNav vs Sidebar).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);

    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
