/**
 * Table des chèques.
 * Colonnes : Date / Direction / Banque / Titulaire / N° masqué / Blanc / Noir / Total / Statut / Actions
 * N° affiché masqué en liste (****XXXX). Jamais de log du numéro complet.
 */
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Eye,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MoneyDisplay } from "@/components/shared";
import { ChequeStatusBadge } from "./ChequeStatusBadge";
import { formatDate } from "@/lib/format";
import Decimal from "decimal.js";
import type { Cheque } from "@/lib/types";
import { LIBELLE_BLANC, LIBELLE_NOIR } from "@/lib/libelles";

export interface ChequesTableProps {
  cheques: Cheque[];
  isLoading?: boolean;
  onView?: (cheque: Cheque) => void;
  onCash?: (cheque: Cheque) => void;
  onReject?: (cheque: Cheque) => void;
  onPhoto?: (cheque: Cheque) => void;
  className?: string;
}

function chequeTotal(c: Cheque): string {
  try {
    return new Decimal(c.amount_blanc || "0")
      .plus(new Decimal(c.amount_noir || "0"))
      .toFixed(2);
  } catch {
    return "0";
  }
}

function canCash(c: Cheque): boolean {
  return c.status === "pending";
}

function canReject(c: Cheque): boolean {
  return c.status === "pending" && c.direction === "in";
}

/** Masque le numéro : retourne ce que l'API fournit ("****1234") */
function displayNumber(number: string): string {
  // L'API renvoie déjà le numéro masqué en liste — on affiche tel quel
  return number;
}

const SKELETON_ROWS = 5;

export function ChequesTable({
  cheques,
  isLoading = false,
  onView,
  onCash,
  onReject,
  onPhoto,
  className,
}: ChequesTableProps) {
  if (isLoading) {
    return (
      <Table className={className}>
        <TableHead>
          <tr>
            {[
              "Date",
              "Dir.",
              "Banque",
              "Titulaire",
              "N°",
              LIBELLE_BLANC,
              LIBELLE_NOIR,
              "Total",
              "Statut",
              "",
            ].map((h) => (
              <TableHeader key={h}>{h}</TableHeader>
            ))}
          </tr>
        </TableHead>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 10 }).map((__, j) => (
                <TableCell key={j}>
                  <Skeleton variant="text" className="w-20" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (cheques.length === 0) {
    return (
      <EmptyState
        title="Aucun chèque"
        description="Commencez par ajouter un chèque ou scannez-en un."
        className={className}
      />
    );
  }

  return (
    <Table className={className}>
      <TableHead sticky>
        <tr>
          <TableHeader>Date enc.</TableHeader>
          <TableHeader>Dir.</TableHeader>
          <TableHeader>Banque</TableHeader>
          <TableHeader>Titulaire</TableHeader>
          <TableHeader>N°</TableHeader>
          <TableHeader align="right">{LIBELLE_BLANC}</TableHeader>
          <TableHeader align="right">{LIBELLE_NOIR}</TableHeader>
          <TableHeader align="right">Total</TableHeader>
          <TableHeader>Statut</TableHeader>
          <TableHeader align="right">Actions</TableHeader>
        </tr>
      </TableHead>
      <TableBody>
        {cheques.map((cheque) => (
          <TableRow key={cheque.id} onClick={onView ? () => onView(cheque) : undefined}>
            <TableCell label="Date enc.">
              <span className="font-mono tabular-nums text-sm">
                {formatDate(cheque.cash_date, "short")}
              </span>
            </TableCell>

            <TableCell label="Dir.">
              <span
                className={clsx(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  cheque.direction === "in" ? "text-positive" : "text-negative"
                )}
                title={cheque.direction === "in" ? "Reçu" : "Émis"}
              >
                {cheque.direction === "in" ? (
                  <ArrowDownLeft size={14} aria-label="Reçu" />
                ) : (
                  <ArrowUpRight size={14} aria-label="Émis" />
                )}
                <span className="hidden sm:inline">
                  {cheque.direction === "in" ? "Reçu" : "Émis"}
                </span>
              </span>
            </TableCell>

            <TableCell label="Banque">
              <span className="text-sm truncate max-w-[120px] block">
                {cheque.bank_display}
              </span>
            </TableCell>

            <TableCell label="Titulaire">
              <span className="text-sm truncate max-w-[140px] block">
                {cheque.account_holder}
              </span>
            </TableCell>

            <TableCell label="N°">
              <span className="font-mono tabular-nums text-sm text-ink-muted">
                {displayNumber(cheque.number)}
              </span>
            </TableCell>

            <TableCell label={LIBELLE_BLANC} align="right">
              <MoneyDisplay
                value={cheque.amount_blanc}
                currency=""
                positive={undefined}
                className="text-sm"
              />
            </TableCell>

            <TableCell label={LIBELLE_NOIR} align="right">
              <MoneyDisplay
                value={cheque.amount_noir}
                currency=""
                positive={undefined}
                className="text-sm"
              />
            </TableCell>

            <TableCell label="Total" align="right">
              <MoneyDisplay
                value={chequeTotal(cheque)}
                currency="DH"
                positive={cheque.direction === "in" ? true : false}
                className="text-sm font-medium"
              />
            </TableCell>

            <TableCell label="Statut">
              <ChequeStatusBadge
                status={cheque.status}
                direction={cheque.direction}
                statusDisplay={cheque.status_display}
              />
            </TableCell>

            <TableCell label="Actions" align="right">
              {/* Stoppe la propagation pour éviter onView */}
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {onView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(cheque)}
                    aria-label="Voir le chèque"
                  >
                    <Eye size={14} aria-hidden="true" />
                  </Button>
                )}
                {canCash(cheque) && onCash && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCash(cheque)}
                    aria-label={
                      cheque.direction === "in" ? "Encaisser" : "Marquer débité"
                    }
                    title={
                      cheque.direction === "in" ? "Encaisser" : "Marquer débité"
                    }
                  >
                    <CheckCircle2 size={14} aria-hidden="true" className="text-positive" />
                  </Button>
                )}
                {canReject(cheque) && onReject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(cheque)}
                    aria-label="Rejeter"
                    title="Rejeter"
                  >
                    <XCircle size={14} aria-hidden="true" className="text-negative" />
                  </Button>
                )}
                {onPhoto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPhoto(cheque)}
                    aria-label="Photo"
                    title="Photo"
                  >
                    <Camera size={14} aria-hidden="true" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
