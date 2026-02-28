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
  min_price: number;
  created_at: string;
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
    price: number | string;
    stock_qty: number;
    allow_order?: boolean;
  }>;
  created_at?: string;
};
