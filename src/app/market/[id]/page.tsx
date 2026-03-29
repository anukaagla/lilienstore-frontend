import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductPageSkeleton } from "../../../components/page-skeletons";
import ProductDetail from "../../../components/product-detail";
import {
  fetchCatalogProductDetail,
  humanizeSlug,
  mapApiProductDetailToProduct,
} from "../../../lib/catalog-api";
import {
  buildBreadcrumbListSchema,
  indexableRobots,
  jsonLdStringify,
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../../lib/seo";

type MarketProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const buildOfferAvailability = (
  variants:
    | Array<{
        stockQty: number;
        allowOrder: boolean;
      }>
    | undefined,
) => {
  if (!variants?.length) {
    return "https://schema.org/InStock";
  }

  if (variants.some((variant) => variant.stockQty > 0)) {
    return "https://schema.org/InStock";
  }

  if (variants.some((variant) => variant.allowOrder)) {
    return "https://schema.org/PreOrder";
  }

  return "https://schema.org/OutOfStock";
};

export async function generateMetadata({
  params,
}: MarketProductPageProps): Promise<Metadata> {
  const { id: slug } = await params;
  const productDetail = await fetchCatalogProductDetail(slug);

  if (!productDetail) {
    return {
      title: "Product Not Found",
      description: normalizeDescription("The requested product could not be found."),
      alternates: {
        canonical: toCanonicalUrl(`/market/${slug}`),
      },
      robots: noindexRobots,
    };
  }

  const product = mapApiProductDetailToProduct(productDetail);
  const productName = product.nameLocalized?.EN || product.name;
  const canonicalUrl = toCanonicalUrl(`/market/${slug}`);
  const description = normalizeDescription(
    product.descriptionLocalized?.EN ||
      `${productName} by Lilienstore. Discover details, availability, and pricing.`,
  );

  return {
    title: productName,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: indexableRobots,
    openGraph: {
      type: "website",
      title: productName,
      description,
      url: canonicalUrl,
      images: [
        {
          url: resolveOgImageUrl(product.primaryImage),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: productName,
      description,
      images: [resolveOgImageUrl(product.primaryImage)],
    },
  };
}

export default async function MarketProductPage({
  params,
}: MarketProductPageProps) {
  const { id: slug } = await params;
  const productDetail = await fetchCatalogProductDetail(slug);

  if (!productDetail) {
    notFound();
  }

  const product = mapApiProductDetailToProduct(productDetail);
  const productName = product.nameLocalized?.EN || product.name;
  const canonicalUrl = toCanonicalUrl(`/market/${slug}`);
  const categoryLabel =
    product.categoryNameLocalized?.EN ||
    (product.categorySlug ? humanizeSlug(product.categorySlug) : "");

  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Home", item: toCanonicalUrl("/") },
    { name: "Shop", item: toCanonicalUrl("/market") },
    ...(categoryLabel && product.categorySlug
      ? [
          {
            name: categoryLabel,
            item: toCanonicalUrl("/market", { category: product.categorySlug }),
          },
        ]
      : []),
    { name: productName, item: canonicalUrl },
  ]);

  const uniqueImages = Array.from(
    new Set([
      ...product.detailImages.map((image) => resolveOgImageUrl(image)),
      resolveOgImageUrl(product.primaryImage),
    ]),
  ).filter(Boolean);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description: normalizeDescription(
      product.descriptionLocalized?.EN || product.description || productName,
      productName,
    ),
    image: uniqueImages,
    ...(product.sku ? { sku: product.sku } : {}),
    // TODO: Add GTIN/MPN once backend product identifiers are available.
    brand: {
      "@type": "Brand",
      name: product.brandName || "Lilienstore",
    },
    category: categoryLabel || undefined,
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: product.currency || "GEL",
      price: Number(product.price).toFixed(2),
      availability: buildOfferAvailability(product.variants),
      itemCondition: "https://schema.org/NewCondition",
      // TODO: Add shippingDetails and hasMerchantReturnPolicy when backend policy payload is available.
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdStringify([breadcrumbSchema, productSchema]),
        }}
      />
      <Suspense fallback={<ProductPageSkeleton />}>
        <ProductDetail product={product} />
      </Suspense>
    </>
  );
}
