import type { SupplierCategory } from "@/lib/types";
import type { SelectOption } from "@/components/ui/Select";

/** Labels français des catégories fournisseur */
export const SUPPLIER_CATEGORY_LABELS: Record<string, string> = {
  gros_oeuvre: "Gros œuvre",
  second_oeuvre: "Second œuvre",
  architecte: "Architecte",
  bureau_etudes: "Bureau d'études",
  notaire: "Notaire",
  courtier: "Courtier",
  materiaux: "Matériaux",
  artisan: "Artisan",
  services: "Services",
  autre: "Autre",
};

/** Options pour le composant Select */
export const SUPPLIER_CATEGORY_OPTIONS: SelectOption[] = [
  { value: "gros_oeuvre", label: "Gros œuvre" },
  { value: "second_oeuvre", label: "Second œuvre" },
  { value: "architecte", label: "Architecte" },
  { value: "bureau_etudes", label: "Bureau d'études" },
  { value: "notaire", label: "Notaire" },
  { value: "courtier", label: "Courtier" },
  { value: "materiaux", label: "Matériaux" },
  { value: "artisan", label: "Artisan" },
  { value: "services", label: "Services" },
  { value: "autre", label: "Autre" },
];

/** Options catégorie + option "Toutes" pour les filtres */
export const SUPPLIER_CATEGORY_FILTER_OPTIONS: SelectOption[] = [
  { value: "", label: "Toutes les catégories" },
  ...SUPPLIER_CATEGORY_OPTIONS,
];

export type { SupplierCategory };
