import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { supplierSchema, type SupplierFormValues } from "@/lib/validation";
import { SUPPLIER_CATEGORY_OPTIONS } from "@/components/suppliers/constants";
import type { Supplier, SupplierList } from "@/lib/types";

export interface SupplierFormProps {
  /** Si fourni : mode édition (pré-rempli). Sinon : mode création. */
  defaultValues?: Supplier | SupplierList;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/** Résout un champ présent uniquement dans Supplier (détail) et pas dans SupplierList */
function resolveDetailField(
  dv: Supplier | SupplierList | undefined,
  field: keyof Supplier
): string {
  if (!dv) return "";
  if (field in dv) return ((dv as Supplier)[field] as string) ?? "";
  return "";
}

/**
 * Formulaire RHF + Zod pour créer ou modifier un fournisseur.
 * Validation ICE : 15 chiffres exactement (message FR exact).
 */
export function SupplierForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      category: (defaultValues?.category as SupplierFormValues["category"]) ?? "autre",
      phone: defaultValues?.phone ?? "",
      email: resolveDetailField(defaultValues, "email"),
      ice: defaultValues?.ice ?? "",
      address: resolveDetailField(defaultValues, "address"),
      notes: resolveDetailField(defaultValues, "notes"),
      is_active: defaultValues?.is_active ?? true,
    },
  });

  // Reset quand defaultValues change (ex: ouverture d'un autre fournisseur)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        name: defaultValues.name,
        category: (defaultValues.category as SupplierFormValues["category"]) ?? "autre",
        phone: defaultValues.phone ?? "",
        email: resolveDetailField(defaultValues, "email"),
        ice: defaultValues.ice ?? "",
        address: resolveDetailField(defaultValues, "address"),
        notes: resolveDetailField(defaultValues, "notes"),
        is_active: defaultValues.is_active ?? true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues, form]);

  const handleSubmit = async (values: SupplierFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.errors) {
        Object.entries(error.response.data.errors).forEach(
          ([field, msgs]) => {
            form.setError(field as keyof SupplierFormValues, {
              message: (msgs as string[])[0],
            });
          }
        );
      }
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {/* Nom */}
      <FormField
        label="Nom"
        htmlFor="supplier-name"
        error={form.formState.errors.name?.message}
        required
      >
        <Input
          id="supplier-name"
          placeholder="Ex : Entreprise Bennani Travaux"
          hasError={!!form.formState.errors.name}
          {...form.register("name")}
        />
      </FormField>

      {/* Catégorie */}
      <FormField
        label="Catégorie"
        htmlFor="supplier-category"
        error={form.formState.errors.category?.message}
      >
        <Controller
          name="category"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value}
              onChange={field.onChange}
              options={SUPPLIER_CATEGORY_OPTIONS}
              placeholder="Sélectionner une catégorie"
              error={form.formState.errors.category?.message}
            />
          )}
        />
      </FormField>

      {/* Téléphone + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Téléphone"
          htmlFor="supplier-phone"
          error={form.formState.errors.phone?.message}
        >
          <Input
            id="supplier-phone"
            type="tel"
            placeholder="+212 6 XX XX XX XX"
            hasError={!!form.formState.errors.phone}
            {...form.register("phone")}
          />
        </FormField>

        <FormField
          label="Email"
          htmlFor="supplier-email"
          error={form.formState.errors.email?.message}
        >
          <Input
            id="supplier-email"
            type="email"
            placeholder="contact@fournisseur.ma"
            hasError={!!form.formState.errors.email}
            {...form.register("email")}
          />
        </FormField>
      </div>

      {/* ICE */}
      <FormField
        label="ICE (Identifiant Commun de l'Entreprise)"
        htmlFor="supplier-ice"
        error={form.formState.errors.ice?.message}
        hint="15 chiffres — laisser vide si non disponible"
      >
        <Input
          id="supplier-ice"
          placeholder="123456789000000"
          inputMode="numeric"
          maxLength={15}
          hasError={!!form.formState.errors.ice}
          {...form.register("ice")}
        />
      </FormField>

      {/* Adresse */}
      <FormField
        label="Adresse"
        htmlFor="supplier-address"
        error={form.formState.errors.address?.message}
      >
        <textarea
          id="supplier-address"
          rows={2}
          placeholder="Adresse complète"
          className="w-full rounded bg-bg border border-line px-3 py-2.5 text-sm text-ink font-sans placeholder:text-ink-muted focus:outline-none focus:border-accent hover:border-line-strong resize-none"
          {...form.register("address")}
        />
      </FormField>

      {/* Notes */}
      <FormField
        label="Notes"
        htmlFor="supplier-notes"
        error={form.formState.errors.notes?.message}
      >
        <textarea
          id="supplier-notes"
          rows={3}
          placeholder="Notes internes…"
          className="w-full rounded bg-bg border border-line px-3 py-2.5 text-sm text-ink font-sans placeholder:text-ink-muted focus:outline-none focus:border-accent hover:border-line-strong resize-none"
          {...form.register("notes")}
        />
      </FormField>

      {/* is_active toggle */}
      <div className="flex items-center gap-3">
        <Controller
          name="is_active"
          control={form.control}
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                field.value ? "bg-positive" : "bg-line-strong"
              }`}
              style={{ transitionDuration: "var(--transition-fast)" }}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  field.value ? "translate-x-4" : "translate-x-0.5"
                }`}
                style={{ transitionDuration: "var(--transition-fast)" }}
              />
            </button>
          )}
        />
        <span className="text-sm font-sans text-ink">
          Fournisseur actif
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {defaultValues ? "Enregistrer" : "Créer le fournisseur"}
        </Button>
      </div>
    </form>
  );
}
