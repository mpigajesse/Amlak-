/**
 * Store d'authentification — custom module-scope + useSyncExternalStore.
 * Décision Sprint 1 (9.7) : pas de zustand, custom store pour éviter une dep supplémentaire.
 *
 * Access token : variable module-scope dans api/client.ts (jamais dans le store persistant).
 * Refresh token : cookie httpOnly géré par le backend.
 *
 * API exposée :
 *   user         — AuthUser | null
 *   status       — "idle" | "loading" | "authed" | "anon"
 *   login()      — appelle POST /auth/login/, stocke l'access token, met à jour le store
 *   logout()     — reset le store, supprime l'access token
 *   bootstrap()  — tente GET /me/ au premier mount (silent refresh si access expiré)
 */

import { useSyncExternalStore, useCallback } from "react";
import { setAccessToken } from "@/api/client";
import { login as apiLogin, fetchMe, logout as apiLogout } from "@/api/auth";
import type { AuthUser } from "@/lib/types";
import axios from "axios";

// ---------------------------------------------------------------------------
// State interne (module-scope)
// ---------------------------------------------------------------------------

type AuthStatus = "idle" | "loading" | "authed" | "anon";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
}

let state: AuthState = { user: null, status: "idle" };
const listeners = new Set<() => void>();

function getSnapshot(): AuthState {
  return state;
}

function getServerSnapshot(): AuthState {
  return { user: null, status: "idle" };
}

function setState(next: Partial<AuthState>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Actions (functions pures qui modifient le state)
// ---------------------------------------------------------------------------

async function loginAction(email: string, password: string): Promise<void> {
  setState({ status: "loading" });
  const data = await apiLogin(email, password);
  setAccessToken(data.access);
  setState({ user: data.user, status: "authed" });
}

async function logoutAction(): Promise<void> {
  try {
    await apiLogout();
  } catch {
    // Ignorer les erreurs réseau au logout — reset local quand même
  }
  setAccessToken(null);
  setState({ user: null, status: "anon" });
}

async function bootstrapAction(): Promise<void> {
  if (state.status !== "idle") return;

  setState({ status: "loading" });
  try {
    // GET /auth/me/ — déclenche le refresh auto via intercepteur si access expiré
    const user = await fetchMe();
    setState({ user, status: "authed" });
  } catch (err) {
    // 401 après tentative de refresh = session expirée
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      setAccessToken(null);
      setState({ user: null, status: "anon" });
    } else {
      // Erreur réseau ou serveur — on reste en idle pour retry
      setState({ user: null, status: "anon" });
    }
  }
}

// ---------------------------------------------------------------------------
// Hook React
// ---------------------------------------------------------------------------

export interface UseAuthReturn extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const authState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const login = useCallback(loginAction, []);
  const logout = useCallback(logoutAction, []);
  const bootstrap = useCallback(bootstrapAction, []);

  return {
    ...authState,
    login,
    logout,
    bootstrap,
  };
}
