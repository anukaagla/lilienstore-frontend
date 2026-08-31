import type { CurrencyCode } from "../lib/currency";

export type Product = {
  id: string;
  slug?: string;
  name: string;
  categorySlug?: string;
  categoryName?: string;
  brandName?: string;
  sku?: string;
  currency: CurrencyCode;
  price: number;
  primaryImage: string;
  secondaryImage: string;
  createdAt: string;
  detailImages: string[];
  description: string;
  care?: string;
  material?: string;
  variants?: ProductVariant[];
};

export type ProductVariant = {
  id: number;
  size: string;
  color: string;
  hexColor: string;
  price: number;
  currency: CurrencyCode;
  stockQty: number;
  allowOrder: boolean;
};
