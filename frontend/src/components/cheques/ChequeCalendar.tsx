/**
 * Grille calendrier mensuelle des chèques par due_date (cash_date).
 * Navigation mois prev/next. Cellule = count + total du jour.
 * Click cellule → panel latéral avec liste détaillée.
 * Couleur selon statut (pending=amber, cashed=green, rejected=red).
 */
import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { clsx } from "clsx";
import Decimal from "decimal.js";
import { MoneyDisplay } from "@/components/shared";
import { ChequeStatusBadge } from "./ChequeStatusBadge";
import { Button } from "@/components/ui/Button";
import type { Cheque } from "@/lib/types";

export interface ChequeCalendarProps {
  cheques: Cheque[];
  isLoading?: boolean;
  className?: string;
}

/** Jours de la semaine en français, commençant lundi */
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function totalForCheques(list: Cheque[]): string {
  try {
    return list
      .reduce((acc, c) => {
        const blanc = new Decimal(c.amount_blanc || "0");
        const noir = new Decimal(c.amount_noir || "0");
        return acc.plus(blanc).plus(noir);
      }, new Decimal(0))
      .toFixed(2);
  } catch {
    return "0";
  }
}

/** Couleur dominante de la cellule selon les statuts présents */
function cellColorClass(cheques: Cheque[]): string {
  if (cheques.length === 0) return "";
  const hasRejected = cheques.some((c) => c.status === "rejected");
  const hasCashed = cheques.some(
    (c) => c.status === "cashed" || c.status === "debited"
  );
  const hasPending = cheques.some((c) => c.status === "pending");

  if (hasRejected) return "bg-negative/5 border-negative/20";
  if (hasPending) return "bg-warning/5 border-warning/20";
  if (hasCashed) return "bg-positive/5 border-positive/20";
  return "bg-bg-subtle border-line";
}

export function ChequeCalendar({
  cheques,
  isLoading = false,
  className,
}: ChequeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Grille : semaines complètes couvrant le mois (lun → dim)
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Indexer les chèques par date ISO
  const chequesByDate = useMemo(() => {
    const map = new Map<string, Cheque[]>();
    for (const cheque of cheques) {
      const key = cheque.cash_date; // "YYYY-MM-DD"
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cheque);
    }
    return map;
  }, [cheques]);

  const selectedDayKey = selectedDay
    ? format(selectedDay, "yyyy-MM-dd")
    : null;
  const selectedCheques = selectedDayKey
    ? (chequesByDate.get(selectedDayKey) ?? [])
    : [];

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: fr });

  return (
    <div className={clsx("flex flex-col gap-0", className)}>
      {/* Navigation mois */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          aria-label="Mois précédent"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <h2 className="font-display text-base capitalize text-ink">
          {monthLabel}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          aria-label="Mois suivant"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>

      <div className="flex gap-0 md:gap-4">
        {/* Grille calendrier */}
        <div className="flex-1 min-w-0">
          {/* En-têtes jours de la semaine */}
          <div className="grid grid-cols-7 border-b border-line">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[10px] uppercase tracking-wider font-medium text-ink-muted"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Cellules jours */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-px bg-line">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 bg-bg-card animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-line">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const daysCheques = chequesByDate.get(key) ?? [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const isToday = isSameDay(day, new Date());
                const total = daysCheques.length > 0 ? totalForCheques(daysCheques) : null;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setSelectedDay(isSelected ? null : day)
                    }
                    className={clsx(
                      "relative flex flex-col gap-0.5 min-h-[60px] p-1.5 text-left",
                      "transition-colors border",
                      isCurrentMonth ? "bg-bg-card" : "bg-bg-subtle",
                      isSelected
                        ? "ring-2 ring-accent ring-inset"
                        : daysCheques.length > 0
                        ? cellColorClass(daysCheques)
                        : "border-transparent hover:bg-black/[0.02]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    )}
                    style={{ transitionDuration: "var(--transition-fast)" }}
                    aria-label={`${format(day, "d MMMM yyyy", { locale: fr })}${daysCheques.length > 0 ? ` — ${daysCheques.length} chèque(s)` : ""}`}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={clsx(
                        "text-xs font-medium leading-none",
                        !isCurrentMonth && "text-ink-disabled",
                        isToday &&
                          "w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px]",
                        isCurrentMonth && !isToday && "text-ink"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {daysCheques.length > 0 && isCurrentMonth && (
                      <>
                        <span className="text-[10px] font-medium text-ink-soft leading-none">
                          {daysCheques.length} chq
                        </span>
                        {total && (
                          <span className="font-mono tabular-nums text-[9px] text-ink-muted leading-none truncate">
                            {new Intl.NumberFormat("fr-FR", {
                              notation: "compact",
                              maximumFractionDigits: 0,
                            }).format(new Decimal(total).toNumber())}{" "}
                            DH
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel latéral détail du jour sélectionné */}
        {selectedDay && (
          <aside
            className={clsx(
              "w-full md:w-72 flex-shrink-0",
              "border-t md:border-t-0 md:border-l border-line",
              "bg-bg-card"
            )}
            aria-label={`Chèques du ${format(selectedDay, "d MMMM yyyy", { locale: fr })}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <h3 className="text-sm font-medium text-ink capitalize">
                {format(selectedDay, "d MMMM yyyy", { locale: fr })}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDay(null)}
                aria-label="Fermer le panneau"
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </div>

            {selectedCheques.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-muted text-center">
                Aucun chèque ce jour.
              </p>
            ) : (
              <div className="overflow-y-auto max-h-[calc(100vh-260px)]">
                {/* Total du jour */}
                <div className="px-4 py-2 border-b border-line flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-ink-muted">
                    Total
                  </span>
                  <MoneyDisplay
                    value={totalForCheques(selectedCheques)}
                    currency="DH"
                    className="text-sm font-medium"
                  />
                </div>

                {/* Liste */}
                <ul className="divide-y divide-line">
                  {selectedCheques.map((cheque) => (
                    <li key={cheque.id} className="px-4 py-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink truncate">
                          {cheque.account_holder}
                        </span>
                        <ChequeStatusBadge
                          status={cheque.status}
                          direction={cheque.direction}
                          statusDisplay={cheque.status_display}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-ink-muted">
                          {cheque.bank_display} · {cheque.number}
                        </span>
                        <MoneyDisplay
                          value={
                            new Decimal(cheque.amount_blanc || "0")
                              .plus(cheque.amount_noir || "0")
                              .toFixed(2)
                          }
                          currency="DH"
                          positive={cheque.direction === "in" ? true : false}
                          className="text-xs font-medium"
                        />
                      </div>
                      {cheque.project && (
                        <span className="text-[10px] text-ink-muted">
                          {cheque.project.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-line">
        <span className="text-[10px] uppercase tracking-wider font-medium text-ink-muted">
          Légende
        </span>
        {[
          { label: "À venir", color: "bg-warning/20 border-warning/30" },
          { label: "Encaissé", color: "bg-positive/10 border-positive/20" },
          { label: "Rejeté", color: "bg-negative/10 border-negative/20" },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={clsx("w-3 h-3 rounded border", color)} />
            <span className="text-[10px] text-ink-muted">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
