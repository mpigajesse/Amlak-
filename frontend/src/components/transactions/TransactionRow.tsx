/**
 * TransactionRow — ligne réutilisable de la table transactions.
 * Responsive : sur mobile, bascule en card via le composant Table.
 */

import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import Decimal from "decimal.js";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import {
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { formatDate, formatMoney } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export interface TransactionRowProps {
  transaction: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  acquisition: "Acquisition",
  travaux: "Travaux",
  admin: "Administratif",
  commercialisation: "Commercialisation",
  vente: "Vente",
  autre: "Autre",
};

const PAYMENT_MODE_LABELS: Record<string, string> = {
  espece: "Espèces",
  cheque: "Chèque",
  virement: "Virement",
  autre: "Autre",
};

export function TransactionRow({
  transaction: tx,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const isIn = tx.direction === "in";

  return (
    <TableRow>
      {/* Date */}
      <TableCell label="Date">
        <span className="font-mono tabular-nums text-sm text-ink">
          {formatDate(tx.date, "short")}
        </span>
      </TableCell>

      {/* Direction */}
      <TableCell label="Direction">
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            isIn ? "text-positive" : "text-negative"
          )}
        >
          {isIn ? (
            <ArrowDownLeft size={14} aria-hidden="true" />
          ) : (
            <ArrowUpRight size={14} aria-hidden="true" />
          )}
          {isIn ? "Entrée" : "Sortie"}
        </span>
      </TableCell>

      {/* Catégorie */}
      <TableCell label="Catégorie">
        <div className="flex flex-col gap-0.5">
          <Badge variant="neutral">
            {CATEGORY_LABELS[tx.category] ?? tx.category}
          </Badge>
          {tx.subcategory && (
            <span className="text-xs text-ink-muted truncate max-w-[120px]">
              {tx.subcategory}
            </span>
          )}
        </div>
      </TableCell>

      {/* Mode paiement */}
      <TableCell label="Mode">
        <span className="text-xs text-ink-muted">
          {PAYMENT_MODE_LABELS[tx.payment_mode] ?? tx.payment_mode}
        </span>
      </TableCell>

      {/* Projet */}
      <TableCell label="Projet">
        {tx.project_detail ? (
          <span className="text-xs text-ink truncate max-w-[120px]">
            {tx.project_detail.name}
          </span>
        ) : (
          <span className="text-xs text-ink-disabled">—</span>
        )}
      </TableCell>

      {/* Fournisseur */}
      <TableCell label="Fournisseur">
        {tx.supplier_detail ? (
          <span className="text-xs text-ink truncate max-w-[100px]">
            {tx.supplier_detail.name}
          </span>
        ) : (
          <span className="text-xs text-ink-disabled">—</span>
        )}
      </TableCell>

      {/* Blanc */}
      <TableCell label="Blanc" align="right">
        <span
          className="font-mono tabular-nums text-xs"
          style={{ color: "var(--blanc)" }}
        >
          {new Decimal(tx.amount_blanc || "0").gt(0)
            ? `${formatMoney(tx.amount_blanc)} DH`
            : "—"}
        </span>
      </TableCell>

      {/* Noir */}
      <TableCell label="Noir" align="right">
        <span
          className="font-mono tabular-nums text-xs"
          style={{ color: "var(--noir)" }}
        >
          {new Decimal(tx.amount_noir || "0").gt(0)
            ? `${formatMoney(tx.amount_noir)} DH`
            : "—"}
        </span>
      </TableCell>

      {/* Total */}
      <TableCell label="Total" align="right">
        <MoneyDisplay
          value={tx.amount_total}
          currency="DH"
          positive={isIn ? true : false}
          className="text-sm font-medium"
        />
      </TableCell>

      {/* Actions */}
      <TableCell label="Actions" align="right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(tx)}
            aria-label={`Modifier la transaction du ${formatDate(tx.date)}`}
          >
            <Pencil size={14} aria-hidden="true" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(tx)}
            aria-label={`Supprimer la transaction du ${formatDate(tx.date)}`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
