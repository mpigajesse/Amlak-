/**
 * API Dashboard — agrégation côté front.
 * Pas d'endpoint /dashboard/ dédié : on réutilise les hooks existants.
 * Ce fichier exporte des hooks composites et des utilitaires de calcul.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type {
  CashPosition,
  Transaction,
  Cheque,
  Project,
  Paginated,
  ChequeFilters,
} from "@/lib/types";
import { format, subDays, addDays } from "date-fns";

// ── Helpers date ──────────────────────────────────────────────────────────────

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function daysAgoIso(n: number): string {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

export function daysAheadIso(n: number): string {
  return format(addDays(new Date(), n), "yyyy-MM-dd");
}

// ── Position cash globale ─────────────────────────────────────────────────────

export function useDashboardCashPosition() {
  return useQuery({
    queryKey: queryKeys.transactions.cashPosition({}),
    queryFn: async () => {
      const { data } = await api.get<CashPosition>(
        "/transactions/cash-position/"
      );
      return data;
    },
    staleTime: 30_000,
  });
}

// ── Sparkline : transactions 30 derniers jours ────────────────────────────────

export interface SparklinePoint {
  date: string;
  total: number;
}

export function useDashboardSparkline() {
  const from = daysAgoIso(30);

  return useQuery({
    queryKey: ["dashboard", "sparkline", from],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Transaction>>(
        "/transactions/",
        { params: { from, ordering: "date", page_size: 100 } }
      );
      return buildSparkline(data.results);
    },
    staleTime: 30_000,
  });
}

function buildSparkline(txs: Transaction[]): SparklinePoint[] {
  // Accumule le flux net (entrées - sorties) jour par jour
  const byDay: Record<string, number> = {};
  for (const tx of txs) {
    const d = tx.date.slice(0, 10);
    const sign = tx.direction === "in" ? 1 : -1;
    const amount = parseFloat(tx.amount_total) || 0;
    byDay[d] = (byDay[d] ?? 0) + sign * amount;
  }

  // Cumul progressif
  const days = Object.keys(byDay).sort();
  let running = 0;
  return days.map((date) => {
    running += byDay[date];
    return { date, total: running };
  });
}

// ── Chèques à venir (30 jours) ───────────────────────────────────────────────

export function useUpcomingCheques() {
  const today = todayIso();
  const ahead30 = daysAheadIso(30);
  const filters: ChequeFilters = {
    status: "pending",
    cash_date_from: today,
    cash_date_to: ahead30,
  };

  return useQuery({
    queryKey: queryKeys.cheques.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Cheque>>("/cheques/", {
        params: { ...filters, ordering: "cash_date", page_size: 7 },
      });
      return data.results;
    },
    staleTime: 30_000,
  });
}

// ── Chèques en retard ────────────────────────────────────────────────────────

export function useOverdueCheques() {
  const yesterday = daysAgoIso(1);
  const filters: ChequeFilters = {
    status: "pending",
    cash_date_to: yesterday,
  };

  return useQuery({
    queryKey: queryKeys.cheques.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Cheque>>("/cheques/", {
        params: { ...filters, ordering: "-cash_date", page_size: 20 },
      });
      return data.results;
    },
    staleTime: 30_000,
  });
}

// ── Projets actifs ────────────────────────────────────────────────────────────

export function useDashboardProjects() {
  return useQuery({
    queryKey: ["dashboard", "projects"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Project>>("/projects/", {
        params: { stage: "actif", page_size: 5, ordering: "-created_at" },
      });
      return data.results;
    },
    staleTime: 30_000,
  });
}

// ── Activité récente ──────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  type: "transaction_in" | "transaction_out" | "cheque_cashed" | "cheque_rejected";
  label: string;
  amount: string;
  timestamp: string;
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: async (): Promise<ActivityItem[]> => {
      const [txRes, chqRes] = await Promise.all([
        api.get<Paginated<Transaction>>("/transactions/", {
          params: { ordering: "-created_at", page_size: 10 },
        }),
        api.get<Paginated<Cheque>>("/cheques/", {
          params: { ordering: "-updated_at", page_size: 5 },
        }),
      ]);

      const txItems: ActivityItem[] = txRes.data.results.map((tx) => ({
        id: `tx-${tx.id}`,
        type: tx.direction === "in" ? "transaction_in" : "transaction_out",
        label: tx.label
          ? tx.label
          : tx.direction === "in"
          ? `Entrée depuis ${tx.supplier_detail?.name ?? "tiers"}`
          : `Sortie vers ${tx.supplier_detail?.name ?? "tiers"}`,
        amount: tx.amount_total,
        timestamp: tx.created_at,
      }));

      const chqItems: ActivityItem[] = chqRes.data.results
        .filter((c) => c.status === "cashed" || c.status === "rejected")
        .map((c) => ({
          id: `chq-${c.id}`,
          type: c.status === "cashed" ? "cheque_cashed" : "cheque_rejected",
          label:
            c.status === "cashed"
              ? `Chèque encaissé · ${c.account_holder || c.bank_display}`
              : `Chèque rejeté · ${c.account_holder || c.bank_display}`,
          amount: c.amount,
          timestamp: c.updated_at,
        }));

      // Fusion et tri desc par timestamp
      return [...txItems, ...chqItems]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 12);
    },
    staleTime: 30_000,
  });
}

// ── Prévisionnel cash ─────────────────────────────────────────────────────────

export interface ForecastPoint {
  date: string;
  blanc: number;
  noir: number;
  total: number;
}

export function useCashForecast(days: 30 | 60 | 90 = 30) {
  const today = todayIso();
  const horizon = daysAheadIso(days);

  return useQuery({
    queryKey: ["dashboard", "forecast", days],
    queryFn: async (): Promise<ForecastPoint[]> => {
      const [posRes, chqRes] = await Promise.all([
        api.get<CashPosition>("/transactions/cash-position/"),
        api.get<Paginated<Cheque>>("/cheques/", {
          params: {
            status: "pending",
            cash_date_from: today,
            cash_date_to: horizon,
            page_size: 200,
          },
        }),
      ]);

      const startBlanc = parseFloat(posRes.data.blanc) || 0;
      const startNoir = parseFloat(posRes.data.noir) || 0;

      // Agrège les flux par jour
      const byDay: Record<string, { blanc: number; noir: number }> = {};
      for (const chq of chqRes.data.results) {
        const d = chq.cash_date.slice(0, 10);
        const sign = chq.direction === "in" ? 1 : -1;
        const blanc = (parseFloat(chq.amount_blanc) || 0) * sign;
        const noir = (parseFloat(chq.amount_noir) || 0) * sign;
        byDay[d] = {
          blanc: (byDay[d]?.blanc ?? 0) + blanc,
          noir: (byDay[d]?.noir ?? 0) + noir,
        };
      }

      // Génère la courbe jour par jour
      const points: ForecastPoint[] = [];
      let runBlanc = startBlanc;
      let runNoir = startNoir;

      // Point de départ = aujourd'hui
      points.push({
        date: today,
        blanc: runBlanc,
        noir: runNoir,
        total: runBlanc + runNoir,
      });

      for (let i = 1; i <= days; i++) {
        const d = format(addDays(new Date(), i), "yyyy-MM-dd");
        const delta = byDay[d];
        if (delta) {
          runBlanc += delta.blanc;
          runNoir += delta.noir;
        }
        // N'inclure que les jours avec des événements pour alléger + point final
        if (delta || i === days) {
          points.push({
            date: d,
            blanc: runBlanc,
            noir: runNoir,
            total: runBlanc + runNoir,
          });
        }
      }

      return points;
    },
    staleTime: 60_000,
  });
}
