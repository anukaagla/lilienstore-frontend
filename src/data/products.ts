export type Product = {
  id: string;
  slug?: string;
  name: string;
  nameLocalized?: {
    KA: string;
    EN: string;
  };
  categorySlug?: string;
  categoryNameLocalized?: {
    KA: string;
    EN: string;
  };
  brandName?: string;
  sku?: string;
  currency?: string;
  price: number;
  primaryImage: string;
  secondaryImage: string;
  createdAt: string;
  detailImages: string[];
  description: string;
  descriptionLocalized?: {
    KA: string;
    EN: string;
  };
  care?: string;
  careLocalized?: {
    KA: string;
    EN: string;
  };
  material?: string;
  materialLocalized?: {
    KA: string;
    EN: string;
  };
  variants?: ProductVariant[];
};

export type ProductVariant = {
  id: number;
  size: string;
  color: string;
  hexColor: string;
  price: number;
  stockQty: number;
  allowOrder: boolean;
};
