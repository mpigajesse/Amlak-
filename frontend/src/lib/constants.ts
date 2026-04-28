/**
 * Constantes métier de l'app Amlak.
 * Sprint 1 : squelettes — seront étoffés aux sprints correspondants.
 */

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/",
  PROJECTS: "/projets",
  TRANSACTIONS: "/transactions",
  CHEQUES: "/cheques",
  CHEQUES_SCAN: "/cheques/scan",
  CHEQUES_CALENDAR: "/cheques/calendrier",
  SUPPLIERS: "/fournisseurs",
  REPORTS: "/rapports",
  SETTINGS: "/parametres",
} as const;

/**
 * Étapes du cycle Achat (Acquisition).
 * Sprint 2+ : utilisé dans le kanban projets.
 */
export const ACQUISITION_STAGES = [
  { key: "opportunite", label: "Opportunité" },
  { key: "negociation", label: "Négociation" },
  { key: "promis", label: "Promis" },
  { key: "compromis", label: "Compromis" },
  { key: "reserve", label: "Réservé" },
  { key: "achete", label: "Acheté" },
] as const;

/**
 * Étapes du cycle Vente (StockUnit).
 * Sprint 3+ : utilisé dans le kanban ventes.
 */
export const STOCK_UNIT_STAGES = [
  { key: "stock", label: "Stock" },
  { key: "reservation", label: "Réservation" },
  { key: "compromis", label: "Compromis" },
  { key: "encaisse", label: "Encaissé" },
] as const;

/**
 * Catégories de transactions.
 * Sprint 2+ : utilisé dans les formulaires.
 */
export const TRANSACTION_CATEGORIES = [
  { value: "acquisition", label: "Acquisition" },
  { value: "travaux", label: "Travaux" },
  { value: "admin", label: "Administration" },
  { value: "commercialisation", label: "Commercialisation" },
  { value: "vente", label: "Vente" },
  { value: "autre", label: "Autre" },
] as const;

/**
 * Banques marocaines — slugs + libellés affichés.
 * Utilisés dans ChequeForm et OCRScanner.
 */
export const BANK_OPTIONS = [
  { value: "attijariwafa", label: "Attijariwafa Bank" },
  { value: "bcp", label: "Banque Populaire (BCP)" },
  { value: "bmce", label: "BMCE Bank (Bank of Africa)" },
  { value: "cih", label: "CIH Bank" },
  { value: "cdm", label: "Crédit du Maroc" },
  { value: "sgma", label: "Société Générale Maroc" },
  { value: "bmci", label: "BMCI" },
  { value: "al_barid", label: "Al Barid Bank" },
  { value: "cam", label: "Crédit Agricole du Maroc" },
  { value: "cfg", label: "CFG Bank" },
  { value: "umnia", label: "Umnia Bank" },
  { value: "al_yousr", label: "Bank Al-Yousr" },
  { value: "dar_al_amane", label: "Dar Al Amane" },
  { value: "autre", label: "Autre" },
] as const;

export const CHEQUE_KIND_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "garantie", label: "Garantie" },
  { value: "caution", label: "Caution" },
  { value: "postdate", label: "Postdaté" },
] as const;

/**
 * Seuils d'alerte par défaut (chèques).
 * Sprint 5+ : alertes et notifications.
 */
export const DEFAULT_ALERTS = {
  cheque_days: [7, 3, 1],
} as const;
