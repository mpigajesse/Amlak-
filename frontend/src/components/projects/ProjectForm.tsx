/**
 * Formulaire de création / édition d'un projet.
 * Utilisé dans une Modal (size="lg") depuis ProjectsPage.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useId } from "react";
import Decimal from "decimal.js";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AmountInput } from "@/components/shared/AmountInput";
import { DatePicker } from "@/components/shared/DatePicker";
import { formatMoney } from "@/lib/format";
import { projectCreateSchema, type ProjectCreateValues } from "@/lib/validation";
import type { Project } from "@/lib/types";

export interface ProjectFormProps {
  /** Si fourni, le formulaire est en mode édition */
  initialValues?: Project;
  onSubmit: (values: ProjectCreateValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const COST_METHOD_OPTIONS = [
  { value: "surface", label: "Au m² (par défaut)" },
  { value: "egal", label: "Égale" },
  { value: "ponderation", label: "Pondérée" },
] as const;

const COST_METHOD_HINTS: Record<string, string> = {
  surface: "Les coûts sont répartis proportionnellement à la surface de chaque unité.",
  egal: "Les coûts sont répartis de façon identique entre toutes les unités.",
  ponderation: "Les coûts sont répartis selon un coefficient défini par unité.",
};

export function ProjectForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProjectFormProps) {
  const nameId = useId();
  const locationId = useId();
  const descriptionId = useId();

  const form = useForm<ProjectCreateValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      location: initialValues?.location ?? "",
      description: initialValues?.description ?? "",
      expected_delivery_date: initialValues?.expected_delivery_date ?? null,
      cost_allocation_method: initialValues?.cost_allocation_method ?? "surface",
      budget_acquisition: initialValues?.budget_acquisition ?? "0",
      budget_travaux: initialValues?.budget_travaux ?? "0",
      budget_admin: initialValues?.budget_admin ?? "0",
      budget_commercialisation: initialValues?.budget_commercialisation ?? "0",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const [acq, trav, admin, comm, method] = watch([
    "budget_acquisition",
    "budget_travaux",
    "budget_admin",
    "budget_commercialisation",
    "cost_allocation_method",
  ]);

  const budgetTotal = useMemo(() => {
    try {
      const sum = [acq, trav, admin, comm].reduce((acc, v) => {
        const num = new Decimal(v || "0");
        return acc.plus(num);
      }, new Decimal(0));
      return formatMoney(sum.toString());
    } catch {
      return "0";
    }
  }, [acq, trav, admin, comm]);

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form onSubmit={handleFormSubmit} noValidate>
      <div className="flex flex-col gap-5">
        {/* Nom */}
        <FormField
          label="Nom du projet"
          error={errors.name?.message}
          required
          htmlFor={nameId}
        >
          <Input
            id={nameId}
            placeholder="Ex : Résidence Atlas"
            hasError={!!errors.name}
            {...register("name")}
          />
        </FormField>

        {/* Localisation */}
        <FormField
          label="Localisation"
          error={errors.location?.message}
          htmlFor={locationId}
        >
          <Input
            id={locationId}
            placeholder="Ex : Casablanca, Bouskoura"
            hasError={!!errors.location}
            {...register("location")}
          />
        </FormField>

        {/* Description */}
        <FormField
          label="Description"
          error={errors.description?.message}
          htmlFor={descriptionId}
        >
          <textarea
            id={descriptionId}
            rows={3}
            placeholder="Description optionnelle du projet…"
            className="w-full rounded bg-bg border border-line px-3 py-2.5 text-sm text-ink font-sans placeholder:text-ink-muted resize-none focus:outline-none focus:border-accent hover:border-line-strong transition-colors"
            style={{ transitionDuration: "var(--transition-fast)" }}
            {...register("description")}
          />
        </FormField>

        {/* Date de livraison */}
        <FormField
          label="Date de livraison prévue"
          error={errors.expected_delivery_date?.message}
        >
          <DatePicker
            value={watch("expected_delivery_date") ?? ""}
            onChange={(v) =>
              setValue("expected_delivery_date", v || null, {
                shouldValidate: true,
              })
            }
          />
        </FormField>

        {/* Méthode de répartition */}
        <FormField
          label="Méthode de répartition des coûts"
          error={errors.cost_allocation_method?.message}
          hint={COST_METHOD_HINTS[method ?? "surface"]}
        >
          <Select
            value={watch("cost_allocation_method") ?? "surface"}
            onChange={(v) =>
              setValue(
                "cost_allocation_method",
                v as ProjectCreateValues["cost_allocation_method"],
                { shouldValidate: true }
              )
            }
            options={COST_METHOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            aria-label="Méthode de répartition des coûts"
          />
        </FormField>

        {/* Budgets prévisionnels */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted mb-3">
            Budget prévisionnel
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AmountInput
              label="Acquisition"
              value={acq ?? "0"}
              onChange={(v) => setValue("budget_acquisition", v)}
              error={errors.budget_acquisition?.message}
            />
            <AmountInput
              label="Travaux"
              value={trav ?? "0"}
              onChange={(v) => setValue("budget_travaux", v)}
              error={errors.budget_travaux?.message}
            />
            <AmountInput
              label="Admin"
              value={admin ?? "0"}
              onChange={(v) => setValue("budget_admin", v)}
              error={errors.budget_admin?.message}
            />
            <AmountInput
              label="Commercial"
              value={comm ?? "0"}
              onChange={(v) => setValue("budget_commercialisation", v)}
              error={errors.budget_commercialisation?.message}
            />
          </div>
          {/* Total */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="text-xs text-ink-muted font-sans">Total</span>
            <span className="font-mono tabular-nums text-sm font-medium text-ink">
              {budgetTotal} DH
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
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
          {initialValues ? "Enregistrer" : "Créer le projet"}
        </Button>
      </div>
    </form>
  );
}
