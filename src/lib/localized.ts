/**
 * Reads a text field coming off the API.
 *
 * The storefront is English-only. The backend is being migrated from per-language
 * objects (`{ "EN": "...", "KA": "..." }`) to plain strings, and the frontend ships
 * first, so both shapes have to be tolerated for one release.
 *
 * The object branch is backward compatibility for the pre-migration backend and can
 * be deleted once the backend ships plain strings everywhere.
 */
export function readText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim() ? value : fallback;

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const en = record.EN ?? record.en;
    if (typeof en === "string" && en.trim()) return en;
  }

  return fallback;
}
