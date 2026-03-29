import { cache } from "react";

import type { Product } from "../data/products";
import { toLocalizedText } from "./i18n";
import { toAbsoluteMediaUrl } from "./media";
import type { ApiProductDetail, ApiProductListItem, Category } from "../types/catalog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "";

type CategoryApiRecord = {
  slug?: unknown;
  name?: unknown;
  children?: unknown;
};

type LocalizedText = {
  KA?: unknown;
  EN?: unknown;
};

export type CatalogProductQuery = {
  category?: string;
  q?: string;
  sort?: string;
};

export const hasCatalogApiBaseUrl = Boolean(API_BASE_URL);

export const normalizeSearchParamValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const normalizeSortParam = (value?: string) => {
  if (!value) return undefined;
  if (value === "price-asc") return "price_asc";
  if (value === "price-desc") return "price_desc";
  return value;
};

const fetchJson = async <T,>(url: string): Promise<T | undefined> => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return undefined;
    }
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const getImageUrl = (value: { image?: unknown; image_url?: unknown }) => {
  return toAbsoluteMediaUrl(value.image_url ?? value.image) || undefined;
};

const normalizeCategoryName = (
  name: unknown,
  fallback: string,
): Category["name"] => {
  if (name && typeof name === "object") {
    const localized = name as LocalizedText;
    const ka =
      typeof localized.KA === "string" && localized.KA.trim()
        ? localized.KA
        : fallback;
    const en =
      typeof localized.EN === "string" && localized.EN.trim()
        ? localized.EN
        : ka || fallback;
    return {
      KA: ka || en || fallback,
      EN: en || ka || fallback,
    };
  }
  if (typeof name === "string" && name.trim()) {
    return { KA: name, EN: name };
  }
  return { KA: fallback, EN: fallback };
};

const mapCategory = (entry: unknown): Category | null => {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as CategoryApiRecord;
  if (typeof record.slug !== "string" || !record.slug.trim()) {
    return null;
  }

  const fallbackName = record.slug.trim();
  const mapped: Category = {
    slug: record.slug.trim(),
    name: normalizeCategoryName(record.name, fallbackName),
  };

  if (Array.isArray(record.children)) {
    const children = record.children
      .map(mapCategory)
      .filter((item): item is Category => item !== null);
    mapped.children = children;
  }

  return mapped;
};

export const normalizeCategories = (payload: unknown): Category[] => {
  const candidates: unknown[] = [
    payload,
    (payload as { results?: unknown })?.results,
    (payload as { items?: unknown })?.items,
    (payload as { categories?: unknown })?.categories,
    (payload as { data?: unknown })?.data,
  ];

  const sourceCandidate = candidates.find(
    (value): value is unknown[] => Array.isArray(value) && value.length > 0,
  );
  const source: unknown[] =
    sourceCandidate ?? (Array.isArray(payload) ? payload : []);

  return source
    .map(mapCategory)
    .filter((item): item is Category => item !== null);
};

const fetchCatalogCategoriesCached = cache(async (): Promise<
  Category[] | undefined
> => {
  if (!API_BASE_URL) {
    return undefined;
  }

  const categoriesUrl = new URL("/api/categories/", API_BASE_URL);
  const payload = await fetchJson<unknown>(categoriesUrl.toString());
  if (!payload) {
    return undefined;
  }

  return normalizeCategories(payload);
});

export const fetchCatalogCategories = async () => {
  return fetchCatalogCategoriesCached();
};

const fetchCatalogProductsCached = cache(
  async (
    category: string,
    query: string,
    sort: string,
  ): Promise<ApiProductListItem[] | undefined> => {
    if (!API_BASE_URL) {
      return undefined;
    }

    const productsUrl = new URL("/api/products/", API_BASE_URL);
    if (category) productsUrl.searchParams.set("category", category);
    if (query) productsUrl.searchParams.set("q", query);
    if (sort) productsUrl.searchParams.set("sort", sort);

    return fetchJson<ApiProductListItem[]>(productsUrl.toString());
  },
);

export const fetchCatalogProducts = async (
  options: CatalogProductQuery = {},
): Promise<ApiProductListItem[] | undefined> => {
  const category = options.category?.trim() ?? "";
  const query = options.q?.trim() ?? "";
  const sort = normalizeSortParam(options.sort?.trim()) ?? "";

  return fetchCatalogProductsCached(category, query, sort);
};

const fetchCatalogProductDetailCached = cache(async (slug: string) => {
  if (!API_BASE_URL) {
    return null;
  }

  try {
    const productUrl = new URL(
      `/api/products/${encodeURIComponent(slug)}/`,
      API_BASE_URL,
    );
    const response = await fetch(productUrl.toString(), { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ApiProductDetail;
  } catch {
    return null;
  }
});

export const fetchCatalogProductDetail = async (slug: string) => {
  return fetchCatalogProductDetailCached(slug);
};

const resolveBrandName = (brandValue: ApiProductDetail["brand"]): string | undefined => {
  if (!brandValue) {
    return undefined;
  }

  if (typeof brandValue === "string" && brandValue.trim()) {
    return brandValue.trim();
  }

  if (typeof brandValue === "object") {
    const name = (brandValue as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }

    if (name && typeof name === "object") {
      const localized = name as LocalizedText;
      if (typeof localized.EN === "string" && localized.EN.trim()) {
        return localized.EN.trim();
      }
      if (typeof localized.KA === "string" && localized.KA.trim()) {
        return localized.KA.trim();
      }
    }
  }

  return undefined;
};

export const mapApiProductDetailToProduct = (item: ApiProductDetail): Product => {
  const sortedImages = [...(item.images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const imageList = sortedImages
    .map((image) => getImageUrl(image))
    .filter((image): image is string => typeof image === "string" && !!image);
  const primaryImageRecord = sortedImages.find((image) => image.is_primary);
  const primaryImage =
    (primaryImageRecord ? getImageUrl(primaryImageRecord) : undefined) ??
    imageList[0] ??
    "/images/dress.png";
  const secondaryImage =
    imageList.find((image) => image !== primaryImage) ?? primaryImage;
  const detailImages = imageList.length ? imageList : [primaryImage];
  const price =
    toNumber(item.min_price) ??
    toNumber(item.price) ??
    toNumber(item.max_price) ??
    0;
  const nameLocalized = toLocalizedText(item.name, item.slug);
  const descriptionLocalized = toLocalizedText(item.description, "");
  const careLocalized = toLocalizedText(item.care, "");
  const materialLocalized = toLocalizedText(item.material, "");
  const variants = (item.variants ?? [])
    .map((variant) => ({
      id: variant.id,
      size: typeof variant.size === "string" ? variant.size.trim() : "",
      color: typeof variant.color === "string" ? variant.color.trim() : "",
      hexColor:
        typeof variant.hex_color === "string" && variant.hex_color.trim()
          ? variant.hex_color
          : "#000000",
      price: toNumber(variant.price) ?? price,
      stockQty:
        typeof variant.stock_qty === "number" && Number.isFinite(variant.stock_qty)
          ? Math.max(0, Math.floor(variant.stock_qty))
          : 0,
      allowOrder: variant.allow_order === true,
    }))
    .filter((variant) => variant.size);

  const categorySlug =
    typeof item.category?.slug === "string" && item.category.slug.trim()
      ? item.category.slug.trim()
      : undefined;
  const categoryNameLocalized = item.category?.name
    ? normalizeCategoryName(item.category.name, categorySlug ?? "")
    : undefined;
  const sku = typeof item.sku === "string" && item.sku.trim() ? item.sku.trim() : undefined;
  const currency =
    typeof item.currency === "string" && item.currency.trim()
      ? item.currency.trim().toUpperCase()
      : "GEL";

  return {
    id: String(item.id),
    slug: item.slug,
    name: nameLocalized.EN,
    nameLocalized,
    categorySlug,
    categoryNameLocalized,
    brandName: resolveBrandName(item.brand),
    sku,
    currency,
    price,
    primaryImage,
    secondaryImage,
    createdAt: item.created_at ?? new Date().toISOString(),
    detailImages,
    description: descriptionLocalized.EN,
    descriptionLocalized,
    care: careLocalized.EN,
    careLocalized,
    material: materialLocalized.EN,
    materialLocalized,
    variants,
  };
};

export const flattenCategories = (categories: Category[]): Category[] => {
  const flattened: Category[] = [];

  const walk = (nodes: Category[]) => {
    nodes.forEach((node) => {
      flattened.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    });
  };

  walk(categories);
  return flattened;
};

export const getCategoryNameBySlug = (categories: Category[], slug: string) => {
  const normalizedSlug = slug.trim();
  const match = flattenCategories(categories).find(
    (category) => category.slug === normalizedSlug,
  );

  return match?.name;
};

export const getListItemPrimaryImage = (item: ApiProductListItem) => {
  const sortedImages = [...(item.images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const primaryImageRecord = sortedImages.find((image) => image.is_primary);
  return (
    toAbsoluteMediaUrl(primaryImageRecord?.image_url ?? primaryImageRecord?.image) ||
    toAbsoluteMediaUrl(sortedImages[0]?.image_url ?? sortedImages[0]?.image) ||
    null
  );
};

export const humanizeSlug = (value: string) => {
  const normalized = value.trim().replace(/[-_]+/g, " ");
  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
