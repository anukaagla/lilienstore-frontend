import type { Brand } from "../types/brand";
import { toAbsoluteMediaUrl } from "./media";
import { STATIC_BRAND_NAME } from "./site-config";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type BrandApiResponse = Partial<Brand> & {
  logo_url?: string | null;
  hero_image_url?: string | null;
  about_us_image_1_url?: string | null;
  about_us_image_2_url?: string | null;
};

export const fetchBrand = async (): Promise<Brand | null> => {
  if (!API_BASE_URL) return null;

  try {
    const url = new URL("/api/brand/", API_BASE_URL);
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as BrandApiResponse;
    const logoUrl = toAbsoluteMediaUrl(data.logo_url ?? data.logo) || null;
    const heroImageUrl =
      toAbsoluteMediaUrl(data.hero_image_url ?? data.hero_image) || null;
    const aboutUsImage1Url =
      toAbsoluteMediaUrl(data.about_us_image_1_url ?? data.about_us_image_1) ||
      null;
    const aboutUsImage2Url =
      toAbsoluteMediaUrl(data.about_us_image_2_url ?? data.about_us_image_2) ||
      null;

    return {
      ...(data as Brand),
      brand_name: STATIC_BRAND_NAME,
      logo: logoUrl,
      hero_image: heroImageUrl,
      about_us_image_1: aboutUsImage1Url,
      about_us_image_2: aboutUsImage2Url,
      logo_url: logoUrl,
      hero_image_url: heroImageUrl,
      about_us_image_1_url: aboutUsImage1Url,
      about_us_image_2_url: aboutUsImage2Url,
    };
  } catch {
    return null;
  }
};
