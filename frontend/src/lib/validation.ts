import { z } from "zod";
import { LIBELLE_BLANC, LIBELLE_NOIR } from "@/lib/libelles";

/**
 * Schémas Zod centralisés.
 */

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ── Projet ────────────────────────────────────────────────────────────────────

export const projectCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit faire au moins 2 caractères")
    .max(200, "Le nom est trop long"),
  location: z.string().max(200, "Localisation trop longue").optional(),
  description: z.string().optional(),
  expected_delivery_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
    .nullable()
    .optional(),
  cost_allocation_method: z.enum(["surface", "egal", "ponderation"]).default(
    "surface"
  ),
  budget_acquisition: z.string().default("0"),
  budget_travaux: z.string().default("0"),
  budget_admin: z.string().default("0"),
  budget_commercialisation: z.string().default("0"),
});

export type ProjectCreateValues = z.infer<typeof projectCreateSchema>;

// ── Acquisition ───────────────────────────────────────────────────────────────

export const acquisitionCreateSchema = z.object({
  label: z.string().min(1, "Le libellé est requis").max(200),
  description: z.string().optional(),
  surface: z.string().optional(),
  price_target: z.string().optional(),
  price_agreed: z.string().optional(),
  seller_name: z.string().max(200).optional(),
  seller_contact: z.string().max(200).optional(),
  notary: z.string().max(200).optional(),
  option_expires_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
    .nullable()
    .optional(),
  notes: z.string().optional(),
});

export type AcquisitionCreateValues = z.infer<typeof acquisitionCreateSchema>;

// ── Génération de stock ───────────────────────────────────────────────────────

export const generateUnitRowSchema = z.object({
  unit_type: z.string().min(1, "Le type est requis"),
  reference: z.string().min(1, "La référence est requise").max(50),
  surface: z.string().refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    "Surface invalide"
  ),
  floor: z.string().max(20).optional(),
  price_target: z.string().refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    "Prix cible invalide"
  ),
  cost_weight: z.string().default("1.00"),
});

export type GenerateUnitRowValues = z.infer<typeof generateUnitRowSchema>;

// ── Transaction ───────────────────────────────────────────────────────────────

const positiveDecimalString = (label: string) =>
  z.string().refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 0,
    `${label} invalide`
  );

/**
 * Catégories autorisées selon la direction.
 * out → acquisition | travaux | admin | commercialisation | autre
 * in  → vente | autre
 */
const CATEGORIES_OUT = [
  "acquisition",
  "travaux",
  "admin",
  "commercialisation",
  "autre",
] as const;
const CATEGORIES_IN = ["vente", "autre"] as const;

export const transactionSchema = z
  .object({
    date: z
      .string()
      .min(1, "La date est requise")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
    direction: z.enum(["in", "out"], {
      required_error: "La direction est requise",
    }),
    payment_mode: z.enum(["espece", "cheque", "virement", "autre"]).default(
      "espece"
    ),
    amount_blanc: positiveDecimalString(`Montant ${LIBELLE_BLANC.toLowerCase()}`),
    amount_noir: positiveDecimalString(`Montant ${LIBELLE_NOIR.toLowerCase()}`),
    category: z.enum(
      ["acquisition", "travaux", "admin", "commercialisation", "vente", "autre"],
      { required_error: "La catégorie est requise" }
    ),
    subcategory: z.string().max(100).optional(),
    project: z.number().int().positive().nullable().optional(),
    supplier: z.number().int().positive().nullable().optional(),
    label: z.string().max(200).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => Number(data.amount_blanc) + Number(data.amount_noir) > 0,
    {
      message: "Le total doit être strictement positif",
      path: ["amount_blanc"],
    }
  )
  .refine(
    (data) => {
      if (data.direction === "out") {
        return (CATEGORIES_OUT as readonly string[]).includes(data.category);
      }
      return (CATEGORIES_IN as readonly string[]).includes(data.category);
    },
    (data) => ({
      message:
        data.direction === "out"
          ? "Catégorie invalide pour une sortie (vente non autorisée)"
          : "Catégorie invalide pour une entrée",
      path: ["category"],
    })
  );

export type TransactionFormValues = z.infer<typeof transactionSchema>;

/** Schéma allégé pour la saisie rapide */
export const quickTransactionSchema = z
  .object({
    date: z
      .string()
      .min(1, "La date est requise")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
    direction: z.enum(["in", "out"], {
      required_error: "La direction est requise",
    }),
    amount_blanc: positiveDecimalString(`Montant ${LIBELLE_BLANC.toLowerCase()}`),
    amount_noir: positiveDecimalString(`Montant ${LIBELLE_NOIR.toLowerCase()}`),
    category: z.enum(
      ["acquisition", "travaux", "admin", "commercialisation", "vente", "autre"],
      { required_error: "La catégorie est requise" }
    ),
    payment_mode: z.enum(["espece", "cheque", "virement", "autre"]).default(
      "espece"
    ),
    project: z.number().int().positive().nullable().optional(),
    supplier: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) => Number(data.amount_blanc) + Number(data.amount_noir) > 0,
    {
      message: "Le total doit être strictement positif",
      path: ["amount_blanc"],
    }
  );

export type QuickTransactionFormValues = z.infer<typeof quickTransactionSchema>;

// ── Chèque ────────────────────────────────────────────────────────────────────

const BANK_SLUGS = [
  "attijariwafa",
  "bcp",
  "bmce",
  "cih",
  "cdm",
  "sgma",
  "bmci",
  "al_barid",
  "cam",
  "cfg",
  "umnia",
  "al_yousr",
  "dar_al_amane",
  "autre",
] as const;

export const chequeSchema = z
  .object({
    direction: z.enum(["in", "out"], {
      required_error: "La direction est requise",
    }),
    kind: z.enum(["normal", "garantie", "caution", "postdate"]).default("normal"),
    number: z
      .string()
      .min(1, "Le numéro est requis")
      .regex(/^\d{7,12}$/, "Numéro de chèque : 7 à 12 chiffres"),
    bank: z.enum(BANK_SLUGS, { required_error: "La banque est requise" }),
    amount_blanc: positiveDecimalString(`Montant ${LIBELLE_BLANC.toLowerCase()}`),
    amount_noir: positiveDecimalString(`Montant ${LIBELLE_NOIR.toLowerCase()}`),
    account_holder: z
      .string()
      .min(1, "Le titulaire est requis")
      .max(200, "Nom trop long"),
    issue_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
      .nullable()
      .optional(),
    cash_date: z
      .string()
      .min(1, "La date d'encaissement est requise")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
    project: z.number().int().positive().nullable().optional(),
    supplier: z.number().int().positive().nullable().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => Number(data.amount_blanc) + Number(data.amount_noir) > 0,
    {
      message: `Le total ${LIBELLE_BLANC.toLowerCase()} + ${LIBELLE_NOIR.toLowerCase()} doit être strictement positif`,
      path: ["amount_blanc"],
    }
  )
  .refine(
    (data) => {
      if (!data.issue_date || !data.cash_date) return true;
      return data.cash_date >= data.issue_date;
    },
    {
      message: "La date d'encaissement doit être ≥ à la date d'émission",
      path: ["cash_date"],
    }
  );

export type ChequeFormValues = z.infer<typeof chequeSchema>;

// ── Fournisseur ───────────────────────────────────────────────────────────────

export const SUPPLIER_CATEGORIES = [
  "gros_oeuvre",
  "second_oeuvre",
  "architecte",
  "bureau_etudes",
  "notaire",
  "courtier",
  "materiaux",
  "artisan",
  "services",
  "autre",
] as const;

export const supplierSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(200, "Le nom est trop long"),
  category: z
    .enum(SUPPLIER_CATEGORIES, { required_error: "La catégorie est requise" })
    .default("autre"),
  phone: z.string().max(50).optional(),
  email: z.string().email("Email invalide").or(z.literal("")).optional(),
  ice: z
    .string()
    .refine(
      (v) => v === "" || /^\d{15}$/.test(v),
      "L'ICE doit contenir exactement 15 chiffres."
    )
    .optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
