import type { CartItem } from "./cart";
import { fetchWithAuthRetry } from "./auth";
import { writeCart } from "./cart";
import { LANGUAGE_STORAGE_KEY, getLocalizedText, normalizeLanguage } from "./i18n";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && Number.isFinite(value) && value > 0;

type ApiCartItem = {
  id: number;
  product: {
    id: number;
    slug: string;
    name: {
      KA: string;
      EN: string;
    };
    primary_image: string | null;
  };
  variant?: {
    id: number;
    size: string;
    color: string;
  } | null;
  quantity: number;
  added_at: string;
  unit_price: number;
  line_total: number;
};

type ApiCart = {
  id: number;
  status: string;
  items: ApiCartItem[];
  items_count: number;
  subtotal: number;
  shipping_price: number;
  estimated_total: number;
  created_at: string;
  updated_at: string;
};

export type CartSnapshot = {
  cart: ApiCart;
  items: CartItem[];
};

const getCurrentLanguage = () => {
  if (typeof window === "undefined") {
    return "EN" as const;
  }
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
};

const mapCartItems = (cart: ApiCart): CartItem[] =>
  cart.items.map((item) => ({
    id: String(item.id),
    productId: String(item.product.id),
    name: getLocalizedText(item.product.name, getCurrentLanguage(), item.product.slug),
    price: item.unit_price,
    size: item.variant?.size?.trim() || "One Size",
    quantity: item.quantity,
    image: item.product.primary_image || "/images/dress.png",
  }));

const requestCart = async (
  path: string,
  init?: RequestInit,
): Promise<CartSnapshot | null> => {
  if (!API_BASE_URL) return null;

  try {
    const url = new URL(path, API_BASE_URL);
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetchWithAuthRetry(url.toString(), {
      ...init,
      headers,
      cache: "no-store",
    });

    if (!response || !response.ok) {
      return null;
    }

    const data = (await response.json()) as ApiCart;
    const items = mapCartItems(data);
    writeCart(items);
    return { cart: data, items };
  } catch {
    return null;
  }
};

export const fetchCart = () => requestCart("/api/cart/");

export const addCartItem = (productId: number, variantId: number, quantity: number) => {
  if (
    !isPositiveInteger(productId) ||
    !isPositiveInteger(variantId) ||
    !isPositiveInteger(quantity)
  ) {
    return Promise.resolve(null);
  }

  return requestCart("/api/cart/items/", {
    method: "POST",
    body: JSON.stringify({
      product_id: productId,
      variant_id: variantId,
      quantity,
    }),
  });
};

export const updateCartItem = (itemId: number, quantity: number) => {
  if (!isPositiveInteger(itemId) || !isPositiveInteger(quantity)) {
    return Promise.resolve(null);
  }

  return requestCart(`/api/cart/items/${itemId}/`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
};

export const removeCartItem = (itemId: number) => {
  if (!isPositiveInteger(itemId)) {
    return Promise.resolve(null);
  }

  return requestCart(`/api/cart/items/${itemId}/`, {
    method: "DELETE",
  });
};

export const clearCart = () =>
  requestCart("/api/cart/clear/", {
    method: "POST",
  });
