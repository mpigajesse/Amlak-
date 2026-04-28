/**
 * Types TypeScript miroir du contrat API.
 * Toute évolution → consulter l'architecte qui met à jour sprint-1-plan.md.
 */

export interface AuthSettings {
  notifications_enabled: boolean;
  alert_thresholds: Record<string, unknown>;
}

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  locale: string;
  settings: AuthSettings;
}

export interface AuthLoginResponse {
  access: string;
  user: AuthUser;
}

export interface ApiError {
  detail: string;
  errors?: Record<string, string[]>;
  code: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Stages & statuts ──────────────────────────────────────────────────────────

export type ProjectStage =
  | "opportunite"
  | "negociation"
  | "promis"
  | "compromis"
  | "reserve"
  | "achete";

export type ProjectLifecycleStage = "opportunite" | "actif" | "cloture";

export type StockUnitStatus =
  | "stock"
  | "reservation"
  | "compromis"
  | "encaisse"
  | "annule";

/** Alias de compatibilité avec StagePill */
export type StockUnitStage = StockUnitStatus;

export type CostAllocationMethod = "surface" | "egal" | "ponderation";

export type TransactionCategory =
  | "acquisition"
  | "travaux"
  | "admin"
  | "commercialisation"
  | "vente"
  | "autre";

// ── Project ───────────────────────────────────────────────────────────────────

export interface Project {
  id: number;
  name: string;
  location: string;
  description: string;
  stage: ProjectLifecycleStage;
  budget_acquisition: string;
  budget_travaux: string;
  budget_admin: string;
  budget_commercialisation: string;
  budget_total: string;
  cost_allocation_method: CostAllocationMethod;
  expected_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  // Computed from backend
  acquisitions_count: number;
  units_count: number;
  units_sold_count: number;
  position?: ProjectPosition;
  budget_status?: BudgetStatus;
  // Detail only
  acquisitions_by_stage?: Record<ProjectStage, Acquisition[]>;
  units?: StockUnit[];
}

export interface ProjectPosition {
  net: string;
  total_in: string;
  total_out: string;
}

export interface BudgetStatus {
  acquisition: BudgetCategoryStatus;
  travaux: BudgetCategoryStatus;
  admin: BudgetCategoryStatus;
  commercialisation: BudgetCategoryStatus;
}

export interface BudgetCategoryStatus {
  budget: string;
  consumed: string;
  remaining: string;
  pct: number;
}

export interface ProjectFilters {
  stage?: ProjectLifecycleStage;
  search?: string;
  page?: number;
}

export interface ProjectCreateInput {
  name: string;
  location?: string;
  description?: string;
  expected_delivery_date?: string | null;
  cost_allocation_method: CostAllocationMethod;
  budget_acquisition: string;
  budget_travaux: string;
  budget_admin: string;
  budget_commercialisation: string;
}

export type ProjectUpdateInput = Partial<ProjectCreateInput> & {
  stage?: ProjectLifecycleStage;
};

// ── Acquisition ───────────────────────────────────────────────────────────────

export interface Acquisition {
  id: number;
  project: number;
  label: string;
  description: string;
  surface: string | null;
  stage: ProjectStage;
  stage_display: string;
  price_target: string | null;
  price_agreed: string | null;
  seller_name: string;
  seller_contact: string;
  notary: string;
  date_opportunite: string | null;
  date_negociation: string | null;
  date_promis: string | null;
  date_compromis: string | null;
  date_reserve: string | null;
  date_achete: string | null;
  option_expires_at: string | null;
  option_days_left: number | null;
  generated_units_count: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AcquisitionCreateInput {
  project: number;
  label: string;
  description?: string;
  surface?: string;
  stage?: ProjectStage;
  price_target?: string;
  price_agreed?: string;
  seller_name?: string;
  seller_contact?: string;
  notary?: string;
  option_expires_at?: string | null;
  notes?: string;
}

export type AcquisitionUpdateInput = Partial<AcquisitionCreateInput>;

// ── StockUnit ─────────────────────────────────────────────────────────────────

export interface StockUnit {
  id: number;
  project: number;
  acquisition: number | null;
  unit_type: string;
  reference: string;
  surface: string;
  floor: string;
  description: string;
  price_target: string;
  status: StockUnitStatus;
  status_display: string;
  buyer_name: string;
  buyer_phone: string;
  date_reservation: string | null;
  date_compromis: string | null;
  date_encaissement: string | null;
  cost_weight: string;
  imputed_cost: string | null;
  margin: { absolute: string; pct: number } | null;
  total_received: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface StockUnitCreateInput {
  project: number;
  acquisition?: number | null;
  unit_type: string;
  reference: string;
  surface: string;
  floor?: string;
  description?: string;
  price_target: string;
  cost_weight?: string;
  notes?: string;
}

export interface GenerateStockInput {
  units: GenerateUnitRow[];
}

export interface GenerateUnitRow {
  unit_type: string;
  reference: string;
  surface: string;
  floor?: string;
  price_target: string;
  cost_weight?: string;
}

// ── Transaction ───────────────────────────────────────────────────────────────

export type TransactionDirection = "in" | "out";
export type TransactionPaymentMode = "espece" | "cheque" | "virement" | "autre";
export type TransactionCategoryValue =
  | "acquisition"
  | "travaux"
  | "admin"
  | "commercialisation"
  | "vente"
  | "autre";

export interface TransactionProjectRef {
  id: number;
  name: string;
}

export interface TransactionSupplierRef {
  id: number;
  name: string;
}

export interface TransactionChequeRef {
  id: number;
  number: string;
}

export interface TransactionStockUnitRef {
  id: number;
  reference: string;
  unit_type: string;
}

/** Objet Transaction tel que retourné par l'API */
export interface Transaction {
  id: number;
  date: string;
  direction: TransactionDirection;
  direction_display: string;
  payment_mode: TransactionPaymentMode;
  payment_mode_display: string;
  /** Montants en string Decimal */
  amount_blanc: string;
  amount_noir: string;
  amount_total: string;
  /** FK id (lecture) — utiliser project_detail pour l'objet */
  project: number | null;
  project_detail: TransactionProjectRef | null;
  category: TransactionCategoryValue;
  category_display: string;
  subcategory: string;
  /** FK id (lecture) — utiliser supplier_detail pour l'objet */
  supplier: number | null;
  supplier_detail: TransactionSupplierRef | null;
  /** FK id (lecture) — utiliser stock_unit_detail pour l'objet */
  stock_unit: number | null;
  stock_unit_detail: TransactionStockUnitRef | null;
  /** FK id (lecture) */
  acquisition: number | null;
  buyer_name_override: string;
  cheque: TransactionChequeRef | null;
  label: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Paramètres de filtre pour GET /transactions/ */
export interface TransactionFilters {
  project?: number | "";
  supplier?: number | "";
  direction?: TransactionDirection | "";
  category?: TransactionCategoryValue | "";
  payment_mode?: TransactionPaymentMode | "";
  from?: string;
  to?: string;
  min?: string;
  max?: string;
  search?: string;
  page?: number;
}

/** Payload création/mise à jour d'une transaction */
export interface TransactionInput {
  date: string;
  direction: TransactionDirection;
  payment_mode: TransactionPaymentMode;
  amount_blanc: string;
  amount_noir: string;
  category: TransactionCategoryValue;
  subcategory?: string;
  project?: number | null;
  supplier?: number | null;
  label?: string;
  notes?: string;
}

/** Payload saisie rapide */
export interface QuickTransactionInput {
  date: string;
  direction: TransactionDirection;
  amount_blanc: string;
  amount_noir: string;
  category: TransactionCategoryValue;
  payment_mode?: TransactionPaymentMode;
  project?: number | null;
  supplier?: number | null;
}

/** Réponse cash-position */
export interface CashPosition {
  blanc: string;
  noir: string;
  total: string;
  in: {
    blanc: string;
    noir: string;
    total: string;
  };
  out: {
    blanc: string;
    noir: string;
    total: string;
  };
}

// ── Cheque ────────────────────────────────────────────────────────────────────

export type ChequeDirection = "in" | "out";

export type ChequeKind = "normal" | "garantie" | "caution" | "postdate";

export type ChequeStatus =
  | "pending"
  | "cashed"
  | "debited"
  | "rejected"
  | "cancelled"
  | "blocked";

export type BankSlug =
  | "attijariwafa"
  | "bcp"
  | "bmce"
  | "cih"
  | "cdm"
  | "sgma"
  | "bmci"
  | "al_barid"
  | "cam"
  | "cfg"
  | "umnia"
  | "al_yousr"
  | "dar_al_amane"
  | "autre";

export interface ChequeProjectRef {
  id: number;
  name: string;
}

export interface ChequeSupplierRef {
  id: number;
  name: string;
}

/** Représentation complète d'un chèque (réponse API) */
export interface Cheque {
  id: number;
  direction: ChequeDirection;
  kind: ChequeKind;
  /** Numéro masqué en liste ("****1234"), complet en détail */
  number: string;
  bank: BankSlug;
  bank_display: string;
  /** Montant total (string Decimal) — calculé = blanc + noir */
  amount: string;
  amount_blanc: string;
  amount_noir: string;
  account_holder: string;
  issue_date: string | null;
  /** Date d'encaissement / due date */
  cash_date: string;
  status: ChequeStatus;
  status_display: string;
  project: ChequeProjectRef | null;
  supplier: ChequeSupplierRef | null;
  alert_days: number[];
  photo_front_url: string | null;
  photo_back_url: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ChequeFilters {
  status?: ChequeStatus;
  direction?: ChequeDirection;
  kind?: ChequeKind;
  project?: number;
  supplier?: number;
  cash_date_from?: string;
  cash_date_to?: string;
  page?: number;
}

export interface ChequeCreateInput {
  direction: ChequeDirection;
  kind: ChequeKind;
  number: string;
  bank: BankSlug;
  amount_blanc: string;
  amount_noir: string;
  account_holder: string;
  issue_date?: string | null;
  cash_date: string;
  project?: number | null;
  supplier?: number | null;
  alert_days?: number[];
  notes?: string;
}

export type ChequeUpdateInput = Partial<ChequeCreateInput> & {
  status?: ChequeStatus;
};

export interface OcrResult {
  number?: string;
  amount?: string;
  bank?: BankSlug;
  bank_display?: string;
  account_holder?: string;
  stub: boolean;
}

// ── Supplier ──────────────────────────────────────────────────────────────────

export type SupplierCategory =
  | "gros_oeuvre"
  | "second_oeuvre"
  | "architecte"
  | "bureau_etudes"
  | "notaire"
  | "courtier"
  | "materiaux"
  | "artisan"
  | "services"
  | "autre";

/** Objet Supplier tel que retourné en liste */
export interface SupplierList {
  id: number;
  name: string;
  category: SupplierCategory | string;
  category_display: string;
  phone: string;
  ice: string;
  is_active: boolean;
  total_engaged: string;
  balance_due: string;
  cheques_count_pending: number;
  created_at: string;
  updated_at: string;
}

/** Objet Supplier complet (détail) */
export interface Supplier extends SupplierList {
  email: string;
  address: string;
  notes: string;
  active_projects: Array<{ id: number; name: string }>;
  breakdown_by_project: Array<{
    project_id: number;
    project_name: string;
    total_engaged: string;
    transactions_count: number;
  }>;
}

export interface SupplierFilters {
  category?: SupplierCategory | "";
  is_active?: boolean | "";
  search?: string;
  page?: number;
}

export interface SupplierCreateInput {
  name: string;
  category?: SupplierCategory | string;
  phone?: string;
  email?: string;
  ice?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
}

export type SupplierUpdateInput = Partial<SupplierCreateInput>;
