import { useState, type ReactNode } from "react";
import { useTitle } from "@/hooks/useTitle";
import { Download, TrendingDown, TrendingUp, FileBarChart, Users, Tag, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LIBELLE_BLANC, LIBELLE_NOIR } from "@/lib/libelles";

// ── Types mock ──────────────────────────────────────────────────────────────

interface MonthlySummaryRow {
  mois: string;
  entrees_blanc: string;
  entrees_noir: string;
  entrees_total: string;
  sorties: string;
  solde: string;
}

interface ProjectSummaryRow {
  nom: string;
  budget: string;
  consomme: string;
  restant: string;
  pourcentage: number;
}

interface SupplierRow {
  rang: number;
  nom: string;
  montant_sorti: string;
  nb_transactions: number;
}

interface CategoryRow {
  categorie: string;
  montant: string;
  pourcentage: number;
  couleur: string;
}

interface ChequeStatusCount {
  statut: string;
  label: string;
  count: number;
  variant: "neutral" | "info" | "positive" | "negative" | "warning";
}

// ── Données mock ─────────────────────────────────────────────────────────
// TODO: Remplacer par les appels API réels aux Sprints 7+
// Endpoints prévus : GET /reports/monthly-summary/, /reports/by-project/, etc.

const MOCK_MONTHLY_SUMMARY: MonthlySummaryRow[] = [
  {
    mois: "Novembre 2025",
    entrees_blanc: "320 000",
    entrees_noir: "80 000",
    entrees_total: "400 000",
    sorties: "210 000",
    solde: "190 000",
  },
  {
    mois: "Décembre 2025",
    entrees_blanc: "180 000",
    entrees_noir: "40 000",
    entrees_total: "220 000",
    sorties: "350 000",
    solde: "-130 000",
  },
  {
    mois: "Janvier 2026",
    entrees_blanc: "500 000",
    entrees_noir: "120 000",
    entrees_total: "620 000",
    sorties: "280 000",
    solde: "340 000",
  },
  {
    mois: "Février 2026",
    entrees_blanc: "240 000",
    entrees_noir: "60 000",
    entrees_total: "300 000",
    sorties: "195 000",
    solde: "105 000",
  },
  {
    mois: "Mars 2026",
    entrees_blanc: "410 000",
    entrees_noir: "90 000",
    entrees_total: "500 000",
    sorties: "320 000",
    solde: "180 000",
  },
  {
    mois: "Avril 2026",
    entrees_blanc: "280 000",
    entrees_noir: "70 000",
    entrees_total: "350 000",
    sorties: "140 000",
    solde: "210 000",
  },
];

const MOCK_PROJECT_SUMMARY: ProjectSummaryRow[] = [
  {
    nom: "Résidence Al Farah",
    budget: "4 500 000",
    consomme: "2 700 000",
    restant: "1 800 000",
    pourcentage: 60,
  },
  {
    nom: "Villa Bouchra",
    budget: "1 200 000",
    consomme: "1 100 000",
    restant: "100 000",
    pourcentage: 92,
  },
  {
    nom: "Immeuble Hay Riad",
    budget: "8 000 000",
    consomme: "1 600 000",
    restant: "6 400 000",
    pourcentage: 20,
  },
];

const MOCK_SUPPLIER_ROWS: SupplierRow[] = [
  { rang: 1, nom: "BTP Maroc Travaux", montant_sorti: "680 000", nb_transactions: 12 },
  { rang: 2, nom: "Entreprise El Mansouri", montant_sorti: "420 000", nb_transactions: 8 },
  { rang: 3, nom: "Matériaux Atlas", montant_sorti: "315 000", nb_transactions: 24 },
  { rang: 4, nom: "Électricité Rachid", montant_sorti: "180 000", nb_transactions: 6 },
  { rang: 5, nom: "Plomberie Hassan", montant_sorti: "95 000", nb_transactions: 5 },
];

const MOCK_CATEGORY_ROWS: CategoryRow[] = [
  { categorie: "Acquisition foncière", montant: "3 200 000", pourcentage: 48, couleur: "var(--accent)" },
  { categorie: "Travaux de construction", montant: "2 400 000", pourcentage: 36, couleur: "var(--blanc)" },
  { categorie: "Frais administratifs", montant: "560 000", pourcentage: 8, couleur: "var(--noir)" },
  { categorie: "Commercialisation", montant: "530 000", pourcentage: 8, couleur: "var(--warning)" },
];

const MOCK_CHEQUE_STATUSES: ChequeStatusCount[] = [
  { statut: "en_attente", label: "En attente", count: 14, variant: "neutral" },
  { statut: "emis", label: "Émis", count: 7, variant: "warning" },
  { statut: "encaisse", label: "Encaissé", count: 43, variant: "positive" },
  { statut: "rejete", label: "Rejeté", count: 2, variant: "negative" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Formate un montant en string avec séparateur milliers FR + DH */
function formatMoney(amount: string): string {
  const num = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
  if (isNaN(num)) return `${amount} DH`;
  const formatted = new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
  return `${formatted} DH`;
}

/** Format date locale FR */
function formatDateFr(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-MA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Détermine si un solde est positif (pour la couleur) */
function isSoldePositif(solde: string): boolean {
  return !solde.startsWith("-");
}

// ── Sous-composants ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  icon: ReactNode;
  description?: string;
}

function SectionHeader({ title, icon, description }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-shrink-0 text-accent">{icon}</span>
      <div>
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {description && (
          <p className="text-xs text-ink-muted font-sans mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

/** Barre de progression budget (implémentation locale pour éviter dépendance shared/) */
interface BudgetBarLocalProps {
  pourcentage: number;
}

function BudgetBarLocal({ pourcentage: rawPct }: BudgetBarLocalProps) {
  const pct = Math.min(100, Math.max(0, rawPct));
  const isWarning = pct >= 80 && pct < 100;
  const isDanger = pct >= 100;

  const barColor = isDanger
    ? "var(--negative)"
    : isWarning
    ? "var(--warning)"
    : "var(--accent)";

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${pct} % consommé`}
      className="flex items-center gap-2"
    >
      <div className="flex-1 h-1.5 rounded-full bg-bg-subtle overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span
        className="text-xs font-mono tabular-nums w-10 text-right font-sans"
        style={{ color: barColor }}
      >
        {pct} %
      </span>
    </div>
  );
}

// ── Filtres (placeholder UX) ─────────────────────────────────────────────

interface FiltersBarProps {
  dateDebut: string;
  dateFin: string;
  onDateDebutChange: (v: string) => void;
  onDateFinChange: (v: string) => void;
}

function FiltersBar({
  dateDebut,
  dateFin,
  onDateDebutChange,
  onDateFinChange,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-date-debut"
          className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
        >
          Période du
        </label>
        <input
          id="filter-date-debut"
          type="date"
          value={dateDebut}
          onChange={(e) => onDateDebutChange(e.target.value)}
          className="rounded bg-bg border border-line px-3 py-2 text-sm text-ink font-sans focus:outline-none focus:border-accent hover:border-line-strong transition-colors"
          style={{ transitionDuration: "var(--transition-fast)" }}
          aria-label="Date de début"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-date-fin"
          className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
        >
          Au
        </label>
        <input
          id="filter-date-fin"
          type="date"
          value={dateFin}
          onChange={(e) => onDateFinChange(e.target.value)}
          className="rounded bg-bg border border-line px-3 py-2 text-sm text-ink font-sans focus:outline-none focus:border-accent hover:border-line-strong transition-colors"
          style={{ transitionDuration: "var(--transition-fast)" }}
          aria-label="Date de fin"
        />
      </div>

      {/* Placeholder Projet */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-projet"
          className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
        >
          Projet
        </label>
        <button
          id="filter-projet"
          type="button"
          disabled
          aria-label="Filtrer par projet — disponible Sprint 2"
          className="rounded bg-bg border border-line px-3 py-2 text-sm text-ink-disabled font-sans cursor-not-allowed opacity-60"
        >
          Tous les projets
        </button>
      </div>

      {/* Placeholder Catégorie */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-categorie"
          className="text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
        >
          Catégorie
        </label>
        <button
          id="filter-categorie"
          type="button"
          disabled
          aria-label="Filtrer par catégorie — disponible Sprint 3"
          className="rounded bg-bg border border-line px-3 py-2 text-sm text-ink-disabled font-sans cursor-not-allowed opacity-60"
        >
          Toutes les catégories
        </button>
      </div>
    </div>
  );
}

// ── Section Synthèse mensuelle ────────────────────────────────────────────

function SyntheseMensuelle() {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Synthèse mensuelle"
          icon={<TrendingUp size={18} aria-hidden="true" />}
          description="Flux entrants et sortants par mois"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[640px]" aria-label="Synthèse mensuelle">
            <thead>
              <tr className="border-b border-line">
                <th
                  scope="col"
                  className="pb-2 text-left text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
                >
                  Mois
                </th>
                <th
                  scope="col"
                  className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
                >
                  Entrées {LIBELLE_BLANC}
                </th>
                <th
                  scope="col"
                  className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
                >
                  Entrées {LIBELLE_NOIR}
                </th>
                <th
                  scope="col"
                  className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
                >
                  Total Entrées
                </th>
                <th
                  scope="col"
                  className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
                >
                  Sorties
                </th>
                <th
                  scope="col"
                  className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans"
                >
                  Solde
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MONTHLY_SUMMARY.map((row) => {
                const positif = isSoldePositif(row.solde);
                return (
                  <tr key={row.mois} className="border-b border-line last:border-0 hover:bg-black/[0.015]">
                    <td className="py-3 text-sm font-sans text-ink">{row.mois}</td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-mono tabular-nums" style={{ color: "var(--blanc)" }}>
                        {formatMoney(row.entrees_blanc)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-mono tabular-nums" style={{ color: "var(--noir)" }}>
                        {formatMoney(row.entrees_noir)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-mono tabular-nums text-ink font-medium">
                        {formatMoney(row.entrees_total)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-mono tabular-nums text-negative">
                        {formatMoney(row.sorties)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className="text-sm font-mono tabular-nums font-medium"
                        style={{ color: positif ? "var(--positive)" : "var(--negative)" }}
                      >
                        {positif ? "+" : ""}{formatMoney(row.solde)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section Par projet ───────────────────────────────────────────────────

function ParProjet() {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Par projet"
          icon={<FileBarChart size={18} aria-hidden="true" />}
          description="Consommation budgétaire par projet"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[580px]" aria-label="Synthèse par projet">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="pb-2 text-left text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                  Projet
                </th>
                <th scope="col" className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                  Budget
                </th>
                <th scope="col" className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                  Consommé
                </th>
                <th scope="col" className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                  Restant
                </th>
                <th scope="col" className="pb-2 text-left text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans pl-4">
                  Avancement
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PROJECT_SUMMARY.map((row) => (
                <tr key={row.nom} className="border-b border-line last:border-0 hover:bg-black/[0.015]">
                  <td className="py-3 text-sm font-sans text-ink font-medium">{row.nom}</td>
                  <td className="py-3 text-right text-sm font-mono tabular-nums text-ink-soft">
                    {formatMoney(row.budget)}
                  </td>
                  <td className="py-3 text-right text-sm font-mono tabular-nums text-negative">
                    {formatMoney(row.consomme)}
                  </td>
                  <td className="py-3 text-right text-sm font-mono tabular-nums text-positive">
                    {formatMoney(row.restant)}
                  </td>
                  <td className="py-3 pl-4 w-48">
                    <BudgetBarLocal pourcentage={row.pourcentage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section Par fournisseur ──────────────────────────────────────────────

function ParFournisseur() {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Top fournisseurs"
          icon={<Users size={18} aria-hidden="true" />}
          description="Les 5 principaux fournisseurs par montant payé"
        />
      </CardHeader>
      <CardContent>
        <table className="w-full" aria-label="Top fournisseurs par montant">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="pb-2 text-left text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans w-8">
                #
              </th>
              <th scope="col" className="pb-2 text-left text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                Fournisseur
              </th>
              <th scope="col" className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                Montant payé
              </th>
              <th scope="col" className="pb-2 text-right text-[10px] uppercase tracking-[0.12em] font-medium text-ink-muted font-sans">
                Transactions
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SUPPLIER_ROWS.map((row) => (
              <tr key={row.rang} className="border-b border-line last:border-0 hover:bg-black/[0.015]">
                <td className="py-3 text-sm font-mono text-ink-muted tabular-nums">{row.rang}</td>
                <td className="py-3 text-sm font-sans text-ink font-medium">{row.nom}</td>
                <td className="py-3 text-right text-sm font-mono tabular-nums text-ink">
                  {formatMoney(row.montant_sorti)}
                </td>
                <td className="py-3 text-right text-sm font-mono tabular-nums text-ink-soft">
                  {row.nb_transactions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Section Par catégorie (graphique CSS) ────────────────────────────────
// Recharts non disponible dans package.json Sprint 1 → implémentation CSS bar chart.
// TODO Sprint 7 : remplacer par <PieChart> Recharts si ajouté aux dépendances.

function ParCategorie() {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Par catégorie de frais"
          icon={<Tag size={18} aria-hidden="true" />}
          description="Répartition des dépenses par catégorie"
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-3" role="list" aria-label="Répartition par catégorie">
          {MOCK_CATEGORY_ROWS.map((row) => (
            <div key={row.categorie} role="listitem">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-sans text-ink">{row.categorie}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono tabular-nums text-ink-soft">
                    {formatMoney(row.montant)}
                  </span>
                  <span
                    className="text-xs font-mono tabular-nums font-medium w-10 text-right"
                    style={{ color: row.couleur }}
                  >
                    {row.pourcentage} %
                  </span>
                </div>
              </div>
              <div
                role="progressbar"
                aria-valuenow={row.pourcentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${row.categorie} : ${row.pourcentage} %`}
                className="h-2 rounded-full bg-bg-subtle overflow-hidden"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.pourcentage}%`,
                    backgroundColor: row.couleur,
                    transition: "width 300ms ease-out",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Légende */}
        <div className="mt-5 pt-4 border-t border-line flex flex-wrap gap-4">
          {MOCK_CATEGORY_ROWS.map((row) => (
            <div key={row.categorie} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: row.couleur }}
                aria-hidden="true"
              />
              <span className="text-xs font-sans text-ink-soft">{row.categorie}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section Chèques en circulation ───────────────────────────────────────

function ChequesEnCirculation() {
  const total = MOCK_CHEQUE_STATUSES.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Chèques en circulation"
          icon={<Clock size={18} aria-hidden="true" />}
          description="Répartition des chèques par statut"
        />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MOCK_CHEQUE_STATUSES.map((status) => (
            <div
              key={status.statut}
              className="flex flex-col gap-2 p-4 rounded-lg bg-bg-subtle border border-line"
            >
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="text-2xl font-mono tabular-nums font-semibold text-ink">
                {status.count}
              </span>
              <span className="text-xs text-ink-muted font-sans">
                {total > 0 ? Math.round((status.count / total) * 100) : 0} % du total
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-ink-muted font-sans text-right">
          Total : <span className="font-mono tabular-nums font-medium text-ink">{total} chèques</span>
        </p>
      </CardContent>
    </Card>
  );
}

// ── Page principale ────────────────────────────────────────────────────────

/**
 * Page Rapports — squelette UX complet avec données mock.
 * Les rapports seront alimentés par les données réelles dès le Sprint 7.
 *
 * TODO Sprint 7 :
 *  - GET /reports/monthly-summary/?start=&end=
 *  - GET /reports/by-project/
 *  - GET /reports/by-supplier/?limit=10
 *  - GET /reports/by-category/
 *  - GET /cheques/stats/
 *  - Export CSV : GET /reports/export/csv/?type=...
 */
export function ReportsPage() {
  useTitle("Rapports");
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [dateDebut, setDateDebut] = useState(
    sixMonthsAgo.toISOString().slice(0, 10)
  );
  const [dateFin, setDateFin] = useState(today.toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-ink tracking-tight">
            Rapports
          </h1>
          <p className="mt-1 text-sm text-ink-muted font-sans">
            Exports et analyses consolidées
          </p>
        </div>
        <Button
          variant="secondary"
          disabled
          title="Export CSV disponible dès le Sprint 7"
          iconLeft={<Download size={14} aria-hidden="true" />}
          aria-label="Exporter en CSV — disponible Sprint 7"
        >
          Exporter CSV
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-5">
          <FiltersBar
            dateDebut={dateDebut}
            dateFin={dateFin}
            onDateDebutChange={setDateDebut}
            onDateFinChange={setDateFin}
          />
        </CardContent>
      </Card>

      {/* Période affichée */}
      <p className="text-xs text-ink-muted font-sans">
        Données affichées du{" "}
        <strong className="text-ink">{formatDateFr(dateDebut)}</strong>
        {" "}au{" "}
        <strong className="text-ink">{formatDateFr(dateFin)}</strong>
        {" "}— données fictives (mock)
      </p>

      {/* Sections de rapports */}
      <SyntheseMensuelle />
      <ParProjet />
      <ParFournisseur />
      <ParCategorie />
      <ChequesEnCirculation />

      {/* Pied de page */}
      <div className="flex items-center gap-3 py-4 px-5 rounded-lg bg-bg-subtle border border-line border-dashed">
        <TrendingDown size={16} className="text-ink-disabled flex-shrink-0" aria-hidden="true" />
        <p className="text-xs text-ink-muted font-sans">
          Les rapports seront alimentés par les données réelles dès le Sprint 7. Les chiffres
          affichés actuellement sont des données de démonstration.
        </p>
      </div>
    </div>
  );
}
