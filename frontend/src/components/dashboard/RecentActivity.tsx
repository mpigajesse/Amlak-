/**
 * RecentActivity — Flux des 12 dernières actions (transactions + chèques).
 * Timestamps relatifs via date-fns locale FR.
 */

import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  Activity,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/format";
import type { ActivityItem } from "@/api/dashboard";
import { useRecentActivity } from "@/api/dashboard";

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ItemMeta {
  Icon: typeof ArrowDownCircle;
  iconBg: string;
  iconText: string;
  amountColor: string;
}

function getItemMeta(type: ActivityItem["type"]): ItemMeta {
  switch (type) {
    case "transaction_in":
      return {
        Icon: ArrowDownCircle,
        iconBg: "bg-positive/10",
        iconText: "text-positive",
        amountColor: "text-positive",
      };
    case "transaction_out":
      return {
        Icon: ArrowUpCircle,
        iconBg: "bg-negative/10",
        iconText: "text-negative",
        amountColor: "text-negative",
      };
    case "cheque_cashed":
      return {
        Icon: CheckCircle2,
        iconBg: "bg-positive/10",
        iconText: "text-positive",
        amountColor: "text-positive",
      };
    case "cheque_rejected":
      return {
        Icon: XCircle,
        iconBg: "bg-negative/10",
        iconText: "text-negative",
        amountColor: "text-negative",
      };
  }
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return "";
  }
}

function amountSign(type: ActivityItem["type"]): string {
  return type === "transaction_in" || type === "cheque_cashed" ? "+ " : "− ";
}

// ── Ligne activité ────────────────────────────────────────────────────────────

interface ActivityRowProps {
  item: ActivityItem;
}

function ActivityRow({ item }: ActivityRowProps) {
  const { Icon, iconBg, iconText, amountColor } = getItemMeta(item.type);
  const sign = amountSign(item.type);

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0">
      {/* Icône type */}
      <span
        className={clsx(
          "shrink-0 flex items-center justify-center w-7 h-7 rounded",
          iconBg,
          iconText
        )}
        aria-hidden="true"
      >
        <Icon size={14} />
      </span>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate leading-tight">
          {item.label}
        </p>
        <time
          dateTime={item.timestamp}
          className="text-xs text-ink-muted mt-0.5 block"
        >
          {relativeTime(item.timestamp)}
        </time>
      </div>

      {/* Montant */}
      <span
        className={clsx(
          "shrink-0 font-mono tabular-nums text-sm",
          amountColor
        )}
        aria-label={`${sign}${formatMoney(item.amount)} DH`}
      >
        {sign}{formatMoney(item.amount)} DH
      </span>
    </li>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export interface RecentActivityProps {
  className?: string;
}

export function RecentActivity({ className }: RecentActivityProps) {
  const { data: items, isLoading, error } = useRecentActivity();

  return (
    <Card className={clsx("w-full", className)} aria-label="Activité récente">
      <CardHeader>
        <h2 className="font-sans text-sm font-semibold text-ink">
          Activité récente
        </h2>
        {items?.length ? (
          <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            Dernières opérations
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <ul className="flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0">
                <Skeleton variant="circle" className="w-7 h-7" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton variant="text" className="w-48 h-4" />
                  <Skeleton variant="text" className="w-20 h-3" />
                </div>
                <Skeleton variant="text" className="w-24 h-4" />
              </li>
            ))}
          </ul>
        ) : error || !items ? (
          <EmptyState
            icon={Activity}
            title="Impossible de charger l'activité"
            className="py-8"
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Aucune activité récente"
            description="Les transactions et mouvements de chèques apparaîtront ici."
            className="py-8"
          />
        ) : (
          <ul
            className="flex flex-col"
            aria-label="Liste des activités récentes"
          >
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CardContent>

      {items && items.length > 0 && (
        <CardFooter className="justify-start">
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
            aria-label="Voir toutes les transactions"
          >
            Voir tout
            <ChevronRight size={12} aria-hidden="true" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
