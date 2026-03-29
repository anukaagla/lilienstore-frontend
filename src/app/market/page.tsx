import { Suspense } from "react";
import type { Metadata } from "next";

import Market from "../../components/market";
import { MarketPageSkeleton } from "../../components/page-skeletons";
import {
  fetchCatalogCategories,
  fetchCatalogProducts,
  getCategoryNameBySlug,
  getListItemPrimaryImage,
  humanizeSlug,
  normalizeSearchParamValue,
  normalizeSortParam,
} from "../../lib/catalog-api";
import {
  buildBreadcrumbListSchema,
  indexableRobots,
  jsonLdStringify,
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../lib/seo";

type MarketPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const MARKET_TITLE = "Shop Fashion";
const MARKET_DESCRIPTION = normalizeDescription(
  "Discover curated fashion collections, statement pieces, and limited looks at Lilienstore."
);

const resolveCategoryLabel = async (slug: string) => {
  const categories = await fetchCatalogCategories();
  const categoryName = categories?.length
    ? getCategoryNameBySlug(categories, slug)
    : undefined;

  return categoryName?.EN || humanizeSlug(slug) || "Collection";
};

const resolveMarketQueryState = (
  params: Record<string, string | string[] | undefined> | undefined,
) => {
  const category = normalizeSearchParamValue(params?.category)?.trim();
  const query = normalizeSearchParamValue(params?.q)?.trim();
  const sort = normalizeSortParam(normalizeSearchParamValue(params?.sort)?.trim());
  const searchMode = normalizeSearchParamValue(params?.search)?.trim();

  return {
    category: category || undefined,
    query: query || undefined,
    sort: sort || undefined,
    searchMode: searchMode || undefined,
  };
};

export async function generateMetadata({
  searchParams,
}: MarketPageProps): Promise<Metadata> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { category, query, sort, searchMode } =
    resolveMarketQueryState(resolvedSearchParams);
  const hasUnsupportedParams = Object.entries(resolvedSearchParams ?? {}).some(
    ([key, value]) => {
      const resolvedValue = normalizeSearchParamValue(value);
      if (!resolvedValue?.trim()) {
        return false;
      }
      return key !== "category" && key !== "q" && key !== "sort" && key !== "search";
    },
  );

  const canonicalUrl = toCanonicalUrl(
    "/market",
    category ? { category } : undefined,
  );
  const isIndexable = !query && !sort && !searchMode && !hasUnsupportedParams;

  let title = MARKET_TITLE;
  let description = MARKET_DESCRIPTION;

  if (category) {
    const categoryLabel = await resolveCategoryLabel(category);
    title = `${categoryLabel} Collection`;
    description = normalizeDescription(
      `Browse ${categoryLabel} pieces at Lilienstore, including curated silhouettes and new arrivals.`,
    );
  }

  if (query) {
    title = `Search Results for "${query}"`;
    description = normalizeDescription(
      `Search results for "${query}" in the Lilienstore catalog.`,
    );
  }

  const products = await fetchCatalogProducts({
    category,
    q: query,
    sort,
  });
  const listingImage = products?.[0] ? getListItemPrimaryImage(products[0]) : null;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: isIndexable ? indexableRobots : noindexRobots,
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      images: [
        {
          url: resolveOgImageUrl(listingImage),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [resolveOgImageUrl(listingImage)],
    },
  };
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { category, query, sort } = resolveMarketQueryState(resolvedSearchParams);

  const [products, categories] = await Promise.all([
    fetchCatalogProducts({
      category,
      q: query,
      sort,
    }),
    fetchCatalogCategories(),
  ]);

  const canonicalUrl = toCanonicalUrl(
    "/market",
    category ? { category } : undefined,
  );
  const categoryLabel = category
    ? (categories?.length ? getCategoryNameBySlug(categories, category)?.EN : undefined) ||
      humanizeSlug(category) ||
      "Collection"
    : undefined;

  const breadcrumbSchema = buildBreadcrumbListSchema(
    [
      { name: "Home", item: toCanonicalUrl("/") },
      { name: "Shop", item: toCanonicalUrl("/market") },
      ...(categoryLabel ? [{ name: categoryLabel, item: canonicalUrl }] : []),
    ],
  );

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: categoryLabel ? `${categoryLabel} Collection` : "Shop Fashion",
    description: categoryLabel
      ? normalizeDescription(
          `Browse ${categoryLabel} pieces at Lilienstore, including curated silhouettes and new arrivals.`,
        )
      : MARKET_DESCRIPTION,
    url: canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: (products ?? []).slice(0, 24).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: toCanonicalUrl(`/market/${product.slug}`),
        item: {
          "@type": "Product",
          name: product.name.EN,
          image: resolveOgImageUrl(getListItemPrimaryImage(product)),
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdStringify([breadcrumbSchema, collectionSchema]),
        }}
      />
      <Suspense fallback={<MarketPageSkeleton />}>
        <Market products={products} categories={categories} />
      </Suspense>
    </>
  );
}
