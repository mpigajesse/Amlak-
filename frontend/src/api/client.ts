/**
 * Client Axios central de l'app Amlak.
 *
 * Stratégie JWT :
 * - Access token : variable module-scope (jamais localStorage, jamais sessionStorage)
 * - Refresh token : cookie httpOnly posé par le backend (path=/api/v1/auth/)
 *
 * L'intercepteur response gère le refresh automatique :
 * 1. Si 401 sur un endpoint non-auth → appelle /auth/refresh/ (lit le cookie)
 * 2. Récupère le nouvel access token et rejoue la requête originale
 * 3. En cas d'échec → reset access token (useAuth détecte et redirige vers /login)
 *
 * Déduplication : refreshPromise évite N appels refresh simultanés.
 */

import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

// Access token en mémoire module-scope — jamais dans le DOM ou le storage
let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  timeout: 8000, // évite de bloquer l'UI si backend offline (TCP retry Windows ~21s)
  withCredentials: true, // envoie le cookie refresh httpOnly sur /auth/refresh/
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Intercepteur request : injecte le Bearer token si disponible
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Déduplication du refresh : un seul appel même si N requêtes 401 simultanées
let refreshPromise: Promise<string> | null = null;

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Intercepteur response : refresh automatique sur 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;

    // Ne pas retenter les endpoints qui déclenchent eux-mêmes le refresh
    // (évite la boucle infinie) : login, refresh, logout.
    // /auth/me/ DOIT passer par le refresh (c'est ce qui permet le silent bootstrap au reload).
    const url = original?.url ?? "";
    const isRefreshSelf =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");
    const is401 = error.response?.status === 401;

    if (is401 && !original?._retry && !isRefreshSelf && original) {
      original._retry = true;

      try {
        // Déduplication : si un refresh est déjà en cours, attendre
        if (!refreshPromise) {
          refreshPromise = api
            .post<{ access: string }>("/auth/refresh/")
            .then((r) => r.data.access);
        }

        const newAccess = await refreshPromise;
        refreshPromise = null;

        setAccessToken(newAccess);
        // Injecter le nouveau Bearer token dans les headers de la requête originale
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newAccess}`;
        }

        return api(original);
      } catch (refreshError) {
        refreshPromise = null;
        setAccessToken(null);
        // useAuth détecte accessToken=null et redirige vers /login
        throw refreshError;
      }
    }

    throw error;
  }
);
