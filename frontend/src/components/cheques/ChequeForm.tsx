/**
 * Formulaire de création / édition d'un chèque.
 * RHF + Zod. Support pré-remplissage OCR via initialValues.
 * Règle : jamais de log du numéro ou des montants.
 */
import { useId } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clsx } from "clsx";
import { chequeSchema } from "@/lib/validation";
import type { ChequeFormValues } from "@/lib/validation";
import type { Cheque } from "@/lib/types";
import { BANK_OPTIONS, CHEQUE_KIND_OPTIONS } from "@/lib/constants";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { BNSplitter, DatePicker, ProjectSelect, SupplierSelect } from "@/components/shared";

// Conversion des tuples readonly → SelectOption[] attendu par Select
const BANK_SELECT_OPTIONS: SelectOption[] = BANK_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

const KIND_SELECT_OPTIONS: SelectOption[] = CHEQUE_KIND_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: "in", label: "Reçu" },
  { value: "out", label: "Émis" },
];

export interface ChequeFormProps {
  /** Valeurs pré-remplies (OCR ou édition) */
  initialValues?: Partial<ChequeFormValues>;
  onSubmit: (values: ChequeFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  /** Mode édition — affiche le numéro complet */
  editMode?: boolean;
  /** Chèque existant — pour usage futur (affichage numéro complet en édit) */
  existingCheque?: Cheque;
  className?: string;
}

const DEFAULT_VALUES: ChequeFormValues = {
  direction: "in",
  kind: "normal",
  number: "",
  bank: "attijariwafa",
  amount_blanc: "0",
  amount_noir: "0",
  account_holder: "",
  issue_date: null,
  cash_date: new Date().toISOString().slice(0, 10),
  project: null,
  supplier: null,
  notes: "",
};

export function ChequeForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  editMode = false,
  className,
}: ChequeFormProps) {
  const formId = useId();

  const form = useForm<ChequeFormValues>({
    resolver: zodResolver(chequeSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...initialValues,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const isDisabled = isLoading || isSubmitting;
  const issueDate = watch("issue_date");

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form
      id={formId}
      onSubmit={handleFormSubmit}
      noValidate
      className={clsx("flex flex-col gap-5", className)}
    >
      {/* Direction toggle */}
      <FormField
        label="Direction"
        error={errors.direction?.message}
        required
        htmlFor={`${formId}-direction`}
      >
        <Controller
          name="direction"
          control={control}
          render={({ field }) => (
            <Select
              id={`${formId}-direction`}
              value={field.value}
              onChange={field.onChange}
              options={DIRECTION_OPTIONS}
              aria-label="Direction"
              error={errors.direction?.message}
            />
          )}
        />
      </FormField>

      {/* Banque */}
      <FormField
        label="Banque"
        error={errors.bank?.message}
        required
        htmlFor={`${formId}-bank`}
      >
        <Controller
          name="bank"
          control={control}
          render={({ field }) => (
            <Select
              id={`${formId}-bank`}
              value={field.value}
              onChange={field.onChange}
              options={BANK_SELECT_OPTIONS}
              placeholder="Sélectionner une banque…"
              error={errors.bank?.message}
            />
          )}
        />
      </FormField>

      {/* Titulaire */}
      <FormField
        label="Titulaire du compte"
        error={errors.account_holder?.message}
        required
        htmlFor={`${formId}-account_holder`}
      >
        <Input
          id={`${formId}-account_holder`}
          {...register("account_holder")}
          placeholder="Nom du tireur ou bénéficiaire"
          disabled={isDisabled}
          hasError={!!errors.account_holder}
        />
      </FormField>

      {/* Numéro de chèque */}
      <FormField
        label="Numéro de chèque"
        error={errors.number?.message}
        required
        htmlFor={`${formId}-number`}
        hint={!editMode ? "7 à 12 chiffres" : undefined}
      >
        <Input
          id={`${formId}-number`}
          {...register("number")}
          placeholder="Ex : 4821035"
          inputMode="numeric"
          disabled={isDisabled}
          hasError={!!errors.number}
          className="font-mono tabular-nums"
        />
      </FormField>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="issue_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Date d'émission"
              value={field.value ?? null}
              onChange={field.onChange}
              error={errors.issue_date?.message}
              disabled={isDisabled}
              max={new Date().toISOString().slice(0, 10)}
            />
          )}
        />
        <Controller
          name="cash_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Date d'encaissement *"
              value={field.value}
              onChange={(v) => field.onChange(v ?? "")}
              error={errors.cash_date?.message}
              disabled={isDisabled}
              min={issueDate ?? undefined}
            />
          )}
        />
      </div>

      {/* Répartition Blanc / Noir */}
      <Controller
        name="amount_blanc"
        control={control}
        render={({ field: blancField }) => (
          <Controller
            name="amount_noir"
            control={control}
            render={({ field: noirField }) => (
              <BNSplitter
                label="Répartition Blanc / Noir *"
                value={{ blanc: blancField.value, noir: noirField.value }}
                onChange={({ blanc, noir }) => {
                  setValue("amount_blanc", blanc, { shouldValidate: true });
                  setValue("amount_noir", noir, { shouldValidate: true });
                }}
                error={errors.amount_blanc?.message ?? errors.amount_noir?.message}
                disabled={isDisabled}
              />
            )}
          />
        )}
      />

      {/* Type de chèque */}
      <FormField
        label="Type"
        error={errors.kind?.message}
        htmlFor={`${formId}-kind`}
      >
        <Controller
          name="kind"
          control={control}
          render={({ field }) => (
            <Select
              id={`${formId}-kind`}
              value={field.value}
              onChange={field.onChange}
              options={KIND_SELECT_OPTIONS}
              aria-label="Type de chèque"
              error={errors.kind?.message}
            />
          )}
        />
      </FormField>

      {/* Projet */}
      <Controller
        name="project"
        control={control}
        render={({ field }) => (
          <ProjectSelect
            label="Projet (optionnel)"
            value={field.value ?? null}
            onChange={field.onChange}
            disabled={isDisabled}
          />
        )}
      />

      {/* Fournisseur */}
      <Controller
        name="supplier"
        control={control}
        render={({ field }) => (
          <SupplierSelect
            label="Fournisseur (optionnel)"
            value={field.value ?? null}
            onChange={field.onChange}
            disabled={isDisabled}
          />
        )}
      />

      {/* Notes */}
      <FormField
        label="Notes"
        error={errors.notes?.message}
        htmlFor={`${formId}-notes`}
      >
        <textarea
          id={`${formId}-notes`}
          {...register("notes")}
          placeholder="Remarques éventuelles…"
          disabled={isDisabled}
          rows={3}
          className={clsx(
            "w-full rounded bg-bg border border-line px-3 py-2.5",
            "text-sm text-ink font-sans placeholder:text-ink-muted",
            "focus:outline-none focus:border-accent",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-bg-subtle",
            "resize-y transition-colors"
          )}
          style={{ transitionDuration: "var(--transition-fast)" }}
        />
      </FormField>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isDisabled}
          >
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting || isLoading}
          disabled={isDisabled}
        >
          {editMode ? "Mettre à jour" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
