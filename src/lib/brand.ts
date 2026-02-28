import type { Brand } from "../types/brand";
import { STATIC_BRAND_NAME } from "./site-config";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type BrandApiResponse = Partial<Brand> & {
  logo_url?: string | null;
  hero_image_url?: string | null;
};

const toAbsoluteUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!API_BASE_URL) return value;
  try {
    return new URL(value, API_BASE_URL).toString();
  } catch {
    return value;
  }
};

export const fetchBrand = async (): Promise<Brand | null> => {
  if (!API_BASE_URL) return null;

  try {
    const url = new URL("/api/brand/", API_BASE_URL);
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as BrandApiResponse;
    const logoUrl = toAbsoluteUrl(data.logo_url ?? data.logo);
    const heroImageUrl = toAbsoluteUrl(data.hero_image_url ?? data.hero_image);

    return {
      ...(data as Brand),
      brand_name: STATIC_BRAND_NAME,
      logo: logoUrl,
      hero_image: heroImageUrl,
      logo_url: logoUrl,
      hero_image_url: heroImageUrl,
    };
  } catch {
    return null;
  }
};
