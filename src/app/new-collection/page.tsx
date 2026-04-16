import { Suspense } from "react";
import type { Metadata } from "next";

import Market from "../../components/market";
import { MarketPageSkeleton } from "../../components/page-skeletons";
import { fetchBrand } from "../../lib/brand";
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
  filterHomeCollectionProducts,
  getSelectedHomeCollectionProducts,
} from "../../lib/home-collection";
import {
  buildBreadcrumbListSchema,
  indexableRobots,
  jsonLdStringify,
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../lib/seo";

type NewCollectionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const COLLECTION_TITLE = "New Collection";
const COLLECTION_DESCRIPTION = normalizeDescription(
  "Explore the latest Lilienstore selection curated for the new collection."
);

const resolveCategoryLabel = async (slug: string) => {
  const categories = await fetchCatalogCategories();
  const categoryName = categories?.length
    ? getCategoryNameBySlug(categories, slug)
    : undefined;

  return categoryName?.EN || humanizeSlug(slug) || "Collection";
};

const resolveCollectionQueryState = (
  params: Record<string, string | string[] | undefined> | undefined
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
}: NewCollectionPageProps): Promise<Metadata> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { category, query, sort, searchMode } =
    resolveCollectionQueryState(resolvedSearchParams);
  const hasUnsupportedParams = Object.entries(resolvedSearchParams ?? {}).some(
    ([key, value]) => {
      const resolvedValue = normalizeSearchParamValue(value);
      if (!resolvedValue?.trim()) {
        return false;
      }

      return key !== "category" && key !== "q" && key !== "sort" && key !== "search";
    }
  );

  const canonicalUrl = toCanonicalUrl(
    "/new-collection",
    category ? { category } : undefined
  );
  const isIndexable = !query && !sort && !searchMode && !hasUnsupportedParams;

  let title = COLLECTION_TITLE;
  let description = COLLECTION_DESCRIPTION;

  if (category) {
    const categoryLabel = await resolveCategoryLabel(category);
    title = `${categoryLabel} | ${COLLECTION_TITLE}`;
    description = normalizeDescription(
      `Browse ${categoryLabel} pieces selected for the Lilienstore new collection.`
    );
  }

  if (query) {
    title = `Search Results for "${query}" | ${COLLECTION_TITLE}`;
    description = normalizeDescription(
      `Search results for "${query}" within the Lilienstore new collection.`
    );
  }

  const [brand, products] = await Promise.all([fetchBrand(), fetchCatalogProducts()]);
  const filteredProducts = filterHomeCollectionProducts(
    getSelectedHomeCollectionProducts(products ?? [], brand),
    {
      category,
      q: query,
    }
  );
  const listingImage = filteredProducts[0]
    ? getListItemPrimaryImage(filteredProducts[0])
    : null;

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

export default async function NewCollectionPage({
  searchParams,
}: NewCollectionPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { category, query } = resolveCollectionQueryState(resolvedSearchParams);

  const [brand, products, categories] = await Promise.all([
    fetchBrand(),
    fetchCatalogProducts(),
    fetchCatalogCategories(),
  ]);

  const selectedProducts = filterHomeCollectionProducts(
    getSelectedHomeCollectionProducts(products ?? [], brand),
    {
      category,
      q: query,
    }
  );

  const canonicalUrl = toCanonicalUrl(
    "/new-collection",
    category ? { category } : undefined
  );
  const categoryLabel = category
    ? (categories?.length ? getCategoryNameBySlug(categories, category)?.EN : undefined) ||
      humanizeSlug(category) ||
      "Collection"
    : undefined;

  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Home", item: toCanonicalUrl("/") },
    { name: COLLECTION_TITLE, item: toCanonicalUrl("/new-collection") },
    ...(categoryLabel ? [{ name: categoryLabel, item: canonicalUrl }] : []),
  ]);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: categoryLabel ? `${categoryLabel} ${COLLECTION_TITLE}` : COLLECTION_TITLE,
    description: categoryLabel
      ? normalizeDescription(
          `Browse ${categoryLabel} pieces selected for the Lilienstore new collection.`
        )
      : COLLECTION_DESCRIPTION,
    url: canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: selectedProducts.slice(0, 24).map((product, index) => ({
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
        <Market
          products={selectedProducts}
          categories={categories}
          basePath="/new-collection"
          pageLabel={{ EN: "New Collection", KA: "ახალი კოლექცია" }}
          emptyStateLabel={{
            EN: "No products have been selected for the new collection yet.",
            KA: "ახალი კოლექციისთვის პროდუქტები ჯერ არ არის მონიშნული.",
          }}
        />
      </Suspense>
    </>
  );
}
