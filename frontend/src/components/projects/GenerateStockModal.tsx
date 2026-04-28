/**
 * Modal de génération de stock depuis une acquisition.
 * Tableau éditable de lignes + submit → POST /acquisitions/:id/generate-stock/
 */

import { useState, useCallback } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import Decimal from "decimal.js";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AmountInput } from "@/components/shared/AmountInput";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { useGenerateFromAcquisition } from "@/api/units";
import { useToastContext } from "@/components/ui/ToastProvider";
import { formatMoney } from "@/lib/format";
import type { Acquisition, GenerateUnitRow } from "@/lib/types";

export interface GenerateStockModalProps {
  open: boolean;
  onClose: () => void;
  acquisition: Acquisition;
  projectId: number;
  projectAllocationMethod?: string;
  onSuccess?: () => void;
}

const UNIT_TYPE_OPTIONS = [
  { value: "Appartement", label: "Appartement" },
  { value: "Magasin", label: "Magasin" },
  { value: "Lot", label: "Lot" },
  { value: "Villa", label: "Villa" },
  { value: "Bureau", label: "Bureau" },
];

let rowCounter = 0;
function genRowId() {
  return `row-${++rowCounter}`;
}

interface EditableRow extends GenerateUnitRow {
  _id: string;
}

function createEmptyRow(prefix = ""): EditableRow {
  const id = genRowId();
  return {
    _id: id,
    unit_type: "Appartement",
    reference: `${prefix}${rowCounter}`,
    surface: "",
    floor: "",
    price_target: "",
    cost_weight: "1.00",
  };
}

export function GenerateStockModal({
  open,
  onClose,
  acquisition,
  projectId,
  projectAllocationMethod,
  onSuccess,
}: GenerateStockModalProps) {
  const { show: showToast } = useToastContext();
  const generateStock = useGenerateFromAcquisition();

  const [rows, setRows] = useState<EditableRow[]>(() => [createEmptyRow()]);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  const showPonderation = projectAllocationMethod === "ponderation";

  // Totaux
  const summary = rows.reduce(
    (acc, r) => {
      try {
        const s = new Decimal(r.surface || "0");
        const p = new Decimal(r.price_target || "0");
        return {
          surface: acc.surface.plus(s),
          ca: acc.ca.plus(p),
        };
      } catch {
        return acc;
      }
    },
    { surface: new Decimal(0), ca: new Decimal(0) }
  );

  const updateRow = useCallback(
    (rowId: string, field: keyof GenerateUnitRow, value: string) => {
      setRows((prev) =>
        prev.map((r) => (r._id === rowId ? { ...r, [field]: value } : r))
      );
      // Efface l'erreur du champ modifié
      setErrors((prev) => {
        const next = { ...prev };
        if (next[rowId]) {
          const { [field]: _, ...rest } = next[rowId];
          next[rowId] = rest;
        }
        return next;
      });
    },
    []
  );

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const addRows = (n: number) => {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: n }, () => createEmptyRow()),
    ]);
  };

  const duplicateRow = (row: EditableRow) => {
    const newRow: EditableRow = {
      ...row,
      _id: genRowId(),
      reference: `${row.reference}-bis`,
    };
    setRows((prev) => {
      const idx = prev.findIndex((r) => r._id === row._id);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r._id !== rowId));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, Record<string, string>> = {};
    const refs = new Set<string>();
    let valid = true;

    rows.forEach((r) => {
      const rowErrors: Record<string, string> = {};

      if (!r.unit_type) rowErrors.unit_type = "Requis";
      if (!r.reference.trim()) {
        rowErrors.reference = "Requis";
      } else if (refs.has(r.reference.trim())) {
        rowErrors.reference = "Référence dupliquée";
      } else {
        refs.add(r.reference.trim());
      }
      if (!r.surface || isNaN(Number(r.surface)) || Number(r.surface) <= 0) {
        rowErrors.surface = "Surface invalide";
      }
      if (
        !r.price_target ||
        isNaN(Number(r.price_target)) ||
        Number(r.price_target) <= 0
      ) {
        rowErrors.price_target = "Prix invalide";
      }

      if (Object.keys(rowErrors).length > 0) {
        newErrors[r._id] = rowErrors;
        valid = false;
      }
    });

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const units: GenerateUnitRow[] = rows.map(({ _id: _ignored, ...r }) => r);

    generateStock.mutate(
      { acquisitionId: acquisition.id, projectId, input: { units } },
      {
        onSuccess: (data) => {
          const n = Array.isArray(data) ? data.length : rows.length;
          showToast(`${n} unité${n > 1 ? "s" : ""} créée${n > 1 ? "s" : ""}`, "success");
          onSuccess?.();
          onClose();
          setRows([createEmptyRow()]);
        },
        onError: () => {
          showToast("Erreur lors de la génération du stock", "error");
        },
      }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Générer le stock — ${acquisition.label}`}
      size="xl"
      disableBackdropClose
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={generateStock.isPending}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={generateStock.isPending}
            disabled={rows.length === 0}
          >
            Générer {rows.length} unité{rows.length > 1 ? "s" : ""}
          </Button>
        </>
      }
    >
      {/* Sous-titre */}
      <div className="mb-4 pb-3 border-b border-line">
        <p className="text-sm text-ink-muted">
          {acquisition.surface && (
            <span className="font-mono tabular-nums">
              {formatMoney(acquisition.surface)} m²
            </span>
          )}
          {acquisition.surface && " · "}
          Méthode de répartition :{" "}
          <span className="font-medium text-ink">
            {projectAllocationMethod === "surface"
              ? "Au m²"
              : projectAllocationMethod === "egal"
              ? "Égale"
              : "Pondérée"}
          </span>
        </p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left px-2 py-2 text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted w-36">
                Type
              </th>
              <th className="text-left px-2 py-2 text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted w-28">
                Référence *
              </th>
              <th className="text-left px-2 py-2 text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted w-20">
                Étage
              </th>
              <th className="text-right px-2 py-2 text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted w-28">
                Surface m² *
              </th>
              <th className="text-right px-2 py-2 text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted w-36">
                Prix cible DH *
              </th>
              {showPonderation && (
                <th className="text-right px-2 py-2 text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted w-24">
                  Pondération
                </th>
              )}
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowErr = errors[row._id] ?? {};
              return (
                <tr key={row._id} className="border-b border-line/50 last:border-0">
                  {/* Type */}
                  <td className="px-2 py-1.5">
                    <Select
                      value={row.unit_type}
                      onChange={(v) => updateRow(row._id, "unit_type", v)}
                      options={UNIT_TYPE_OPTIONS}
                      aria-label="Type d'unité"
                      error={rowErr.unit_type}
                    />
                  </td>

                  {/* Référence */}
                  <td className="px-2 py-1.5">
                    <Input
                      value={row.reference}
                      onChange={(e) =>
                        updateRow(row._id, "reference", e.target.value)
                      }
                      placeholder="A1-01"
                      hasError={!!rowErr.reference}
                    />
                    {rowErr.reference && (
                      <p className="text-xs text-negative mt-0.5">{rowErr.reference}</p>
                    )}
                  </td>

                  {/* Étage */}
                  <td className="px-2 py-1.5">
                    <Input
                      value={row.floor ?? ""}
                      onChange={(e) => updateRow(row._id, "floor", e.target.value)}
                      placeholder="1"
                    />
                  </td>

                  {/* Surface */}
                  <td className="px-2 py-1.5">
                    <AmountInput
                      value={row.surface}
                      onChange={(v) => updateRow(row._id, "surface", v)}
                      currency="m²"
                      error={rowErr.surface}
                      aria-label="Surface"
                    />
                  </td>

                  {/* Prix cible */}
                  <td className="px-2 py-1.5">
                    <AmountInput
                      value={row.price_target}
                      onChange={(v) => updateRow(row._id, "price_target", v)}
                      error={rowErr.price_target}
                      aria-label="Prix cible"
                    />
                  </td>

                  {/* Pondération */}
                  {showPonderation && (
                    <td className="px-2 py-1.5">
                      <AmountInput
                        value={row.cost_weight ?? "1.00"}
                        onChange={(v) => updateRow(row._id, "cost_weight", v)}
                        currency=""
                        aria-label="Pondération"
                      />
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Dupliquer"
                        onClick={() => duplicateRow(row)}
                        className="flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-ink hover:bg-black/[0.04] transition-colors"
                      >
                        <Copy size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Supprimer"
                        onClick={() => removeRow(row._id)}
                        disabled={rows.length <= 1}
                        className="flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-negative hover:bg-negative/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Boutons d'ajout */}
      <div className="flex items-center gap-2 mt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRow}
          iconLeft={<Plus size={14} />}
        >
          Ajouter une unité
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addRows(5)}
        >
          + 5
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addRows(10)}
        >
          + 10
        </Button>
      </div>

      {/* Résumé */}
      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-sm text-ink-muted">
        <span>
          <span className="font-medium text-ink">{rows.length}</span> unité{rows.length > 1 ? "s" : ""}
          {!summary.surface.isZero() && (
            <>
              {" · "}
              <span className="font-mono tabular-nums font-medium text-ink">
                {formatMoney(summary.surface.toString())} m²
              </span>
            </>
          )}
        </span>
        {!summary.ca.isZero() && (
          <span>
            CA potentiel :{" "}
            <MoneyDisplay value={summary.ca.toString()} positive={undefined} className="text-sm font-medium" />
          </span>
        )}
      </div>
    </Modal>
  );
}
