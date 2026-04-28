import { useNavigate } from "react-router-dom";
import { Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SUPPLIER_CATEGORY_LABELS } from "@/components/suppliers/constants";
import type { SupplierList } from "@/lib/types";

export interface SuppliersTableProps {
  suppliers: SupplierList[];
  onEdit: (supplier: SupplierList) => void;
  onDelete: (supplier: SupplierList) => void;
  onToggleActive: (supplier: SupplierList) => void;
}

/** Masque l'ICE : affiche seulement les 4 derniers chiffres */
function maskIce(ice: string): string {
  if (!ice) return "—";
  if (ice.length <= 4) return ice;
  return `**…${ice.slice(-4)}`;
}

export function SuppliersTable({
  suppliers,
  onEdit,
  onDelete,
  onToggleActive,
}: SuppliersTableProps) {
  const navigate = useNavigate();

  if (suppliers.length === 0) {
    return (
      <EmptyState
        title="Aucun fournisseur"
        description="Ajoutez un premier fournisseur pour commencer à suivre vos paiements."
      />
    );
  }

  return (
    <Table responsive>
      <TableHead>
        <tr>
          <TableHeader>Nom</TableHeader>
          <TableHeader>Catégorie</TableHeader>
          <TableHeader>Téléphone</TableHeader>
          <TableHeader>ICE</TableHeader>
          <TableHeader>Statut</TableHeader>
          <TableHeader align="right">Actions</TableHeader>
        </tr>
      </TableHead>
      <TableBody>
        {suppliers.map((s) => (
          <TableRow
            key={s.id}
            onClick={() => navigate(`/fournisseurs/${s.id}`)}
          >
            <TableCell label="Nom">
              <span className="font-medium text-ink">{s.name}</span>
            </TableCell>

            <TableCell label="Catégorie">
              {s.category ? (
                <Badge variant="neutral">
                  {s.category_display ||
                    SUPPLIER_CATEGORY_LABELS[s.category] ||
                    s.category}
                </Badge>
              ) : (
                <span className="text-ink-muted">—</span>
              )}
            </TableCell>

            <TableCell label="Téléphone">
              {s.phone ? (
                <span className="font-mono text-xs">{s.phone}</span>
              ) : (
                <span className="text-ink-muted">—</span>
              )}
            </TableCell>

            <TableCell label="ICE">
              <span className="font-mono text-xs">{maskIce(s.ice)}</span>
            </TableCell>

            <TableCell label="Statut">
              {s.is_active ? (
                <Badge variant="positive">Actif</Badge>
              ) : (
                <Badge variant="neutral">Inactif</Badge>
              )}
            </TableCell>

            <TableCell label="Actions" align="right">
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Modifier"
                  onClick={() => onEdit(s)}
                >
                  <Edit size={14} aria-hidden="true" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={s.is_active ? "Désactiver" : "Activer"}
                  onClick={() => onToggleActive(s)}
                >
                  {s.is_active ? (
                    <ToggleRight size={14} aria-hidden="true" />
                  ) : (
                    <ToggleLeft size={14} aria-hidden="true" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Supprimer"
                  className="text-negative hover:text-negative"
                  onClick={() => onDelete(s)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
