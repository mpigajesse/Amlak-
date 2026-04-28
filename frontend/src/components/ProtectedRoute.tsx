import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Route protégée — redirige vers /login si l'utilisateur n'est pas authentifié.
 * Au premier render (status === "idle"), tente un bootstrap silencieux (GET /me/).
 *
 * Flux :
 *   idle     → appelle bootstrap() → loading → authed ou anon
 *   loading  → affiche rien (placeholder) avec timeout fallback
 *   authed   → rend le contenu (<Outlet />)
 *   anon     → redirige vers /login
 */
export function ProtectedRoute() {
  const { status, bootstrap } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (status === "idle") {
      void bootstrap();
    }
  }, [status, bootstrap]);

  // Failsafe : si bootstrap dépasse 10s (backend offline pénible), bascule en anon
  useEffect(() => {
    if (status !== "loading" && status !== "idle") {
      setLoadingTimedOut(false);
      return;
    }
    const t = setTimeout(() => setLoadingTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [status]);

  if (loadingTimedOut) {
    return <Navigate to="/login" replace />;
  }

  if (status === "idle" || status === "loading") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"
          role="status"
          aria-label="Chargement..."
        />
      </div>
    );
  }

  if (status === "anon") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
