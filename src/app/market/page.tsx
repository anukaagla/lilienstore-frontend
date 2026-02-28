import { Suspense } from "react";

import Market from "../../components/market";
import { MarketPageSkeleton } from "../../components/page-skeletons";
import type { ApiProductListItem, Category } from "../../types/catalog";

type MarketPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const normalizeParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const normalizeSort = (value?: string) => {
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

type CategoryApiRecord = {
  slug?: unknown;
  name?: unknown;
  children?: unknown;
};

const normalizeCategoryName = (
  name: unknown,
  fallback: string
): Category["name"] => {
  if (name && typeof name === "object") {
    const localized = name as { KA?: unknown; EN?: unknown };
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

const normalizeCategories = (payload: unknown): Category[] => {
  const candidates: unknown[] = [
    payload,
    (payload as { results?: unknown })?.results,
    (payload as { items?: unknown })?.items,
    (payload as { categories?: unknown })?.categories,
    (payload as { data?: unknown })?.data,
  ];

  const sourceCandidate = candidates.find(
    (value): value is unknown[] => Array.isArray(value) && value.length > 0
  );
  const source: unknown[] = sourceCandidate ?? (Array.isArray(payload) ? payload : []);

  return source
    .map(mapCategory)
    .filter((item): item is Category => item !== null);
};

export default async function MarketPage({ searchParams }: MarketPageProps) {
  let products: ApiProductListItem[] | undefined;
  let categories: Category[] | undefined;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (API_BASE_URL) {
    const category = normalizeParam(resolvedSearchParams?.category);
    const query = normalizeParam(resolvedSearchParams?.q);
    const sort = normalizeSort(normalizeParam(resolvedSearchParams?.sort));

    const productsUrl = new URL("/api/products/", API_BASE_URL);
    if (category) productsUrl.searchParams.set("category", category);
    if (query) productsUrl.searchParams.set("q", query);
    if (sort) productsUrl.searchParams.set("sort", sort);

    const categoriesUrl = new URL("/api/categories/", API_BASE_URL);

    const [productsResponse, categoriesResponse] = await Promise.all([
      fetchJson<ApiProductListItem[]>(productsUrl.toString()),
      fetchJson<unknown>(categoriesUrl.toString()),
    ]);

    products = productsResponse;
    categories = normalizeCategories(categoriesResponse);
  }

  return (
    <Suspense fallback={<MarketPageSkeleton />}>
      <Market products={products} categories={categories} />
    </Suspense>
  );
}
