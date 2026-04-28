/**
 * Page principale des chèques : /cheques
 * - KPIs (4 compteurs)
 * - Filtres (statut, direction, kind, dates)
 * - Tabs : "À venir 30j" / "Tous" / "Historique"
 * - ChequesTable avec actions Encaisser / Rejeter / Photo
 * - Modal création / confirmation actions
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";
import { Plus, ScanLine, Filter } from "lucide-react";
import { isAxiosError } from "axios";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChequesKpis } from "@/components/cheques/ChequesKpis";
import { ChequesTable } from "@/components/cheques/ChequesTable";
import { ChequeForm } from "@/components/cheques/ChequeForm";
import { ChequePhotoUploader } from "@/components/cheques/ChequePhotoUploader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/shared";
import { useToast } from "@/components/ui/useToast";
import { useCheques, useCreateCheque, useCashCheque, useRejectCheque } from "@/api/cheques";
import { ROUTES } from "@/lib/constants";
import type { ChequeFormValues } from "@/lib/validation";
import type { Cheque, ChequeFilters, ChequeStatus, ChequeDirection, ChequeKind } from "@/lib/types";

type TabValue = "upcoming" | "all" | "history";

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "cashed", label: "Encaissé" },
  { value: "debited", label: "Débité" },
  { value: "rejected", label: "Rejeté" },
  { value: "cancelled", label: "Annulé" },
  { value: "blocked", label: "Bloqué" },
];

const DIRECTION_OPTIONS = [
  { value: "", label: "Toutes directions" },
  { value: "in", label: "Reçu" },
  { value: "out", label: "Émis" },
];

const KIND_OPTIONS = [
  { value: "", label: "Tous types" },
  { value: "normal", label: "Normal" },
  { value: "garantie", label: "Garantie" },
  { value: "caution", label: "Caution" },
  { value: "postdate", label: "Postdaté" },
];

type ModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "cash"; cheque: Cheque }
  | { kind: "reject"; cheque: Cheque }
  | { kind: "photo"; cheque: Cheque };

export function ChequesPage() {
  useTitle("Chèques");
  const navigate = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState<TabValue>("upcoming");
  const [modalState, setModalState] = useState<ModalState>({ kind: "closed" });
  const [showFilters, setShowFilters] = useState(false);

  // Filtres
  const [filterStatus, setFilterStatus] = useState<ChequeStatus | "">("");
  const [filterDirection, setFilterDirection] = useState<ChequeDirection | "">("");
  const [filterKind, setFilterKind] = useState<ChequeKind | "">("");
  const [filterFrom, setFilterFrom] = useState<string | null>(null);
  const [filterTo, setFilterTo] = useState<string | null>(null);

  // Construit les filtres API selon l'onglet actif
  const buildFilters = (): ChequeFilters => {
    const today = new Date().toISOString().slice(0, 10);
    const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const base: ChequeFilters = {
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterDirection ? { direction: filterDirection } : {}),
      ...(filterKind ? { kind: filterKind } : {}),
      ...(filterFrom ? { cash_date_from: filterFrom } : {}),
      ...(filterTo ? { cash_date_to: filterTo } : {}),
    };

    if (tab === "upcoming") {
      return {
        ...base,
        status: "pending",
        cash_date_from: today,
        cash_date_to: in30days,
      };
    }
    if (tab === "history") {
      return {
        ...base,
        cash_date_to: today,
      };
    }
    return base;
  };

  const chequesQuery = useCheques(buildFilters());
  const createCheque = useCreateCheque();
  const cashCheque = useCashCheque();
  const rejectCheque = useRejectCheque();

  const cheques = chequesQuery.data?.results ?? [];

  const handleCreate = async (values: ChequeFormValues) => {
    try {
      await createCheque.mutateAsync(values);
      toast.success("Chèque enregistré.");
      setModalState({ kind: "closed" });
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error("Erreur lors de l'enregistrement.");
      }
    }
  };

  const handleCash = async () => {
    if (modalState.kind !== "cash") return;
    try {
      await cashCheque.mutateAsync(modalState.cheque.id);
      toast.success("Chèque traité — transaction créée.");
      setModalState({ kind: "closed" });
    } catch {
      toast.error("Impossible de traiter ce chèque.");
    }
  };

  const handleReject = async () => {
    if (modalState.kind !== "reject") return;
    try {
      await rejectCheque.mutateAsync(modalState.cheque.id);
      toast.success("Chèque marqué rejeté.");
      setModalState({ kind: "closed" });
    } catch {
      toast.error("Impossible de rejeter ce chèque.");
    }
  };

  const cashLabel =
    modalState.kind === "cash"
      ? modalState.cheque.direction === "in"
        ? "Encaisser"
        : "Marquer débité"
      : "Confirmer";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Chèques"
        subtitle={
          chequesQuery.data
            ? `${chequesQuery.data.count} chèque(s)`
            : undefined
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<Filter size={14} aria-hidden="true" />}
              onClick={() => setShowFilters((v) => !v)}
            >
              <span className="hidden sm:inline">Filtres</span>
            </Button>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<ScanLine size={14} aria-hidden="true" />}
              onClick={() => navigate(ROUTES.CHEQUES_SCAN)}
            >
              <span className="hidden sm:inline">Scanner</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              iconLeft={<Plus size={14} aria-hidden="true" />}
              onClick={() => setModalState({ kind: "create" })}
            >
              <span className="hidden sm:inline">Nouveau</span>
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <ChequesKpis />

      {/* Filtres */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg border border-line bg-bg-card">
          <Select
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as ChequeStatus | "")}
            options={STATUS_OPTIONS}
            aria-label="Filtrer par statut"
          />
          <Select
            value={filterDirection}
            onChange={(v) => setFilterDirection(v as ChequeDirection | "")}
            options={DIRECTION_OPTIONS}
            aria-label="Filtrer par direction"
          />
          <Select
            value={filterKind}
            onChange={(v) => setFilterKind(v as ChequeKind | "")}
            options={KIND_OPTIONS}
            aria-label="Filtrer par type"
          />
          <div className="flex gap-2">
            <DatePicker
              value={filterFrom}
              onChange={setFilterFrom}
              placeholder="Du…"
              className="flex-1"
            />
            <DatePicker
              value={filterTo}
              onChange={setFilterTo}
              placeholder="Au…"
              className="flex-1"
            />
          </div>
        </div>
      )}

      {/* Onglets */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        className="rounded-lg border border-line bg-bg-card overflow-hidden"
      >
        <Tabs.List>
          <Tabs.Trigger value="upcoming">À venir 30j</Tabs.Trigger>
          <Tabs.Trigger value="all">Tous</Tabs.Trigger>
          <Tabs.Trigger value="history">Historique</Tabs.Trigger>
        </Tabs.List>

        {(["upcoming", "all", "history"] as const).map((t) => (
          <Tabs.Content key={t} value={t} className="p-0">
            <ChequesTable
              cheques={cheques}
              isLoading={chequesQuery.isLoading}
              onCash={(c) => setModalState({ kind: "cash", cheque: c })}
              onReject={(c) => setModalState({ kind: "reject", cheque: c })}
              onPhoto={(c) => setModalState({ kind: "photo", cheque: c })}
            />
          </Tabs.Content>
        ))}
      </Tabs>

      {/* Modal création */}
      <Modal
        open={modalState.kind === "create"}
        onClose={() => setModalState({ kind: "closed" })}
        title="Nouveau chèque"
        size="lg"
        disableBackdropClose
      >
        <ChequeForm
          onSubmit={handleCreate}
          onCancel={() => setModalState({ kind: "closed" })}
          isLoading={createCheque.isPending}
        />
      </Modal>

      {/* Modal confirmation encaissement */}
      <Modal
        open={modalState.kind === "cash"}
        onClose={() => setModalState({ kind: "closed" })}
        title={
          modalState.kind === "cash"
            ? modalState.cheque.direction === "in"
              ? "Marquer encaissé ?"
              : "Marquer débité ?"
            : "Confirmer"
        }
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setModalState({ kind: "closed" })}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleCash}
              loading={cashCheque.isPending}
            >
              {cashLabel}
            </Button>
          </>
        }
      >
        {modalState.kind === "cash" && (
          <div className="flex flex-col gap-2 text-sm text-ink">
            <p>
              <strong>{modalState.cheque.bank_display}</strong> ·{" "}
              {modalState.cheque.account_holder}
            </p>
            <p className="text-ink-muted">
              Une transaction sera créée automatiquement.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal confirmation rejet */}
      <Modal
        open={modalState.kind === "reject"}
        onClose={() => setModalState({ kind: "closed" })}
        title="Marquer rejeté ?"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setModalState({ kind: "closed" })}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              loading={rejectCheque.isPending}
            >
              Confirmer le rejet
            </Button>
          </>
        }
      >
        {modalState.kind === "reject" && (
          <div className="text-sm text-ink">
            <p>
              Chèque de{" "}
              <strong>{modalState.cheque.account_holder}</strong> ·{" "}
              {modalState.cheque.bank_display}
            </p>
            <p className="mt-2 text-ink-muted">
              Aucune transaction ne sera créée.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal photo */}
      <Modal
        open={modalState.kind === "photo"}
        onClose={() => setModalState({ kind: "closed" })}
        title="Photos du chèque"
        size="md"
      >
        {modalState.kind === "photo" && (
          <ChequePhotoUploader
            chequeId={modalState.cheque.id}
            photoFrontUrl={modalState.cheque.photo_front_url}
            photoBackUrl={modalState.cheque.photo_back_url}
          />
        )}
      </Modal>
    </div>
  );
}
