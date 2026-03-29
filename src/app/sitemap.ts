import type { MetadataRoute } from "next";

import {
  fetchCatalogCategories,
  fetchCatalogProducts,
  flattenCategories,
} from "../lib/catalog-api";
import { toCanonicalUrl } from "../lib/seo";

const staticEntries = [
  {
    path: "/",
    changeFrequency: "daily" as const,
    priority: 1,
  },
  {
    path: "/market",
    changeFrequency: "daily" as const,
    priority: 0.9,
  },
  {
    path: "/aboutus",
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },
  {
    path: "/contactus",
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },
  {
    path: "/policies/privacy-policy",
    changeFrequency: "yearly" as const,
    priority: 0.3,
  },
  {
    path: "/policies/terms-of-service",
    changeFrequency: "yearly" as const,
    priority: 0.3,
  },
  {
    path: "/policies/return-and-refund-policy",
    changeFrequency: "yearly" as const,
    priority: 0.3,
  },
  {
    path: "/policies/shipping-and-delivery-policy",
    changeFrequency: "yearly" as const,
    priority: 0.3,
  },
];

const toValidDate = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const baseEntries: MetadataRoute.Sitemap = staticEntries.map((entry) => ({
    url: toCanonicalUrl(entry.path),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  const [categories, products] = await Promise.all([
    fetchCatalogCategories(),
    fetchCatalogProducts(),
  ]);

  const categoryEntries: MetadataRoute.Sitemap = [];
  const seenCategorySlugs = new Set<string>();

  (categories ? flattenCategories(categories) : []).forEach((category) => {
    const slug = category.slug.trim();
    if (!slug || seenCategorySlugs.has(slug)) {
      return;
    }

    seenCategorySlugs.add(slug);
    categoryEntries.push({
      url: toCanonicalUrl("/market", { category: slug }),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  const productEntries: MetadataRoute.Sitemap = [];
  const seenProductSlugs = new Set<string>();

  (products ?? []).forEach((product) => {
    const slug = product.slug.trim();
    if (!slug || seenProductSlugs.has(slug)) {
      return;
    }

    seenProductSlugs.add(slug);
    productEntries.push({
      url: toCanonicalUrl(`/market/${slug}`),
      lastModified: toValidDate(product.created_at) ?? now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  const merged = [...baseEntries, ...categoryEntries, ...productEntries];
  const uniqueByUrl = new Map<string, MetadataRoute.Sitemap[number]>();

  merged.forEach((entry) => {
    uniqueByUrl.set(entry.url, entry);
  });

  return Array.from(uniqueByUrl.values());
}
