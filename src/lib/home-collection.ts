import type { Brand } from "../types/brand";
import type { ApiProductListItem } from "../types/catalog";

type CollectionQuery = {
  category?: string;
  q?: string;
};

const normalizeValue = (value: string) => value.trim().toLowerCase();

const matchesCollectionSearch = (product: ApiProductListItem, query: string) => {
  const normalizedQuery = normalizeValue(query);
  if (!normalizedQuery) {
    return true;
  }

  const candidates = [
    product.slug,
    product.name.EN,
    product.name.KA,
    product.category?.slug,
    product.category?.name?.EN,
    product.category?.name?.KA,
  ];

  return candidates.some(
    (candidate) =>
      typeof candidate === "string" &&
      normalizeValue(candidate).includes(normalizedQuery),
  );
};

export const getHomeCollectionHeroImage = (brand?: Brand | null) =>
  brand?.home_collection?.hero_image_url?.trim() ||
  brand?.home_collection?.hero_image?.trim() ||
  brand?.hero_image_url?.trim() ||
  brand?.hero_image?.trim() ||
  "/images/hola.png";

export const getSelectedHomeCollectionProducts = (
  products: ApiProductListItem[],
  brand?: Brand | null,
  fallbackLimit = 12,
) => {
  const configuredSlugs = (brand?.home_collection?.product_slugs ?? [])
    .map((slug) => slug.trim())
    .filter(Boolean);
  const configuredIds = brand?.home_collection?.product_ids ?? [];

  if (!configuredSlugs.length && !configuredIds.length) {
    return [...products]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, fallbackLimit);
  }

  const slugOrder = new Map(configuredSlugs.map((slug, index) => [slug, index]));
  const idSet = new Set(configuredIds);

  return products
    .filter(
      (product) => slugOrder.has(product.slug) || idSet.has(product.id),
    )
    .sort((left, right) => {
      const leftSlugIndex = slugOrder.get(left.slug);
      const rightSlugIndex = slugOrder.get(right.slug);

      if (leftSlugIndex !== undefined || rightSlugIndex !== undefined) {
        return (leftSlugIndex ?? Number.MAX_SAFE_INTEGER) -
          (rightSlugIndex ?? Number.MAX_SAFE_INTEGER);
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
};

export const filterHomeCollectionProducts = (
  products: ApiProductListItem[],
  query: CollectionQuery = {},
) => {
  const normalizedCategory = query.category?.trim() ?? "";
  const normalizedQuery = query.q?.trim() ?? "";

  return products.filter((product) => {
    if (
      normalizedCategory &&
      product.category?.slug?.trim() !== normalizedCategory
    ) {
      return false;
    }

    if (normalizedQuery && !matchesCollectionSearch(product, normalizedQuery)) {
      return false;
    }

    return true;
  });
};
