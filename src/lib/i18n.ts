export type Language = "EN" | "KA";

export type LocalizedInput = {
  EN?: unknown;
  KA?: unknown;
};

export const DEFAULT_LANGUAGE: Language = "KA";
export const LANGUAGE_STORAGE_KEY = "lilien-language";

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const normalizeLanguage = (value: unknown): Language =>
  value === "KA" ? "KA" : "EN";

export const getAlternateLanguage = (language: Language): Language =>
  language === "EN" ? "KA" : "EN";

export const getLocalizedText = (
  value: unknown,
  language: Language,
  fallback = ""
): string => {
  if (hasText(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const localized = value as LocalizedInput;
    const preferred = localized[language];
    if (hasText(preferred)) {
      return preferred;
    }

    const alternate = localized[getAlternateLanguage(language)];
    if (hasText(alternate)) {
      return alternate;
    }
  }

  return fallback;
};

export const toLocalizedText = (
  value: unknown,
  fallback = ""
): { EN: string; KA: string } => {
  if (hasText(value)) {
    return { EN: value, KA: value };
  }

  if (value && typeof value === "object") {
    const localized = value as LocalizedInput;
    const en = hasText(localized.EN) ? localized.EN : "";
    const ka = hasText(localized.KA) ? localized.KA : "";
    return {
      EN: en || ka || fallback,
      KA: ka || en || fallback,
    };
  }

  return { EN: fallback, KA: fallback };
};

export const byLanguage = <T,>(
  values: Record<Language, T>,
  language: Language
): T => values[language];
