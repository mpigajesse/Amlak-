/**
 * DashboardPage — Tableau de bord cash-first Amlak.
 * Layout responsive :
 * - Ligne 1 : HeroCash (pleine largeur)
 * - Ligne 2 (2 cols desktop) : ForecastChart | UpcomingCheques
 * - Ligne 3 (2 cols desktop) : TopProjects | AlertsPanel
 * - Ligne 4 (pleine) : RecentActivity
 */

import { useTitle } from "@/hooks/useTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeroCash } from "@/components/dashboard/HeroCash";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { UpcomingCheques } from "@/components/dashboard/UpcomingCheques";
import { TopProjects } from "@/components/dashboard/TopProjects";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

function todayLong(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DashboardPage() {
  useTitle("Tableau de bord");
  const subtitle = `Vue d'ensemble — ${todayLong()}`;

  return (
    <div>
      {/* En-tête */}
      <PageHeader title="Tableau de bord" subtitle={subtitle} />

      {/* Ligne 1 — Position cash (pleine largeur) */}
      <section aria-label="Position cash" className="mb-5">
        <HeroCash />
      </section>

      {/* Ligne 2 — Prévisionnel + Chèques à venir */}
      <section
        aria-label="Prévisionnel et chèques"
        className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5"
      >
        <ForecastChart />
        <UpcomingCheques />
      </section>

      {/* Ligne 3 — Projets actifs + Alertes */}
      <section
        aria-label="Projets et alertes"
        className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5"
      >
        <TopProjects />
        <AlertsPanel />
      </section>

      {/* Ligne 4 — Activité récente (pleine largeur) */}
      <section aria-label="Activité récente">
        <RecentActivity />
      </section>
    </div>
  );
}
