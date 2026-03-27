type LocalizedText = {
  KA: string;
  EN: string;
};

export type Brand = {
  brand_name: LocalizedText;
  description: LocalizedText;
  address: LocalizedText;
  working_hours: LocalizedText;
  phone_number: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  privacy_policy: LocalizedText;
  terms_of_service: LocalizedText;
  return_and_refund_policy: LocalizedText;
  shipping_and_delivery_policy: LocalizedText;
  logo: string | null;
  hero_image: string | null;
  about_us_image_1: string | null;
  about_us_image_2: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  about_us_image_1_url: string | null;
  about_us_image_2_url: string | null;
  updated_at: string;
};
