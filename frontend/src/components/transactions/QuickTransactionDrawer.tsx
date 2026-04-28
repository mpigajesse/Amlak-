/**
 * QuickTransactionDrawer — saisie rapide mobile (<30s).
 * Drawer ultra-simplifié : BNSplitter + CategoryPicker + Date + Direction.
 * Lien "Plus de détails…" ouvre le formulaire complet.
 */

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { isAxiosError } from "axios";
import { clsx } from "clsx";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BNSplitter } from "@/components/shared/BNSplitter";
import { DatePicker } from "@/components/shared/DatePicker";
import { CategoryPicker } from "@/components/shared/CategoryPicker";
import { useToast } from "@/components/ui/useToast";
import {
  quickTransactionSchema,
  type QuickTransactionFormValues,
} from "@/lib/validation";
import { useQuickTransaction } from "@/api/transactions";
import { TransactionForm } from "./TransactionForm";

export interface QuickTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Projet pré-sélectionné si ouvert depuis une page projet */
  defaultProjectId?: number | null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Catégories autorisées selon la direction */
const OUT_CATEGORIES = ["acquisition", "travaux", "admin", "commercialisation", "autre"];
const IN_CATEGORIES = ["vente", "autre"];

export function QuickTransactionDrawer({
  open,
  onClose,
  defaultProjectId,
}: QuickTransactionDrawerProps) {
  const toast = useToast();
  const quickTx = useQuickTransaction();
  const [showFull, setShowFull] = useState(false);

  const form = useForm<QuickTransactionFormValues>({
    resolver: zodResolver(quickTransactionSchema),
    defaultValues: {
      date: today(),
      direction: "out",
      amount_blanc: "0",
      amount_noir: "0",
      category: "travaux",
      payment_mode: "espece",
      project: defaultProjectId ?? null,
      supplier: null,
    },
  });

  const direction = form.watch("direction");

  const handleDirectionChange = (dir: "in" | "out") => {
    form.setValue("direction", dir);
    const currentCategory = form.getValues("category");
    if (dir === "out" && !OUT_CATEGORIES.includes(currentCategory)) {
      form.setValue("category", "travaux");
    } else if (dir === "in" && !IN_CATEGORIES.includes(currentCategory)) {
      form.setValue("category", "vente");
    }
  };

  const handleSubmit = async (values: QuickTransactionFormValues) => {
    try {
      await quickTx.mutateAsync({
        date: values.date,
        direction: values.direction,
        amount_blanc: values.amount_blanc,
        amount_noir: values.amount_noir,
        category: values.category,
        payment_mode: values.payment_mode,
        project: values.project ?? null,
        supplier: values.supplier ?? null,
      });
      toast.success("Transaction enregistrée");
      form.reset({
        date: today(),
        direction: "out",
        amount_blanc: "0",
        amount_noir: "0",
        category: "travaux",
        payment_mode: "espece",
        project: defaultProjectId ?? null,
        supplier: null,
      });
      onClose();
    } catch (error: unknown) {
      const detail = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      toast.error(detail ?? "Erreur lors de l'enregistrement");
    }
  };

  const handleOpenFull = () => {
    setShowFull(true);
  };

  const handleFullSuccess = () => {
    setShowFull(false);
    onClose();
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <>
      <Drawer
        open={open && !showFull}
        onClose={onClose}
        title="Saisie rapide"
        side="right"
      >
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5 h-full"
          noValidate
        >
          <div className="flex flex-col gap-5 flex-1">
            {/* Direction */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                Direction
              </span>
              <div className="flex gap-2" role="group" aria-label="Direction">
                <button
                  type="button"
                  onClick={() => handleDirectionChange("in")}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-3",
                    "text-sm font-medium rounded border transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    direction === "in"
                      ? "bg-positive/[0.08] border-positive text-positive"
                      : "bg-bg border-line text-ink-muted hover:border-line-strong"
                  )}
                  aria-pressed={direction === "in"}
                  style={{ transitionDuration: "var(--transition-fast)" }}
                >
                  <ArrowDownLeft size={16} aria-hidden="true" />
                  Entrée
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectionChange("out")}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-3",
                    "text-sm font-medium rounded border transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    direction === "out"
                      ? "bg-negative/[0.08] border-negative text-negative"
                      : "bg-bg border-line text-ink-muted hover:border-line-strong"
                  )}
                  aria-pressed={direction === "out"}
                  style={{ transitionDuration: "var(--transition-fast)" }}
                >
                  <ArrowUpRight size={16} aria-hidden="true" />
                  Sortie
                </button>
              </div>
            </div>

            {/* BNSplitter */}
            <BNSplitter
              label="Montants"
              value={{
                blanc: form.watch("amount_blanc"),
                noir: form.watch("amount_noir"),
              }}
              onChange={({ blanc, noir }) => {
                form.setValue("amount_blanc", blanc, { shouldValidate: true });
                form.setValue("amount_noir", noir, { shouldValidate: true });
              }}
              disabled={isSubmitting}
              error={form.formState.errors.amount_blanc?.message}
            />

            {/* Catégorie */}
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
                  disabled={isSubmitting}
                />
              )}
            />

            {/* Lien vers le formulaire complet */}
            <button
              type="button"
              onClick={handleOpenFull}
              className={clsx(
                "flex items-center gap-1.5 text-sm text-accent",
                "hover:underline focus:outline-none focus-visible:underline",
                "py-1"
              )}
            >
              Plus de détails…
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          {/* Actions sticky en bas */}
          <div className="pt-4 border-t border-line">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full"
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Formulaire complet en modal */}
      <Modal
        open={showFull}
        onClose={() => setShowFull(false)}
        title="Nouvelle transaction"
        size="lg"
        disableBackdropClose
      >
        <TransactionForm
          defaultProjectId={defaultProjectId}
          onSuccess={handleFullSuccess}
          onCancel={() => setShowFull(false)}
        />
      </Modal>
    </>
  );
}
