import type { Brand, BrandHeroCategory, BrandHeroCategoryLink } from "../types/brand";
import { toAbsoluteMediaUrl } from "./media";
import { toLocalizedText } from "./i18n";
import { STATIC_BRAND_NAME } from "./site-config";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type BrandApiResponse = Partial<Brand> & {
  logo_url?: string | null;
  hero_image_url?: string | null;
  mobile_hero_image_url?: string | null;
  about_us_image_1_url?: string | null;
  about_us_image_2_url?: string | null;
  newsletter_signup_popup_image_url?: string | null;
};

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readMediaUrl = (...values: unknown[]) => {
  for (const value of values) {
    const mediaUrl = toAbsoluteMediaUrl(value);
    if (mediaUrl) {
      return mediaUrl;
    }
  }

  return null;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const readStringList = (...values: unknown[]) => {
  const result = new Set<string>();

  const visit = (value: unknown) => {
    if (typeof value === "string") {
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((item) => result.add(item));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item));
      return;
    }

    if (isRecord(value)) {
      const slug = value.slug;
      if (typeof slug === "string" && slug.trim()) {
        result.add(slug.trim());
      }
    }
  };

  values.forEach((value) => visit(value));
  return [...result];
};

const readNumberList = (...values: unknown[]) => {
  const result = new Set<number>();

  const visit = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      result.add(value);
      return;
    }

    if (typeof value === "string") {
      value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((item) => Number.isFinite(item))
        .forEach((item) => result.add(item));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item));
      return;
    }

    if (isRecord(value)) {
      const id = value.id;
      if (typeof id === "number" && Number.isFinite(id)) {
        result.add(id);
      }
      if (typeof id === "string") {
        const parsed = Number(id.trim());
        if (Number.isFinite(parsed)) {
          result.add(parsed);
        }
      }
    }
  };

  values.forEach((value) => visit(value));
  return [...result];
};

const normalizeHeroCategoryLink = (value: unknown): BrandHeroCategoryLink | null => {
  if (!isRecord(value)) {
    return null;
  }

  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  if (!slug) {
    return null;
  }

  return {
    slug,
    name: toLocalizedText(value.name, slug),
  };
};

const normalizeHeroCategory = (value: unknown): BrandHeroCategory | null => {
  if (!isRecord(value)) {
    return null;
  }

  const normalized = normalizeHeroCategoryLink(value);
  if (!normalized) {
    return null;
  }

  const children = Array.isArray(value.children)
    ? value.children
        .map((entry) => normalizeHeroCategoryLink(entry))
        .filter((entry): entry is BrandHeroCategoryLink => entry !== null)
    : [];

  return {
    id: readNumber(value.id) ?? 0,
    slug: normalized.slug,
    name: normalized.name,
    parent: normalizeHeroCategoryLink(value.parent),
    children,
    is_active: value.is_active === true,
    created_at: typeof value.created_at === "string" ? value.created_at : "",
  };
};

const resolveHomeCollection = (data: BrandApiResponse) => {
  const nestedCollection = [
    data.home_collection,
    (data as RecordValue).new_collection,
    (data as RecordValue).collection,
  ].find(isRecord);

  const nestedRecord: RecordValue = nestedCollection ?? {};

  const heroImageUrl = readMediaUrl(
    nestedRecord.hero_image_url,
    nestedRecord.hero_image,
    (nestedRecord as RecordValue).image_url,
    (nestedRecord as RecordValue).image,
    (data as RecordValue).home_collection_hero_image_url,
    (data as RecordValue).home_collection_hero_image,
    (data as RecordValue).new_collection_hero_image_url,
    (data as RecordValue).new_collection_hero_image,
    (data as RecordValue).collection_hero_image_url,
    (data as RecordValue).collection_hero_image,
  );

  const productSlugs = readStringList(
    nestedRecord.product_slugs,
    (nestedRecord as RecordValue).products,
    (nestedRecord as RecordValue).items,
    (data as RecordValue).home_collection_product_slugs,
    (data as RecordValue).new_collection_product_slugs,
    (data as RecordValue).featured_product_slugs,
    (data as RecordValue).homepage_featured_product_slugs,
    (data as RecordValue).home_collection_products,
    (data as RecordValue).new_collection_products,
    (data as RecordValue).featured_products,
  );

  const productIds = readNumberList(
    nestedRecord.product_ids,
    (nestedRecord as RecordValue).products,
    (nestedRecord as RecordValue).items,
    (data as RecordValue).home_collection_product_ids,
    (data as RecordValue).new_collection_product_ids,
    (data as RecordValue).featured_product_ids,
    (data as RecordValue).homepage_featured_product_ids,
    (data as RecordValue).home_collection_products,
    (data as RecordValue).new_collection_products,
    (data as RecordValue).featured_products,
  );

  return {
    title: toLocalizedText(
      (data as RecordValue).hero_title ??
        nestedRecord.title ??
        (data as RecordValue).home_collection_title ??
        (data as RecordValue).new_collection_title ??
        (data as RecordValue).collection_title,
      "New Collection Is Here",
    ),
    view_more_label: toLocalizedText(
      nestedRecord.view_more_label ??
        (nestedRecord as RecordValue).cta_label ??
        (data as RecordValue).home_collection_view_more_label ??
        (data as RecordValue).new_collection_view_more_label ??
        (data as RecordValue).collection_view_more_label,
      "View More",
    ),
    view_all_products_label: toLocalizedText(
      nestedRecord.view_all_products_label ??
        (data as RecordValue).home_collection_view_all_products_label ??
        (data as RecordValue).new_collection_view_all_products_label ??
        (data as RecordValue).collection_view_all_products_label,
      "View All Products",
    ),
    hero_image: heroImageUrl,
    hero_image_url: heroImageUrl,
    product_slugs: productSlugs,
    product_ids: productIds,
  };
};

export const fetchBrand = async (): Promise<Brand | null> => {
  if (!API_BASE_URL) return null;

  try {
    const url = new URL("/api/brand/", API_BASE_URL);
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as BrandApiResponse;
    const logoUrl = readMediaUrl(data.logo_url, data.logo);
    const heroImageUrl = readMediaUrl(data.hero_image_url, data.hero_image);
    const mobileHeroImageUrl = readMediaUrl(
      data.mobile_hero_image_url,
      data.mobile_hero_image,
      heroImageUrl,
    );
    const aboutUsImage1Url = readMediaUrl(
      data.about_us_image_1_url,
      data.about_us_image_1,
    );
    const aboutUsImage2Url = readMediaUrl(
      data.about_us_image_2_url,
      data.about_us_image_2,
    );
    const newsletterSignupPopupImageUrl = readMediaUrl(
      data.newsletter_signup_popup_image_url,
      data.newsletter_signup_popup_image,
    );
    const homeCollection = resolveHomeCollection(data);
    const heroTitle = toLocalizedText(data.hero_title ?? homeCollection.title, "New Collection Is Here");

    return {
      ...(data as Brand),
      brand_name: toLocalizedText(data.brand_name, STATIC_BRAND_NAME.EN),
      hero_title: heroTitle,
      logo: logoUrl,
      hero_image: heroImageUrl,
      mobile_hero_image: mobileHeroImageUrl,
      about_us_image_1: aboutUsImage1Url,
      about_us_image_2: aboutUsImage2Url,
      newsletter_signup_popup_image: newsletterSignupPopupImageUrl,
      hero_category: normalizeHeroCategory((data as RecordValue).hero_category),
      logo_url: logoUrl,
      hero_image_url: heroImageUrl,
      mobile_hero_image_url: mobileHeroImageUrl,
      about_us_image_1_url: aboutUsImage1Url,
      about_us_image_2_url: aboutUsImage2Url,
      newsletter_signup_popup_image_url: newsletterSignupPopupImageUrl,
      home_collection: {
        ...homeCollection,
        title: heroTitle,
      },
    };
  } catch {
    return null;
  }
};
