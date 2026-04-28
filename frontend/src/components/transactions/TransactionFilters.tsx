/**
 * TransactionFilters — barre de filtres pour la liste des transactions.
 * Debounce 300ms sur la recherche textuelle. Reset complet disponible.
 */

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/shared/DatePicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TransactionFilters, TransactionDirection, TransactionCategoryValue, TransactionPaymentMode } from "@/lib/types";

export interface TransactionFiltersProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  className?: string;
}

const DIRECTION_OPTIONS = [
  { value: "", label: "Toutes directions" },
  { value: "in", label: "Entrées" },
  { value: "out", label: "Sorties" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "Toutes catégories" },
  { value: "acquisition", label: "Acquisition" },
  { value: "travaux", label: "Travaux" },
  { value: "admin", label: "Administratif" },
  { value: "commercialisation", label: "Commercialisation" },
  { value: "vente", label: "Vente" },
  { value: "autre", label: "Autre" },
];

const PAYMENT_MODE_OPTIONS = [
  { value: "", label: "Tous modes" },
  { value: "espece", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
  { value: "autre", label: "Autre" },
];

const DEFAULT_FILTERS: TransactionFilters = {};

function hasActiveFilters(filters: TransactionFilters): boolean {
  return Object.entries(filters).some(
    ([k, v]) => k !== "page" && v !== "" && v !== undefined && v !== null
  );
}

export function TransactionFilters({
  filters,
  onChange,
  className,
}: TransactionFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronise si les filtres sont réinitialisés de l'extérieur
  useEffect(() => {
    setLocalSearch(filters.search ?? "");
  }, [filters.search]);

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value || undefined, page: 1 });
    }, 300);
  };

  const handleChange = (partial: Partial<TransactionFilters>) => {
    onChange({ ...filters, ...partial, page: 1 });
  };

  const handleReset = () => {
    setLocalSearch("");
    onChange(DEFAULT_FILTERS);
  };

  const active = hasActiveFilters(filters);

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {/* Ligne 1 : recherche + direction + catégorie */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Recherche */}
        <div className="relative flex-1 min-w-0">
          <Search
            size={14}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <Input
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher des transactions"
            className="pl-8"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Direction */}
        <div className="w-full sm:w-44">
          <Select
            value={filters.direction ?? ""}
            onChange={(v) =>
              handleChange({ direction: v as TransactionDirection | "" })
            }
            options={DIRECTION_OPTIONS}
            aria-label="Filtrer par direction"
          />
        </div>

        {/* Catégorie */}
        <div className="w-full sm:w-52">
          <Select
            value={filters.category ?? ""}
            onChange={(v) =>
              handleChange({ category: v as TransactionCategoryValue | "" })
            }
            options={CATEGORY_OPTIONS}
            aria-label="Filtrer par catégorie"
          />
        </div>

        {/* Mode paiement */}
        <div className="w-full sm:w-44">
          <Select
            value={filters.payment_mode ?? ""}
            onChange={(v) =>
              handleChange({ payment_mode: v as TransactionPaymentMode | "" })
            }
            options={PAYMENT_MODE_OPTIONS}
            aria-label="Filtrer par mode de paiement"
          />
        </div>
      </div>

      {/* Ligne 2 : dates + reset */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <DatePicker
          value={filters.from ?? null}
          onChange={(v) => handleChange({ from: v ?? undefined })}
          label="Du"
          className="w-full sm:w-44"
          aria-label="Date de début"
        />
        <DatePicker
          value={filters.to ?? null}
          onChange={(v) => handleChange({ to: v ?? undefined })}
          label="Au"
          className="w-full sm:w-44"
          aria-label="Date de fin"
        />

        {/* Spacer */}
        <div className="flex-1" />

        {active && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            aria-label="Réinitialiser les filtres"
            className="self-end"
          >
            <X size={14} aria-hidden="true" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
