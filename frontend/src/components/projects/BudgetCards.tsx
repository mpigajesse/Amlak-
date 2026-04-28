/**
 * 4 cards de budget par catégorie (Acquisition/Travaux/Admin/Commercial).
 * Chaque card affiche un BudgetBar + montants consommé / budgété.
 */

import { BudgetBar } from "@/components/shared/BudgetBar";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import type { Project, BudgetCategoryStatus } from "@/lib/types";

export interface BudgetCardsProps {
  project: Project;
}

interface BudgetCardProps {
  label: string;
  budget: string;
  consumed: string;
  status?: BudgetCategoryStatus;
}

function BudgetCard({ label, budget, consumed, status }: BudgetCardProps) {
  const consumed_ = status?.consumed ?? consumed;
  const budget_ = status?.budget ?? budget;

  return (
    <div className="bg-bg-card border border-line rounded-lg p-4 flex flex-col gap-3">
      <BudgetBar
        label={label}
        consumed={consumed_}
        budget={budget_}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted mb-0.5">
            Consommé
          </p>
          <MoneyDisplay value={consumed_} positive={undefined} className="text-sm" />
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted mb-0.5">
            Budgété
          </p>
          <MoneyDisplay value={budget_} positive={undefined} className="text-sm" />
        </div>
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  acquisition: "Acquisition",
  travaux: "Travaux",
  admin: "Administration",
  commercialisation: "Commercialisation",
};

export function BudgetCards({ project }: BudgetCardsProps) {
  const { budget_acquisition, budget_travaux, budget_admin, budget_commercialisation, budget_status } = project;

  const categories: { key: string; budget: string }[] = [
    { key: "acquisition", budget: budget_acquisition },
    { key: "travaux", budget: budget_travaux },
    { key: "admin", budget: budget_admin },
    { key: "commercialisation", budget: budget_commercialisation },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {categories.map(({ key, budget }) => (
        <BudgetCard
          key={key}
          label={CATEGORY_LABELS[key] ?? key}
          budget={budget}
          consumed={budget_status?.[key as keyof typeof budget_status]?.consumed ?? "0"}
          status={budget_status?.[key as keyof typeof budget_status]}
        />
      ))}
    </div>
  );
}
