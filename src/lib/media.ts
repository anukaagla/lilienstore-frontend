const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const toAbsoluteMediaUrl = (value: unknown, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (!API_BASE_URL) {
    return trimmed;
  }

  try {
    return new URL(trimmed, API_BASE_URL).toString();
  } catch {
    return trimmed;
  }
};
