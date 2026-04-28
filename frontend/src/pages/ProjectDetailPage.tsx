/**
 * Page détail d'un projet — /projets/:id
 * Onglets : Aperçu / Cycle Achat / Stock & Ventes / Transactions / Documents
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Package, Plus } from "lucide-react";
import { isAxiosError } from "axios";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { StagePill } from "@/components/shared/StagePill";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { BNSplitter, type BNValue } from "@/components/shared/BNSplitter";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { ProjectKpis } from "@/components/projects/ProjectKpis";
import { BudgetCards } from "@/components/projects/BudgetCards";
import {
  AcquisitionKanban,
  AcquisitionKanbanSkeleton,
} from "@/components/projects/AcquisitionKanban";
import {
  VenteKanban,
  VenteKanbanSkeleton,
} from "@/components/projects/VenteKanban";
import { StockGrid, StockGridSkeleton } from "@/components/projects/StockGrid";
import { GenerateStockModal } from "@/components/projects/GenerateStockModal";
import { useProject } from "@/api/projects";
import { useCreateAcquisition } from "@/api/acquisitions";
import { useReserveUnit, useSignCompromis, useCashUnit } from "@/api/units";
import { useToastContext } from "@/components/ui/ToastProvider";
import { formatDate } from "@/lib/format";
import {
  acquisitionCreateSchema,
  type AcquisitionCreateValues,
} from "@/lib/validation";
import type { Acquisition, StockUnit, StockUnitStatus } from "@/lib/types";

type TabKey = "apercu" | "achat" | "stock" | "transactions" | "documents";

// ── Page principale ───────────────────────────────────────────────────────────

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [activeTab, setActiveTab] = useState<TabKey>("apercu");
  const [stockView, setStockView] = useState<"kanban" | "grid">("kanban");

  // Modals
  const [showAddAcquisition, setShowAddAcquisition] = useState(false);
  const [generateStockAcq, setGenerateStockAcq] = useState<Acquisition | null>(
    null
  );
  const [editingUnit, setEditingUnit] = useState<StockUnit | null>(null);
  const [transitionUnit, setTransitionUnit] = useState<{
    unit: StockUnit;
    newStatus: StockUnitStatus;
  } | null>(null);

  const { data: project, isLoading, error } = useProject(
    isNaN(projectId) ? 0 : projectId
  );
  useTitle(project?.name ?? "Projet");

  if (isNaN(projectId) || projectId <= 0) {
    navigate("/projets", { replace: true });
    return null;
  }

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <EmptyState
          title="Projet introuvable"
          description="Ce projet n'existe pas ou vous n'y avez pas accès."
          action={
            <Button variant="secondary" onClick={() => navigate("/projets")}>
              Retour aux projets
            </Button>
          }
        />
      </div>
    );
  }

  const units = project.units ?? [];

  const handleAcquisitionPurchased = (acq: Acquisition) => {
    setGenerateStockAcq(acq);
  };

  const handleStageTransition = (
    unit: StockUnit,
    newStatus: StockUnitStatus
  ) => {
    setTransitionUnit({ unit, newStatus });
  };

  const handleGenerateStockSuccess = () => {
    setActiveTab("stock");
    setGenerateStockAcq(null);
  };

  // Acquisitions achetées sans stock généré
  const boughtAcqs = (project.acquisitions_by_stage?.achete ?? []).filter(
    (a) => a.generated_units_count === 0
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Retour */}
      <button
        type="button"
        onClick={() => navigate("/projets")}
        className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink mb-4 transition-colors"
        style={{ transitionDuration: "var(--transition-fast)" }}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Projets
      </button>

      {/* Header */}
      <PageHeader
        title={project.name}
        subtitle={project.location || undefined}
        actions={
          <div className="flex items-center gap-2">
            <StagePill stage={project.stage} />
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => setShowAddAcquisition(true)}
            >
              Acquisition
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <ProjectKpis project={project} />

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <Tabs.List>
          <Tabs.Trigger value="apercu">Aperçu</Tabs.Trigger>
          <Tabs.Trigger value="achat">
            Cycle Achat
            {(project.acquisitions_count ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] font-mono text-ink-muted">
                {project.acquisitions_count}
              </span>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="stock">
            Stock & Ventes
            {units.length > 0 && (
              <span className="ml-1.5 text-[10px] font-mono text-ink-muted">
                {units.length}
              </span>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="transactions">Transactions</Tabs.Trigger>
          <Tabs.Trigger value="documents" disabled>
            Documents
          </Tabs.Trigger>
        </Tabs.List>

        {/* ── Onglet Aperçu ────────────────────────────────────────────────── */}
        <Tabs.Content value="apercu" className="pt-5">
          <section aria-labelledby="budget-heading">
            <h2
              id="budget-heading"
              className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted mb-3"
            >
              Budget par catégorie
            </h2>
            <BudgetCards project={project} />
          </section>

          {project.description && (
            <section className="mt-6">
              <h2 className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted mb-2">
                Description
              </h2>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </section>
          )}

          {boughtAcqs.length > 0 && (
            <section className="mt-6 p-4 bg-accent-bg rounded-lg border border-accent/20">
              <p className="text-sm text-ink font-medium mb-2">
                {boughtAcqs.length} acquisition
                {boughtAcqs.length > 1 ? "s achetées" : " achetée"} sans stock
                généré
              </p>
              <div className="flex flex-wrap gap-2">
                {boughtAcqs.map((acq) => (
                  <Button
                    key={acq.id}
                    variant="secondary"
                    size="sm"
                    iconLeft={<Package size={14} />}
                    onClick={() => setGenerateStockAcq(acq)}
                  >
                    Générer stock — {acq.label}
                  </Button>
                ))}
              </div>
            </section>
          )}
        </Tabs.Content>

        {/* ── Onglet Cycle Achat ───────────────────────────────────────────── */}
        <Tabs.Content value="achat" className="pt-5">
          {isLoading ? (
            <AcquisitionKanbanSkeleton />
          ) : (
            <AcquisitionKanban
              project={project}
              onAddAcquisition={() => setShowAddAcquisition(true)}
              onEditAcquisition={(_acq) => {
                // TODO: ouvrir drawer édition acquisition
              }}
              onAcquisitionPurchased={handleAcquisitionPurchased}
            />
          )}
        </Tabs.Content>

        {/* ── Onglet Stock & Ventes ────────────────────────────────────────── */}
        <Tabs.Content value="stock" className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink">
              {units.filter((u) => u.status !== "annule").length} unité
              {units.length !== 1 ? "s" : ""}
            </h2>
            <div className="flex items-center gap-2">
              {boughtAcqs.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<Package size={14} />}
                  onClick={() => setGenerateStockAcq(boughtAcqs[0])}
                >
                  Générer stock
                </Button>
              )}
              <div className="flex rounded border border-line overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStockView("kanban")}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    stockView === "kanban"
                      ? "bg-accent text-bg-elevated"
                      : "text-ink-muted hover:text-ink"
                  }`}
                  style={{ transitionDuration: "var(--transition-fast)" }}
                >
                  Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setStockView("grid")}
                  className={`px-3 py-1.5 text-xs transition-colors border-l border-line ${
                    stockView === "grid"
                      ? "bg-accent text-bg-elevated"
                      : "text-ink-muted hover:text-ink"
                  }`}
                  style={{ transitionDuration: "var(--transition-fast)" }}
                >
                  Grille
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            stockView === "kanban" ? (
              <VenteKanbanSkeleton />
            ) : (
              <StockGridSkeleton />
            )
          ) : units.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Aucune unité"
              description="Commencez par générer le stock depuis une acquisition achetée."
              action={
                boughtAcqs.length > 0 ? (
                  <Button
                    variant="primary"
                    iconLeft={<Package size={16} />}
                    onClick={() => setGenerateStockAcq(boughtAcqs[0])}
                  >
                    Générer stock
                  </Button>
                ) : undefined
              }
            />
          ) : stockView === "kanban" ? (
            <VenteKanban
              units={units}
              onUnitClick={setEditingUnit}
              onStageTransition={handleStageTransition}
            />
          ) : (
            <StockGrid units={units} onUnitClick={setEditingUnit} />
          )}
        </Tabs.Content>

        {/* ── Onglet Transactions ──────────────────────────────────────────── */}
        <Tabs.Content value="transactions" className="pt-5">
          <EmptyState
            title="Transactions"
            description="Les transactions liées à ce projet apparaîtront ici (Sprint 3)."
          />
        </Tabs.Content>

        {/* ── Onglet Documents ────────────────────────────────────────────── */}
        <Tabs.Content value="documents" className="pt-5">
          <EmptyState
            title="Documents"
            description="La gestion documentaire sera disponible en v2."
          />
        </Tabs.Content>
      </Tabs>

      {/* Modal ajouter acquisition */}
      <AddAcquisitionModal
        open={showAddAcquisition}
        projectId={projectId}
        onClose={() => setShowAddAcquisition(false)}
        onSuccess={() => {
          setShowAddAcquisition(false);
          setActiveTab("achat");
        }}
      />

      {/* Modal générer stock */}
      {generateStockAcq && (
        <GenerateStockModal
          open
          onClose={() => setGenerateStockAcq(null)}
          acquisition={generateStockAcq}
          projectId={projectId}
          projectAllocationMethod={project.cost_allocation_method}
          onSuccess={handleGenerateStockSuccess}
        />
      )}

      {/* Modal détail unité */}
      {editingUnit && (
        <Modal
          open
          onClose={() => setEditingUnit(null)}
          title={`Unité ${editingUnit.reference}`}
          size="md"
          footer={
            <Button variant="ghost" onClick={() => setEditingUnit(null)}>
              Fermer
            </Button>
          }
        >
          <UnitDetailContent unit={editingUnit} />
        </Modal>
      )}

      {/* Modal transition de statut */}
      {transitionUnit && (
        <UnitTransitionModal
          unit={transitionUnit.unit}
          newStatus={transitionUnit.newStatus}
          projectId={projectId}
          onClose={() => setTransitionUnit(null)}
        />
      )}
    </div>
  );
}

// ── Modal ajout acquisition ───────────────────────────────────────────────────

interface AddAcquisitionModalProps {
  open: boolean;
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function AddAcquisitionModal({
  open,
  projectId,
  onClose,
  onSuccess,
}: AddAcquisitionModalProps) {
  const { show: showToast } = useToastContext();
  const createAcquisition = useCreateAcquisition();

  const form = useForm<AcquisitionCreateValues>({
    resolver: zodResolver(acquisitionCreateSchema),
    defaultValues: {
      label: "",
      description: "",
      surface: "",
      price_target: "",
      seller_name: "",
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createAcquisition.mutateAsync({ ...values, project: projectId });
      showToast("Acquisition ajoutée", "success");
      reset();
      onSuccess();
    } catch (err) {
      showToast(
        isAxiosError(err)
          ? (err.response?.data?.detail ?? "Erreur inattendue")
          : "Erreur inattendue",
        "error"
      );
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle acquisition"
      size="md"
      disableBackdropClose={createAcquisition.isPending}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={createAcquisition.isPending}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            loading={createAcquisition.isPending}
            onClick={() => void onSubmit()}
          >
            Ajouter
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Libellé" error={errors.label?.message} required>
          <Input
            placeholder="Ex : Terrain Bouskoura 2 800 m²"
            hasError={!!errors.label}
            {...register("label")}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Surface (m²)" error={errors.surface?.message}>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="2800"
              hasError={!!errors.surface}
              {...register("surface")}
            />
          </FormField>
          <FormField label="Prix cible (DH)" error={errors.price_target?.message}>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="5 000 000"
              hasError={!!errors.price_target}
              {...register("price_target")}
            />
          </FormField>
        </div>
        <FormField label="Nom du vendeur" error={errors.seller_name?.message}>
          <Input
            placeholder="Optionnel"
            hasError={!!errors.seller_name}
            {...register("seller_name")}
          />
        </FormField>
        <FormField label="Notes" error={errors.notes?.message}>
          <textarea
            rows={2}
            placeholder="Notes optionnelles…"
            className="w-full rounded bg-bg border border-line px-3 py-2.5 text-sm text-ink font-sans placeholder:text-ink-muted resize-none focus:outline-none focus:border-accent hover:border-line-strong transition-colors"
            style={{ transitionDuration: "var(--transition-fast)" }}
            {...register("notes")}
          />
        </FormField>
      </form>
    </Modal>
  );
}

// ── Contenu détail unité (lecture seule) ─────────────────────────────────────

interface UnitDetailContentProps {
  unit: StockUnit;
}

function UnitDetailContent({ unit }: UnitDetailContentProps) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-ink-muted">Statut</span>
        <StagePill stage={unit.status} cycle="vente" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-ink-muted">Type</span>
        <span className="font-medium text-ink">{unit.unit_type}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-ink-muted">Surface</span>
        <span className="font-mono tabular-nums text-ink">{unit.surface} m²</span>
      </div>
      {unit.floor && (
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Étage</span>
          <span className="text-ink">{unit.floor}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-ink-muted">Prix cible</span>
        <MoneyDisplay value={unit.price_target} positive={undefined} />
      </div>
      {unit.buyer_name && (
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Acheteur</span>
          <span className="font-medium text-ink">{unit.buyer_name}</span>
        </div>
      )}
      {unit.status !== "stock" && unit.total_received && (
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Montant reçu</span>
          <MoneyDisplay value={unit.total_received} positive={undefined} />
        </div>
      )}
      {unit.date_reservation && (
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Date réservation</span>
          <span className="font-mono text-ink">
            {formatDate(unit.date_reservation, "long")}
          </span>
        </div>
      )}
      {unit.date_compromis && (
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Date compromis</span>
          <span className="font-mono text-ink">
            {formatDate(unit.date_compromis, "long")}
          </span>
        </div>
      )}
      {unit.date_encaissement && (
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">Date encaissement</span>
          <span className="font-mono text-ink">
            {formatDate(unit.date_encaissement, "long")}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Modal transition d'unité ──────────────────────────────────────────────────

const TRANSITION_TITLES: Record<StockUnitStatus, string> = {
  reservation: "Réserver l'unité",
  compromis: "Passer en compromis",
  encaisse: "Encaisser le solde",
  stock: "Remettre en stock",
  annule: "Annuler",
};

interface UnitTransitionModalProps {
  unit: StockUnit;
  newStatus: StockUnitStatus;
  projectId: number;
  onClose: () => void;
}

function UnitTransitionModal({
  unit,
  newStatus,
  projectId,
  onClose,
}: UnitTransitionModalProps) {
  const { show: showToast } = useToastContext();
  const reserveUnit_ = useReserveUnit();
  const signCompromis_ = useSignCompromis();
  const cashUnit_ = useCashUnit();

  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amounts, setAmounts] = useState<BNValue>({ blanc: "0", noir: "0" });

  const isLoading =
    reserveUnit_.isPending || signCompromis_.isPending || cashUnit_.isPending;

  const handleSubmit = async () => {
    try {
      if (newStatus === "reservation") {
        await reserveUnit_.mutateAsync({
          id: unit.id,
          projectId,
          input: {
            buyer_name: buyerName,
            buyer_phone: buyerPhone || undefined,
            date_reservation: date,
            amount_blanc: amounts.blanc,
            amount_noir: amounts.noir,
            payment_mode: "espece",
          },
        });
        showToast(`Unité ${unit.reference} réservée`, "success");
      } else if (newStatus === "compromis") {
        await signCompromis_.mutateAsync({
          id: unit.id,
          projectId,
          input: {
            date_compromis: date,
            amount_blanc: amounts.blanc,
            amount_noir: amounts.noir,
            payment_mode: "espece",
          },
        });
        showToast(`Unité ${unit.reference} passée en compromis`, "success");
      } else if (newStatus === "encaisse") {
        await cashUnit_.mutateAsync({
          id: unit.id,
          projectId,
          input: {
            date_encaissement: date,
            amount_blanc: amounts.blanc,
            amount_noir: amounts.noir,
            payment_mode: "espece",
          },
        });
        showToast(`Unité ${unit.reference} encaissée`, "success");
      }
      onClose();
    } catch (err) {
      showToast(
        isAxiosError(err)
          ? (err.response?.data?.detail ?? "Erreur inattendue")
          : "Erreur inattendue",
        "error"
      );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${TRANSITION_TITLES[newStatus]} — ${unit.reference}`}
      size="md"
      disableBackdropClose={isLoading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant="primary"
            loading={isLoading}
            onClick={() => void handleSubmit()}
          >
            Confirmer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {newStatus === "reservation" && (
          <>
            <FormField label="Nom acheteur" required>
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Mehdi Chakir"
              />
            </FormField>
            <FormField label="Téléphone">
              <Input
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="+212 6xx xxx xxx"
              />
            </FormField>
          </>
        )}

        <FormField label="Date">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>

        <BNSplitter label="Montant" value={amounts} onChange={setAmounts} />
      </div>
    </Modal>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProjectDetailSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <Skeleton variant="text" className="w-16 h-4 mb-4" />
      <Skeleton variant="text" className="w-48 h-8 mb-2" />
      <Skeleton variant="text" className="w-32 h-4 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-20 w-full" />
        ))}
      </div>
      <Skeleton variant="rect" className="h-10 w-full mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
