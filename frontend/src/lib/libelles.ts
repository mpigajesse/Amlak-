/**
 * Libellés affichés de la dualité Blanc / Noir.
 *
 * Les montants restent `amount_blanc` / `amount_noir` dans le code et l'API ;
 * seuls les mots montrés à l'écran changent. L'application privée garde
 * « Blanc » / « Noir » (valeurs par défaut). La démo publique, présentée sur
 * un portfolio, utilise « Facturé » / « Hors facture » via les variables
 * VITE_LIBELLE_BLANC et VITE_LIBELLE_NOIR (voir DEPLOIEMENT.md).
 */
export const LIBELLE_BLANC: string = import.meta.env.VITE_LIBELLE_BLANC || "Blanc";
export const LIBELLE_NOIR: string = import.meta.env.VITE_LIBELLE_NOIR || "Noir";
