export type CurrencyCode = "GEL" | "USD";

const SYMBOLS: Record<CurrencyCode, string> = {
  GEL: "₾",
  USD: "$",
};

// Matches the backend's fallback: when the visitor's country cannot be resolved,
// prices are quoted in GEL.
export const DEFAULT_CURRENCY: CurrencyCode = "GEL";

export const normalizeCurrency = (value: unknown): CurrencyCode => {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return code === "USD" ? "USD" : DEFAULT_CURRENCY;
};

export const getCurrencySymbol = (value: unknown) =>
  SYMBOLS[normalizeCurrency(value)];

const toAmount = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/**
 * The single place a price is turned into text. `min_price` arrives as a number and
 * `variant.price` as a string, so both are accepted.
 */
export const formatMoney = (
  value: number | string | null | undefined,
  currency: unknown,
  { decimals = 2 }: { decimals?: number } = {},
) => {
  const amount = toAmount(value);
  if (amount === null) {
    return "";
  }

  return `${amount.toFixed(decimals)} ${getCurrencySymbol(currency)}`;
};
