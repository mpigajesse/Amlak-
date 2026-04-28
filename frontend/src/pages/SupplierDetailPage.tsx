import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";
import { ArrowLeft, Edit, Trash2, Save } from "lucide-react";
import { isAxiosError } from "axios";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/useToast";
import { SupplierKpis } from "@/components/suppliers/SupplierKpis";
import { SupplierTransactionsSection } from "@/components/suppliers/SupplierTransactionsSection";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { SUPPLIER_CATEGORY_LABELS } from "@/components/suppliers/constants";
import {
  useSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useSupplierCheques,
} from "@/api/suppliers";
import { formatDate } from "@/lib/format";
import type { SupplierFormValues } from "@/lib/validation";

// ── Section Chèques du fournisseur ────────────────────────────────────────────

interface SupplierChequesSectionProps {
  supplierId: number;
}

function SupplierChequesSection({ supplierId }: SupplierChequesSectionProps) {
  const { data, isLoading, error } = useSupplierCheques(supplierId);

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 px-4 py-3 rounded bg-negative/[0.07] text-negative text-sm font-sans">
        Impossible de charger les chèques.
      </div>
    );
  }

  const cheques = data?.results ?? [];

  if (cheques.length === 0) {
    return (
      <div className="mt-4 py-10 text-center text-sm text-ink-muted font-sans">
        Aucun chèque associé à ce fournisseur.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {cheques.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between px-4 py-3 rounded bg-bg-card border border-line text-sm font-sans"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs text-ink-muted">
              {c.number}
            </span>
            <span className="text-ink truncate">{c.bank_display}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Badge
              variant={
                c.status === "pending"
                  ? "warning"
                  : c.status === "debited"
                  ? "positive"
                  : c.status === "rejected"
                  ? "negative"
                  : "neutral"
              }
            >
              {c.status_display}
            </Badge>
            <span className="font-mono tabular-nums text-xs text-ink-muted">
              {formatDate(c.cash_date, "short")}
            </span>
          </div>
        </div>
      ))}

      {data && data.count > cheques.length && (
        <p className="text-xs text-ink-muted font-sans text-center pt-1">
          {cheques.length} sur {data.count} chèques
        </p>
      )}
    </div>
  );
}

// ── Section Infos readonly / édition inline ───────────────────────────────────

interface InfosTabProps {
  supplierId: number;
  onEdit: () => void;
}

function InfosTab({ supplierId, onEdit }: InfosTabProps) {
  const { data: supplier } = useSupplier(supplierId);

  if (!supplier) return null;

  const labelClass =
    "text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans";
  const valueClass = "text-sm font-sans text-ink mt-0.5";

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Edit size={12} aria-hidden="true" />}
          onClick={onEdit}
        >
          Modifier
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className={labelClass}>Nom</p>
            <p className={valueClass}>{supplier.name}</p>
          </div>

          <div>
            <p className={labelClass}>Catégorie</p>
            <p className={valueClass}>
              {supplier.category_display ||
                SUPPLIER_CATEGORY_LABELS[supplier.category] ||
                supplier.category ||
                "—"}
            </p>
          </div>

          <div>
            <p className={labelClass}>Téléphone</p>
            <p className={`${valueClass} font-mono`}>
              {supplier.phone || "—"}
            </p>
          </div>

          <div>
            <p className={labelClass}>Email</p>
            <p className={valueClass}>{supplier.email || "—"}</p>
          </div>

          <div>
            <p className={labelClass}>ICE</p>
            <p className={`${valueClass} font-mono`}>
              {supplier.ice || "—"}
            </p>
          </div>

          <div>
            <p className={labelClass}>Statut</p>
            <div className="mt-0.5">
              {supplier.is_active ? (
                <Badge variant="positive">Actif</Badge>
              ) : (
                <Badge variant="neutral">Inactif</Badge>
              )}
            </div>
          </div>

          {supplier.address && (
            <div className="sm:col-span-2">
              <p className={labelClass}>Adresse</p>
              <p className={valueClass}>{supplier.address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {supplier.breakdown_by_project.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <p className={`${labelClass} mb-3`}>Répartition par projet</p>
            <div className="space-y-2">
              {supplier.breakdown_by_project.map((p) => (
                <div
                  key={p.project_id}
                  className="flex items-center justify-between text-sm font-sans"
                >
                  <span className="text-ink truncate">{p.project_name}</span>
                  <span className="text-ink-muted text-xs flex-shrink-0 ml-2">
                    {p.transactions_count} transaction(s)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Section Notes ─────────────────────────────────────────────────────────────

interface NotesTabProps {
  supplierId: number;
}

function NotesTab({ supplierId }: NotesTabProps) {
  const { data: supplier } = useSupplier(supplierId);
  const [draft, setDraft] = useState<string | null>(null);
  const updateSupplier = useUpdateSupplier();
  const toast = useToast();

  const currentNotes = supplier?.notes ?? "";
  const value = draft ?? currentNotes;

  const handleSave = async () => {
    if (draft === null) return;
    try {
      await updateSupplier.mutateAsync({
        id: supplierId,
        input: { notes: draft },
      });
      toast.success("Notes enregistrées");
      setDraft(null);
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <FormField label="Notes internes" htmlFor="supplier-notes-inline">
        <textarea
          id="supplier-notes-inline"
          rows={6}
          value={value}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Notes sur ce fournisseur…"
          className="w-full rounded bg-bg border border-line px-3 py-2.5 text-sm text-ink font-sans placeholder:text-ink-muted focus:outline-none focus:border-accent hover:border-line-strong resize-none"
        />
      </FormField>

      {draft !== null && draft !== currentNotes && (
        <div className="flex items-center justify-end">
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Save size={12} aria-hidden="true" />}
            loading={updateSupplier.isPending}
            onClick={handleSave}
          >
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

/** Page détail fournisseur — /fournisseurs/:id */
export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const supplierId = id ? parseInt(id, 10) : null;
  const { data: supplier, isLoading, error } = useSupplier(supplierId);
  useTitle(supplier?.name ?? "Fournisseur");

  const [activeTab, setActiveTab] = useState("infos");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const handleEdit = useCallback(
    async (values: SupplierFormValues) => {
      if (!supplierId) return;
      await updateSupplier.mutateAsync({
        id: supplierId,
        input: {
          ...values,
          email: values.email || undefined,
          ice: values.ice || undefined,
          phone: values.phone || undefined,
          address: values.address || undefined,
          notes: values.notes || undefined,
        },
      });
      toast.success("Fournisseur mis à jour");
      setEditOpen(false);
    },
    [supplierId, updateSupplier, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!supplierId) return;
    try {
      await deleteSupplier.mutateAsync(supplierId);
      toast.success("Fournisseur supprimé");
      navigate("/fournisseurs");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          "Impossible de supprimer — des transactions ou chèques sont liés à ce fournisseur."
        );
      } else {
        toast.error("Erreur lors de la suppression");
      }
      setDeleteOpen(false);
    }
  }, [supplierId, deleteSupplier, navigate, toast]);

  // ── États de chargement / erreur ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-8 w-full rounded" />
        <Skeleton className="h-48 w-full rounded" />
      </div>
    );
  }

  if (error || !supplier) {
    const is404 =
      isAxiosError(error) && error.response?.status === 404;

    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="font-display text-xl text-ink">
          {is404 ? "Fournisseur introuvable" : "Erreur de chargement"}
        </p>
        <p className="text-sm text-ink-muted font-sans">
          {is404
            ? "Ce fournisseur n'existe pas ou vous n'y avez pas accès."
            : "Impossible de charger ce fournisseur."}
        </p>
        <Button
          variant="secondary"
          iconLeft={<ArrowLeft size={14} aria-hidden="true" />}
          onClick={() => navigate("/fournisseurs")}
        >
          Retour à la liste
        </Button>
      </div>
    );
  }

  // ── Badge catégorie + statut ──────────────────────────────────────────────

  const categoryLabel =
    supplier.category_display ||
    SUPPLIER_CATEGORY_LABELS[supplier.category] ||
    supplier.category;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-1">
        <button
          type="button"
          onClick={() => navigate("/fournisseurs")}
          aria-label="Retour à la liste des fournisseurs"
          className="text-ink-muted hover:text-ink transition-colors p-1 -ml-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ transitionDuration: "var(--transition-fast)" }}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
      </div>

      <PageHeader
        title={supplier.name}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Edit size={14} aria-hidden="true" />}
              onClick={() => setEditOpen(true)}
            >
              Modifier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Supprimer ce fournisseur"
              className="text-negative hover:text-negative"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {/* Badges catégorie + statut */}
      <div className="flex items-center gap-2 -mt-4">
        {categoryLabel && (
          <Badge variant="neutral">{categoryLabel}</Badge>
        )}
        {supplier.is_active ? (
          <Badge variant="positive">Actif</Badge>
        ) : (
          <Badge variant="neutral">Inactif</Badge>
        )}
      </div>

      {/* KPIs */}
      <SupplierKpis supplier={supplier} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="infos">Infos</Tabs.Trigger>
          <Tabs.Trigger value="transactions">Transactions</Tabs.Trigger>
          <Tabs.Trigger value="cheques">Chèques</Tabs.Trigger>
          <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="infos">
          <InfosTab
            supplierId={supplier.id}
            onEdit={() => setEditOpen(true)}
          />
        </Tabs.Content>

        <Tabs.Content value="transactions">
          <SupplierTransactionsSection supplierId={supplier.id} />
        </Tabs.Content>

        <Tabs.Content value="cheques">
          <SupplierChequesSection supplierId={supplier.id} />
        </Tabs.Content>

        <Tabs.Content value="notes">
          <NotesTab supplierId={supplier.id} />
        </Tabs.Content>
      </Tabs>

      {/* Modal édition */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le fournisseur"
        size="lg"
        disableBackdropClose
      >
        <SupplierForm
          defaultValues={supplier}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          isSubmitting={updateSupplier.isPending}
        />
      </Modal>

      {/* Modal suppression */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer le fournisseur"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              loading={deleteSupplier.isPending}
              onClick={handleDelete}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm font-sans text-ink">
          Supprimer{" "}
          <strong className="font-semibold">{supplier.name}</strong> ? Cette
          action est irréversible.
        </p>
      </Modal>
    </div>
  );
}
