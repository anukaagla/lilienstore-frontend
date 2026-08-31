// Text fields are plain strings. The backend is mid-migration from per-language
// objects, so mappers read them through `readText` (src/lib/localized.ts), which
// still accepts the old `{ EN, KA }` shape at runtime.
export type Category = {
  slug: string;
  name: string;
  children?: Category[];
};

export type ApiProductImage = {
  id: number;
  image: string;
  image_url?: string | null;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
};

export type ApiProductListItem = {
  id: number;
  slug: string;
  category: {
    slug: string;
    name: string;
  };
  name: string;
  images: ApiProductImage[];
  /** Quoted in `currency`, which follows the visitor's country. */
  min_price: number;
  currency?: string | null;
  created_at: string;
};

export type ApiHomeSection = {
  id: number;
  title: string;
  category: {
    slug: string;
    name: string;
  };
  /**
   * Same shape as /api/products/. May be empty when every product in the section
   * lacks a price in the visitor's currency — that is a normal response, not an error.
   */
  products: ApiProductListItem[];
  updated_at: string;
};

export type ApiProductDetail = {
  id: number;
  slug: string;
  category?: {
    slug: string;
    name: string;
  };
  brand?: string | { name?: string } | null;
  sku?: string | null;
  currency?: string | null;
  name: string;
  description?: string | null;
  images?: ApiProductImage[];
  min_price?: number | string | null;
  max_price?: number | string | null;
  price?: number | string | null;
  care?: string | null;
  material?: string | null;
  variants?: Array<{
    id: number;
    size: string;
    color: string;
    hex_color: string;
    /** String, unlike the numeric min_price. `price_usd` is no longer returned. */
    price: number | string;
    currency?: string | null;
    stock_qty: number;
    allow_order?: boolean;
  }>;
  created_at?: string;
};
