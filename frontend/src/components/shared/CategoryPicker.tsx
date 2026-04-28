import { useId } from "react";
import { clsx } from "clsx";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";

export interface CategoryPickerProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Catégories de frais fixes définies dans le modèle Transaction.
 * Options : Acquisition, Travaux, Administratif, Commercialisation, Vente, Autre
 */
const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "acquisition", label: "Acquisition" },
  { value: "travaux", label: "Travaux" },
  { value: "admin", label: "Administratif" },
  { value: "commercialisation", label: "Commercialisation" },
  { value: "vente", label: "Vente" },
  { value: "autre", label: "Autre" },
];

/**
 * Sélecteur de catégorie de frais.
 * Utilise le composant Select de @/components/ui.
 * Options fixes (pas d'API pour Sprint 1).
 */
export function CategoryPicker({
  value,
  onChange,
  label,
  error,
  disabled = false,
  id,
  className,
}: CategoryPickerProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted"
        >
          {label}
        </label>
      )}
      <Select
        id={selectId}
        value={value}
        onChange={onChange}
        options={CATEGORY_OPTIONS}
        placeholder="Sélectionner une catégorie…"
        disabled={disabled}
        error={error}
        aria-label={label ?? "Catégorie"}
      />
    </div>
  );
}
