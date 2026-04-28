/**
 * AlertsPanel — Panneau d'alertes actives calculées côté front.
 * TODO: Connecter à GET /notifications/ quand l'endpoint sera disponible.
 *
 * Actuellement : calcul client des alertes suivantes :
 * 1. Chèques en retard (due_date passée, status=pending)
 * 2. Chèques urgents à venir (J-3 ou moins)
 * 3. Projets avec budget dépassé (>= 90%)
 */

import { Link } from "react-router-dom";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bell,
} from "lucide-react";
import { clsx } from "clsx";
import { differenceInCalendarDays } from "date-fns";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/format";
import type { Cheque, Project } from "@/lib/types";
import { useUpcomingCheques, useOverdueCheques, useDashboardProjects } from "@/api/dashboard";

// ── Types alerte ──────────────────────────────────────────────────────────────

type AlertLevel = "urgent" | "warning";

export interface AlertItem {
  id: string;
  level: AlertLevel;
  title: string;
  subtitle: string;
  linkTo: string;
  linkLabel: string;
}

// ── Calcul alertes chèques ────────────────────────────────────────────────────

function buildChequeAlerts(overdue: Cheque[], upcoming: Cheque[]): AlertItem[] {
  const alerts: AlertItem[] = [];

  // Chèques en retard
  for (const c of overdue) {
    const diff = differenceInCalendarDays(new Date(c.cash_date), new Date());
    const retard = Math.abs(diff);
    alerts.push({
      id: `overdue-${c.id}`,
      level: "urgent",
      title: `Chèque en retard — ${c.account_holder || c.bank_display}`,
      subtitle: `${formatMoney(c.amount)} DH · En retard de ${retard} jour${retard > 1 ? "s" : ""}`,
      linkTo: `/cheques`,
      linkLabel: "Voir",
    });
  }

  // Chèques J-3 ou moins (déjà filtrés par upcoming)
  for (const c of upcoming) {
    const diff = differenceInCalendarDays(new Date(c.cash_date), new Date());
    if (diff <= 3) {
      const label = diff === 0 ? "Aujourd'hui" : diff === 1 ? "Demain" : `J-${diff}`;
      alerts.push({
        id: `urgent-chq-${c.id}`,
        level: "urgent",
        title: `Chèque à présenter — ${c.account_holder || c.bank_display}`,
        subtitle: `${formatMoney(c.amount)} DH · ${label}`,
        linkTo: `/cheques`,
        linkLabel: "Voir",
      });
    }
  }

  return alerts;
}

// ── Calcul alertes budget ─────────────────────────────────────────────────────

function buildBudgetAlerts(projects: Project[]): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const p of projects) {
    if (!p.budget_status) continue;

    const categories: [string, number][] = [
      ["Acquisition", p.budget_status.acquisition.pct],
      ["Travaux", p.budget_status.travaux.pct],
      ["Admin", p.budget_status.admin.pct],
      ["Commercialisation", p.budget_status.commercialisation.pct],
    ];

    for (const [cat, pct] of categories) {
      if (pct >= 100) {
        alerts.push({
          id: `budget-over-${p.id}-${cat}`,
          level: "urgent",
          title: `Budget ${cat} dépassé — ${p.name}`,
          subtitle: `Consommé à ${Math.round(pct)} %`,
          linkTo: `/projets/${p.id}`,
          linkLabel: "Voir",
        });
      } else if (pct >= 90) {
        alerts.push({
          id: `budget-warn-${p.id}-${cat}`,
          level: "warning",
          title: `Budget ${cat} proche du seuil — ${p.name}`,
          subtitle: `Consommé à ${Math.round(pct)} %`,
          linkTo: `/projets/${p.id}`,
          linkLabel: "Voir",
        });
      }
    }
  }

  return alerts;
}

// ── Ligne alerte ──────────────────────────────────────────────────────────────

interface AlertRowProps {
  alert: AlertItem;
}

function AlertRow({ alert }: AlertRowProps) {
  const isUrgent = alert.level === "urgent";

  return (
    <li
      className="flex items-start gap-3 py-2.5 border-b border-line last:border-b-0"
      role="listitem"
    >
      {/* Icône niveau */}
      <span
        className={clsx(
          "shrink-0 mt-0.5",
          isUrgent ? "text-negative" : "text-warning"
        )}
        aria-label={isUrgent ? "Alerte urgente" : "Avertissement"}
      >
        {isUrgent ? (
          <AlertCircle size={15} />
        ) : (
          <AlertTriangle size={15} />
        )}
      </span>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <Badge variant={isUrgent ? "negative" : "warning"}>
            {isUrgent ? "Urgent" : "Attention"}
          </Badge>
        </div>
        <p className="text-sm text-ink mt-1 leading-tight truncate">
          {alert.title}
        </p>
        <p className="text-xs text-ink-muted mt-0.5">
          {alert.subtitle}
        </p>
      </div>

      {/* Action */}
      <Link
        to={alert.linkTo}
        className="shrink-0 inline-flex items-center gap-0.5 text-xs text-accent hover:text-accent/80 transition-colors font-medium mt-0.5"
        aria-label={`${alert.linkLabel} — ${alert.title}`}
      >
        {alert.linkLabel}
        <ChevronRight size={11} aria-hidden="true" />
      </Link>
    </li>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export interface AlertsPanelProps {
  className?: string;
}

export function AlertsPanel({ className }: AlertsPanelProps) {
  const { data: overdue, isLoading: overdueLoading } = useOverdueCheques();
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingCheques();
  const { data: projects, isLoading: projectsLoading } = useDashboardProjects();

  const isLoading = overdueLoading || upcomingLoading || projectsLoading;

  const alerts: AlertItem[] = [];

  if (overdue && upcoming) {
    alerts.push(...buildChequeAlerts(overdue, upcoming));
  }
  if (projects) {
    alerts.push(...buildBudgetAlerts(projects));
  }

  // Urgent en premier, puis warnings
  alerts.sort((a, b) => {
    if (a.level === b.level) return 0;
    return a.level === "urgent" ? -1 : 1;
  });

  const displayed = alerts.slice(0, 5);

  return (
    <Card className={clsx("flex flex-col", className)} aria-label="Alertes actives">
      <CardHeader>
        <h2 className="font-sans text-sm font-semibold text-ink">
          Alertes
        </h2>
        {alerts.length > 0 && !isLoading && (
          <Badge variant={alerts.some((a) => a.level === "urgent") ? "negative" : "warning"}>
            {alerts.length}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        {isLoading ? (
          <ul className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5 border-b border-line last:border-b-0">
                <Skeleton variant="circle" className="w-4 h-4 mt-0.5" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton variant="rect" className="w-16 h-4" />
                  <Skeleton variant="text" className="w-48 h-4" />
                  <Skeleton variant="text" className="w-28 h-3" />
                </div>
                <Skeleton variant="text" className="w-10 h-3 mt-0.5" />
              </li>
            ))}
          </ul>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Aucune alerte. Tout va bien."
            description="Aucun problème détecté."
            className="py-8"
          />
        ) : (
          <ul
            className="flex flex-col"
            role="list"
            aria-label="Liste des alertes"
          >
            {displayed.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        )}
      </CardContent>

      {alerts.length > 5 && (
        <CardFooter className="justify-start">
          <Link
            to="/notifications"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
            aria-label="Voir toutes les alertes"
          >
            <Bell size={11} aria-hidden="true" />
            Voir toutes les alertes ({alerts.length})
            <ChevronRight size={12} aria-hidden="true" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
