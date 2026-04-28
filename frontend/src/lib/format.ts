import Decimal from "decimal.js";

/**
 * Utilitaires de formatage pour l'app Amlak.
 * Locale : fr-MA (affichage) / fr-FR (Intl interne pour stabilité cross-env).
 * Devise : DH (Dirham marocain).
 * Les montants arrivent en string depuis l'API (jamais de float).
 */

const INTERNAL_LOCALE = "fr-FR";

/**
 * Formate un montant en string Decimal vers le format FR.
 * Exemples :
 *   formatMoney("120000")             → "120 000"
 *   formatMoney("120000.50")          → "120 000,50"
 *   formatMoney("120000", { withCurrency: true }) → "120 000 DH"
 */
export function formatMoney(
  value: string | number | Decimal,
  options: { withCurrency?: boolean } = {}
): string {
  try {
    const dec = value instanceof Decimal ? value : new Decimal(value);
    const num = dec.toNumber();

    // Calcul du nombre de décimales à afficher :
    // - Si l'input est une string, on lit directement les décimales de la string
    // - Si la partie décimale est entièrement zéro (ex: 0.00), on affiche sans décimales
    // - Sinon, on garde le nombre exact de décimales fourni
    let significantDecimals = 0;
    if (typeof value === "string") {
      const dotIndex = value.indexOf(".");
      if (dotIndex >= 0) {
        const fracPart = value.slice(dotIndex + 1);
        // Supprimer uniquement si toutes les décimales sont 0 (ex: "0.00" → 0 décimales)
        significantDecimals = /^0+$/.test(fracPart) ? 0 : fracPart.length;
      }
    } else if (!(value instanceof Decimal)) {
      // number : utiliser les décimales naturelles
      const numStr = String(value);
      const numDotIndex = numStr.indexOf(".");
      significantDecimals = numDotIndex >= 0 ? numStr.length - numDotIndex - 1 : 0;
    } else {
      // Decimal instance
      significantDecimals = dec.isInteger() ? 0 : dec.decimalPlaces();
    }

    const formatted = new Intl.NumberFormat(INTERNAL_LOCALE, {
      minimumFractionDigits: significantDecimals,
      maximumFractionDigits: significantDecimals,
      useGrouping: true,
    }).format(num);

    return options.withCurrency ? `${formatted} DH` : formatted;
  } catch {
    return "";
  }
}

/**
 * Formate une date ISO vers le format français.
 * short : "24/04/2026"
 * long  : "24 avr. 2026"
 * Retourne "" si la date est invalide.
 */
export function formatDate(
  iso: string,
  style: "short" | "long" = "short"
): string {
  const date = new Date(iso);

  if (isNaN(date.getTime())) {
    return "";
  }

  if (style === "short") {
    return new Intl.DateTimeFormat(INTERNAL_LOCALE, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat(INTERNAL_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
