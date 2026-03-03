import type { BlogPost } from "../types/blog";
import { toAbsoluteMediaUrl } from "./media";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const BLOG_ENDPOINT = "/api/posts/";

type LocalizedText = {
  KA?: unknown;
  EN?: unknown;
};

const getLocalizedText = (value: unknown, fallback = ""): { KA: string; EN: string } => {
  if (typeof value === "string") {
    return { KA: value, EN: value };
  }
  if (value && typeof value === "object") {
    const localized = value as LocalizedText;
    const ka = typeof localized.KA === "string" ? localized.KA : fallback;
    const en = typeof localized.EN === "string" ? localized.EN : ka || fallback;
    return { KA: ka || en, EN: en || ka };
  }
  return { KA: fallback, EN: fallback };
};

const getString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  return fallback;
};

const getNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const readCoverImage = (entry: Record<string, unknown>) => {
  const explicitUrl = toAbsoluteMediaUrl(entry.cover_image_url);
  if (explicitUrl) return explicitUrl;

  const direct = toAbsoluteMediaUrl(entry.cover_image);
  if (direct) return direct;

  const imageField = entry.image;
  if (typeof imageField === "string") return toAbsoluteMediaUrl(imageField);
  if (imageField && typeof imageField === "object") {
    const imageObject = imageField as Record<string, unknown>;
    const imageUrl = toAbsoluteMediaUrl(imageObject.url ?? imageObject.image);
    if (imageUrl) return imageUrl;
  }

  return "";
};

const normalizeListPayload = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item),
    );
  }
  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;
    const candidates = [
      objectPayload.results,
      objectPayload.items,
      objectPayload.posts,
      objectPayload.data,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object" && !Array.isArray(item),
        );
      }
    }
  }
  return [];
};

const mapApiPost = (
  entry: Record<string, unknown>,
  index: number,
): BlogPost => {
  const id = getNumber(entry.id, index + 1);
  const title = getLocalizedText(entry.title, "");
  const content = getLocalizedText(
    entry.content ?? entry.body ?? entry.description,
    "",
  );
  const coverImage = readCoverImage(entry) || "/images/BB.png";
  const publishedAt = getString(entry.published_at, "");
  const createdAt = getString(entry.created_at, "");

  return {
    id,
    title,
    content,
    cover_image: coverImage,
    cover_image_url: coverImage,
    published_at: publishedAt,
    created_at: createdAt,
  };
};

export const fetchBlogPosts = async (): Promise<BlogPost[] | undefined> => {
  if (!API_BASE_URL) return undefined;

  try {
    const url = new URL(BLOG_ENDPOINT, API_BASE_URL);
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      return undefined;
    }

    const payload = await response.json();
    const entries = normalizeListPayload(payload);
    return entries.map(mapApiPost);
  } catch {
    return undefined;
  }
};
