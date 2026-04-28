/**
 * Fonctions d'API pour l'authentification.
 * Contrat : section 6 du sprint-1-plan.md.
 *
 * Note : refresh() n'a pas de body — le refresh token vient du cookie httpOnly.
 * Le cookie est automatiquement envoyé via withCredentials=true sur l'instance axios.
 */

import { api } from "@/api/client";
import type { AuthLoginResponse, AuthUser } from "@/lib/types";

/**
 * POST /api/v1/auth/login/
 * Retourne l'access token + l'objet user.
 * Le refresh token est posé en cookie httpOnly par le backend.
 */
export async function login(
  email: string,
  password: string
): Promise<AuthLoginResponse> {
  const response = await api.post<AuthLoginResponse>("/auth/login/", {
    email,
    password,
  });
  return response.data;
}

/**
 * GET /api/v1/auth/me/
 * Retourne le profil de l'utilisateur courant.
 * Nécessite Authorization: Bearer <access>.
 */
export async function fetchMe(): Promise<AuthUser> {
  const response = await api.get<AuthUser>("/auth/me/");
  return response.data;
}

/**
 * POST /api/v1/auth/logout/
 * Blacklist le refresh cookie + le supprime.
 * Optionnel Sprint 1 — implémenté côté back si livré.
 */
export async function logout(): Promise<void> {
  await api.post("/auth/logout/");
}
