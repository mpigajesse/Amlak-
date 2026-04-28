/**
 * UpcomingCheques — Liste des prochains chèques à encaisser (30j).
 * Direction, titulaire, banque, montant, délai coloré.
 */

import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { differenceInCalendarDays } from "date-fns";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/format";
import type { Cheque } from "@/lib/types";
import { useUpcomingCheques } from "@/api/dashboard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysLabel(cashDate: string): { label: string; urgency: "urgent" | "warn" | "ok" } {
  const diff = differenceInCalendarDays(new Date(cashDate), new Date());
  if (diff < 0) return { label: `En retard de ${Math.abs(diff)}j`, urgency: "urgent" };
  if (diff === 0) return { label: "Aujourd'hui", urgency: "urgent" };
  if (diff <= 3) return { label: `J-${diff}`, urgency: "urgent" };
  if (diff <= 7) return { label: `J-${diff}`, urgency: "warn" };
  return { label: `J-${diff}`, urgency: "ok" };
}

function maskNumber(num: string): string {
  if (num.length <= 4) return "****";
  return `****${num.slice(-4)}`;
}

// ── Ligne chèque ──────────────────────────────────────────────────────────────

interface ChequeRowProps {
  cheque: Cheque;
}

function ChequeRow({ cheque }: ChequeRowProps) {
  const { label: dLabel, urgency } = daysLabel(cheque.cash_date);
  const isIn = cheque.direction === "in";

  const daysColorClass = clsx({
    "text-negative font-medium": urgency === "urgent",
    "text-warning font-medium": urgency === "warn",
    "text-ink-muted": urgency === "ok",
  });

  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0">
      {/* Direction icône */}
      <span
        className={clsx(
          "shrink-0 flex items-center justify-center w-7 h-7 rounded",
          isIn ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
        )}
        aria-label={isIn ? "Entrée" : "Sortie"}
      >
        {isIn ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
      </span>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate leading-tight">
          {cheque.account_holder || "—"}
        </p>
        <p className="text-xs text-ink-muted truncate mt-0.5">
          {cheque.bank_display} · {maskNumber(cheque.number)}
        </p>
      </div>

      {/* Montant + délai */}
      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
        <span className="font-mono tabular-nums text-sm text-ink">
          {formatMoney(cheque.amount)} DH
        </span>
        <span className={clsx("text-xs", daysColorClass)}>
          {dLabel}
        </span>
      </div>
    </li>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export interface UpcomingChequesProps {
  className?: string;
}

export function UpcomingCheques({ className }: UpcomingChequesProps) {
  const { data: cheques, isLoading, error } = useUpcomingCheques();

  return (
    <Card className={clsx("flex flex-col", className)} aria-label="Chèques à venir">
      <CardHeader>
        <h2 className="font-sans text-sm font-semibold text-ink">
          Chèques à venir
        </h2>
        {cheques?.length ? (
          <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            30 prochains jours
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        {isLoading ? (
          <ul className="flex flex-col gap-2" aria-label="Chargement">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <Skeleton variant="circle" className="w-7 h-7" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton variant="text" className="w-32 h-3.5" />
                  <Skeleton variant="text" className="w-20 h-3" />
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <Skeleton variant="text" className="w-20 h-3.5" />
                  <Skeleton variant="text" className="w-12 h-3" />
                </div>
              </li>
            ))}
          </ul>
        ) : error || !cheques ? (
          <EmptyState
            icon={CreditCard}
            title="Impossible de charger les chèques"
            className="py-8"
          />
        ) : cheques.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Aucun chèque à venir"
            description="Aucun chèque en attente dans les 30 prochains jours."
            className="py-8"
          />
        ) : (
          <ul
            className="flex flex-col divide-y divide-line"
            aria-label="Liste des chèques à venir"
          >
            {cheques.map((cheque) => (
              <ChequeRow key={cheque.id} cheque={cheque} />
            ))}
          </ul>
        )}
      </CardContent>

      {cheques && cheques.length > 0 && (
        <CardFooter className="justify-start">
          <Link
            to="/cheques"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
            aria-label="Voir tous les chèques"
          >
            Voir tous les chèques
            <ChevronRight size={12} aria-hidden="true" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
