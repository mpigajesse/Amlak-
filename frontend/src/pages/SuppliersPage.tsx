import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useTitle } from "@/hooks/useTitle";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/useToast";
import { SuppliersTable } from "@/components/suppliers/SuppliersTable";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import {
  SUPPLIER_CATEGORY_FILTER_OPTIONS,
} from "@/components/suppliers/constants";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useToggleSupplierActive,
} from "@/api/suppliers";
import type { SupplierFilters, SupplierList } from "@/lib/types";
import type { SupplierFormValues } from "@/lib/validation";
import { useDebounce } from "@/hooks/useDebounce";

const IS_ACTIVE_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "true", label: "Actifs uniquement" },
  { value: "false", label: "Inactifs uniquement" },
];

/** Page liste des fournisseurs — /fournisseurs */
export function SuppliersPage() {
  useTitle("Fournisseurs");
  const toast = useToast();

  // ── Filtres ──────────────────────────────────────────────────────────────────
  const [searchRaw, setSearchRaw] = useState("");
  const [category, setCategory] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [page, setPage] = useState(1);

  const search = useDebounce(searchRaw, 300);

  const filters: SupplierFilters = {
    ...(search ? { search } : {}),
    ...(category ? { category: category as SupplierFilters["category"] } : {}),
    ...(isActiveFilter !== ""
      ? { is_active: isActiveFilter === "true" }
      : {}),
    page,
  };

  const { data, isLoading, error } = useSuppliers(filters);

  // ── Modals ───────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupplierList | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierList | null>(null);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const toggleActive = useToggleSupplierActive();

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(
    async (values: SupplierFormValues) => {
      await createSupplier.mutateAsync({
        ...values,
        email: values.email || undefined,
        ice: values.ice || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        notes: values.notes || undefined,
      });
      toast.success("Fournisseur créé avec succès");
      setCreateOpen(false);
    },
    [createSupplier, toast]
  );

  const handleEdit = useCallback(
    async (values: SupplierFormValues) => {
      if (!editTarget) return;
      await updateSupplier.mutateAsync({
        id: editTarget.id,
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
      setEditTarget(null);
    },
    [editTarget, updateSupplier, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteSupplier.mutateAsync(deleteTarget.id);
      toast.success("Fournisseur supprimé");
    } catch {
      toast.error(
        "Impossible de supprimer ce fournisseur — des transactions ou chèques lui sont liés."
      );
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteSupplier, toast]);

  const handleToggleActive = useCallback(
    async (supplier: SupplierList) => {
      await toggleActive.mutateAsync({
        id: supplier.id,
        is_active: !supplier.is_active,
      });
      toast.success(
        supplier.is_active ? "Fournisseur désactivé" : "Fournisseur activé"
      );
    },
    [toggleActive, toast]
  );

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  const totalPages =
    data && data.count > 0 ? Math.ceil(data.count / 20) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fournisseurs"
        subtitle={data ? `${data.count} fournisseur${data.count !== 1 ? "s" : ""}` : undefined}
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus size={14} aria-hidden="true" />}
            onClick={() => setCreateOpen(true)}
          >
            Nouveau
          </Button>
        }
      />

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Rechercher par nom, téléphone, ICE…"
          value={searchRaw}
          onChange={(e) => {
            setSearchRaw(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />

        <Select
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
          options={SUPPLIER_CATEGORY_FILTER_OPTIONS}
          aria-label="Filtrer par catégorie"
          className="sm:w-52"
        />

        <Select
          value={isActiveFilter}
          onChange={(v) => {
            setIsActiveFilter(v);
            setPage(1);
          }}
          options={IS_ACTIVE_OPTIONS}
          aria-label="Filtrer par statut"
          className="sm:w-44"
        />
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded bg-negative/[0.07] text-negative text-sm font-sans">
          Impossible de charger les fournisseurs.
        </div>
      ) : (
        <SuppliersTable
          suppliers={data?.results ?? []}
          onEdit={(s) => setEditTarget(s)}
          onDelete={(s) => setDeleteTarget(s)}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <span className="text-xs text-ink-muted font-sans">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Modal création */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau fournisseur"
        size="lg"
        disableBackdropClose
      >
        <SupplierForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          isSubmitting={createSupplier.isPending}
        />
      </Modal>

      {/* Modal édition */}
      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Modifier le fournisseur"
        size="lg"
        disableBackdropClose
      >
        {editTarget && (
          <SupplierForm
            defaultValues={editTarget}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            isSubmitting={updateSupplier.isPending}
          />
        )}
      </Modal>

      {/* Modal suppression */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le fournisseur"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
            >
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
          <strong className="font-semibold">{deleteTarget?.name}</strong> ?
          Cette action est irréversible. Si des transactions ou chèques sont
          liés à ce fournisseur, la suppression sera refusée.
        </p>
      </Modal>
    </div>
  );
}
