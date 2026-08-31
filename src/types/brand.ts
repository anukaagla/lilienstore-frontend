export type BrandHeroCategoryLink = {
  slug: string;
  name: string;
};

export type BrandHeroCategory = BrandHeroCategoryLink & {
  id: number;
  parent: BrandHeroCategoryLink | null;
  children: BrandHeroCategoryLink[];
  is_active: boolean;
  created_at: string;
};

export type HomeCollectionConfig = {
  title: string;
  view_more_label: string;
  view_all_products_label: string;
  hero_image: string | null;
  hero_image_url: string | null;
  product_slugs: string[];
  product_ids: number[];
};

export type Brand = {
  brand_name: string;
  hero_title: string;
  description: string;
  address: string;
  working_hours: string;
  phone_number: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  privacy_policy: string;
  terms_of_service: string;
  return_and_refund_policy: string;
  shipping_and_delivery_policy: string;
  logo: string | null;
  /** Alternate logo for dark/imagery backgrounds. Null when nothing was uploaded. */
  contrast_logo: string | null;
  hero_image: string | null;
  mobile_hero_image: string | null;
  about_us_image_1: string | null;
  about_us_image_2: string | null;
  newsletter_signup_popup_image: string | null;
  hero_category: BrandHeroCategory | null;
  logo_url: string | null;
  contrast_logo_url: string | null;
  hero_image_url: string | null;
  mobile_hero_image_url: string | null;
  about_us_image_1_url: string | null;
  about_us_image_2_url: string | null;
  newsletter_signup_popup_image_url: string | null;
  home_collection?: HomeCollectionConfig;
  updated_at: string;
};
