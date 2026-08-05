export type Category = {
  slug: string;
  name: {
    KA: string;
    EN: string;
  };
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
    name: {
      KA: string;
      EN: string;
    };
  };
  name: {
    KA: string;
    EN: string;
  };
  images: ApiProductImage[];
  /** Quoted in `currency`, which follows the visitor's country. */
  min_price: number;
  currency?: string | null;
  created_at: string;
};

export type ApiHomeSection = {
  id: number;
  title: {
    KA: string;
    EN: string;
  };
  category: {
    slug: string;
    name: {
      KA: string;
      EN: string;
    };
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
    name: {
      KA: string;
      EN: string;
    };
  };
  brand?:
    | string
    | {
        name?:
          | string
          | {
              KA?: string;
              EN?: string;
            };
      }
    | null;
  sku?: string | null;
  currency?: string | null;
  name: {
    KA: string;
    EN: string;
  };
  description?:
    | {
        KA: string;
        EN: string;
      }
    | string
    | null;
  images?: ApiProductImage[];
  min_price?: number | string | null;
  max_price?: number | string | null;
  price?: number | string | null;
  care?:
    | {
        KA: string;
        EN: string;
      }
    | string
    | null;
  material?:
    | {
        KA: string;
        EN: string;
      }
    | string
    | null;
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
