/**
 * TransactionForm — formulaire complet de création/édition de transaction.
 * RHF + Zod. BNSplitter central. Cohérence direction/catégorie automatique.
 */

import { useEffect, useId, useCallback } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { isAxiosError } from "axios";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BNSplitter } from "@/components/shared/BNSplitter";
import { DatePicker } from "@/components/shared/DatePicker";
import { CategoryPicker } from "@/components/shared/CategoryPicker";
import { ProjectSelect } from "@/components/shared/ProjectSelect";
import { SupplierSelect } from "@/components/shared/SupplierSelect";
import { useToast } from "@/components/ui/useToast";
import { transactionSchema, type TransactionFormValues } from "@/lib/validation";
import { useCreateTransaction, useUpdateTransaction } from "@/api/transactions";
import type { Transaction } from "@/lib/types";

export interface TransactionFormProps {
  /** Si fourni → mode édition */
  transaction?: Transaction;
  /** Projet pré-sélectionné (depuis contexte page projet) */
  defaultProjectId?: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PAYMENT_MODE_OPTIONS = [
  { value: "espece", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
  { value: "autre", label: "Autre" },
];

/** Catégories autorisées selon la direction */
const OUT_CATEGORIES = [
  "acquisition",
  "travaux",
  "admin",
  "commercialisation",
  "autre",
] as const;

const IN_CATEGORIES = ["vente", "autre"] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({
  transaction,
  defaultProjectId,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const toast = useToast();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const isEdit = Boolean(transaction);

  const descId = useId();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          date: transaction.date,
          direction: transaction.direction,
          payment_mode: transaction.payment_mode,
          amount_blanc: transaction.amount_blanc,
          amount_noir: transaction.amount_noir,
          category: transaction.category,
          subcategory: transaction.subcategory,
          project: transaction.project,
          supplier: transaction.supplier,
          label: transaction.label,
          notes: transaction.notes,
        }
      : {
          date: today(),
          direction: "out",
          payment_mode: "espece",
          amount_blanc: "0",
          amount_noir: "0",
          category: "travaux",
          subcategory: "",
          project: defaultProjectId ?? null,
          supplier: null,
          label: "",
          notes: "",
        },
  });

  const direction = useWatch({ control: form.control, name: "direction" });
  const category = useWatch({ control: form.control, name: "category" });
  const amountBlanc = useWatch({ control: form.control, name: "amount_blanc" });
  const amountNoir = useWatch({ control: form.control, name: "amount_noir" });

  const handleBNChange = useCallback(
    ({ blanc, noir }: { blanc: string; noir: string }) => {
      form.setValue("amount_blanc", blanc, { shouldValidate: true });
      form.setValue("amount_noir", noir, { shouldValidate: true });
    },
    [form]
  );

  // Quand direction change : réinitialiser catégorie si incompatible
  useEffect(() => {
    if (direction === "out" && !(OUT_CATEGORIES as readonly string[]).includes(category)) {
      form.setValue("category", "travaux");
    } else if (direction === "in" && !(IN_CATEGORIES as readonly string[]).includes(category)) {
      form.setValue("category", "vente");
    }
  }, [direction, category, form]);

  const handleSubmit = async (values: TransactionFormValues) => {
    try {
      const payload = {
        ...values,
        subcategory: values.subcategory ?? "",
        label: values.label ?? "",
        notes: values.notes ?? "",
        project: values.project ?? null,
        supplier: values.supplier ?? null,
      };

      if (isEdit && transaction) {
        await updateTx.mutateAsync({ id: transaction.id, input: payload });
        toast.success("Transaction mise à jour");
      } else {
        await createTx.mutateAsync(payload);
        toast.success("Transaction enregistrée");
      }
      onSuccess();
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.errors) {
        const serverErrors = error.response.data.errors as Record<string, string[]>;
        Object.entries(serverErrors).forEach(([field, msgs]) => {
          form.setError(field as keyof TransactionFormValues, {
            message: msgs[0],
          });
        });
      } else {
        const detail = isAxiosError(error)
          ? (error.response?.data?.detail as string | undefined)
          : undefined;
        toast.error(detail ?? "Erreur inattendue");
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      aria-describedby={descId}
      noValidate
    >
      <p id={descId} className="sr-only">
        Formulaire de {isEdit ? "modification" : "création"} de transaction
      </p>

      <div className="flex flex-col gap-5">
        {/* Ligne 1 : direction + date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Toggle direction */}
          <Controller
            control={form.control}
            name="direction"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                  Direction
                  <span className="ml-0.5 text-negative" aria-hidden="true">*</span>
                </span>
                <div
                  role="group"
                  aria-label="Direction de la transaction"
                  className="flex gap-2"
                >
                  <button
                    type="button"
                    onClick={() => field.onChange("in")}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5",
                      "text-sm font-medium rounded border transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      field.value === "in"
                        ? "bg-positive/[0.08] border-positive text-positive"
                        : "bg-bg border-line text-ink-muted hover:border-line-strong"
                    )}
                    aria-pressed={field.value === "in"}
                    style={{ transitionDuration: "var(--transition-fast)" }}
                  >
                    <ArrowDownLeft size={14} aria-hidden="true" />
                    Entrée
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("out")}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5",
                      "text-sm font-medium rounded border transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      field.value === "out"
                        ? "bg-negative/[0.08] border-negative text-negative"
                        : "bg-bg border-line text-ink-muted hover:border-line-strong"
                    )}
                    aria-pressed={field.value === "out"}
                    style={{ transitionDuration: "var(--transition-fast)" }}
                  >
                    <ArrowUpRight size={14} aria-hidden="true" />
                    Sortie
                  </button>
                </div>
                {fieldState.error && (
                  <p role="alert" className="text-xs text-negative font-sans">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />

          {/* Date */}
          <Controller
            control={form.control}
            name="date"
            render={({ field, fieldState }) => (
              <DatePicker
                value={field.value}
                onChange={(v) => field.onChange(v ?? "")}
                label="Date"
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        {/* Ligne 2 : BNSplitter */}
        <BNSplitter
          label="Montants Blanc / Noir"
          value={{ blanc: amountBlanc, noir: amountNoir }}
          onChange={handleBNChange}
          disabled={isSubmitting}
          error={form.formState.errors.amount_blanc?.message}
        />

        {/* Ligne 3 : projet + catégorie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            control={form.control}
            name="project"
            render={({ field }) => (
              <ProjectSelect
                value={field.value ?? null}
                onChange={(id) => field.onChange(id)}
                label="Projet"
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            control={form.control}
            name="category"
            render={({ field, fieldState }) => (
              <CategoryPicker
                value={field.value}
                onChange={field.onChange}
                label="Catégorie"
                error={fieldState.error?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        {/* Ligne 4 : sous-catégorie + fournisseur */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            control={form.control}
            name="subcategory"
            render={({ field }) => (
              <FormField label="Sous-catégorie" htmlFor={`subcategory-${descId}`}>
                <Input
                  id={`subcategory-${descId}`}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Ex : Gros œuvre"
                  disabled={isSubmitting}
                />
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="supplier"
            render={({ field }) => (
              <SupplierSelect
                value={field.value ?? null}
                onChange={(id) => field.onChange(id)}
                label="Fournisseur"
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        {/* Ligne 5 : mode de paiement */}
        <Controller
          control={form.control}
          name="payment_mode"
          render={({ field, fieldState }) => (
            <FormField
              label="Mode de paiement"
              error={fieldState.error?.message}
              htmlFor={`payment-mode-${descId}`}
            >
              <Select
                id={`payment-mode-${descId}`}
                value={field.value}
                onChange={field.onChange}
                options={PAYMENT_MODE_OPTIONS}
                disabled={isSubmitting}
                aria-label="Mode de paiement"
              />
            </FormField>
          )}
        />

        {/* Ligne 6 : label + notes */}
        <Controller
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormField label="Libellé" htmlFor={`label-${descId}`}>
              <Input
                id={`label-${descId}`}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Ex : Situation travaux #04"
                disabled={isSubmitting}
              />
            </FormField>
          )}
        />

        <Controller
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormField label="Notes" htmlFor={`notes-${descId}`}>
              <textarea
                id={`notes-${descId}`}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Informations complémentaires…"
                disabled={isSubmitting}
                rows={3}
                className={clsx(
                  "w-full rounded bg-bg border border-line px-3 py-2.5",
                  "text-sm text-ink font-sans placeholder:text-ink-muted",
                  "transition-colors resize-none",
                  "focus:outline-none focus:border-accent",
                  "hover:border-line-strong",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-bg-subtle"
                )}
                style={{ transitionDuration: "var(--transition-fast)" }}
              />
            </FormField>
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-line">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEdit ? "Enregistrer les modifications" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
