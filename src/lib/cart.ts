import { DEFAULT_CURRENCY, normalizeCurrency, type CurrencyCode } from "./currency";

export type CartItem = {
  id: string;
  productId: string;
  /** Backend variant id — the checkout error reports unavailability by variant. */
  variantId?: number;
  name: string;
  price: number;
  /**
   * Stored alongside the price because the cart lives in localStorage: a visitor who
   * changes country (or switches on a VPN) would otherwise keep stale amounts from
   * the previous currency.
   */
  currency: CurrencyCode;
  size: string;
  color?: string;
  colorHex?: string;
  quantity: number;
  image: string;
};

const STORAGE_KEY = "lilien-cart";
const EVENT_NAME = "lilien-cart-updated";

const safeParse = (value: string | null): CartItem[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    // Carts persisted before currency existed have no `currency` field.
    return (parsed as CartItem[]).map((item) => ({
      ...item,
      currency: normalizeCurrency(item?.currency),
    }));
  } catch {
    return [];
  }
};

export const readCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const writeCart = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
};

export const subscribeToCart = (handler: (items: CartItem[]) => void) => {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const custom = event as CustomEvent;
    const detail = custom.detail;
    if (Array.isArray(detail)) {
      handler(detail as CartItem[]);
    } else {
      handler(readCart());
    }
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
};

const getVariantKey = (item: { color?: string; colorHex?: string }) =>
  (item.colorHex?.trim() || item.color?.trim() || "").toLowerCase();

const buildCartItemId = (payload: {
  productId: string;
  size: string;
  color?: string;
  colorHex?: string;
}) => {
  const variantKey = getVariantKey(payload);
  return variantKey
    ? `${payload.productId}-${payload.size}-${variantKey}`
    : `${payload.productId}-${payload.size}`;
};

export const addToCart = (payload: {
  productId: string;
  variantId?: number;
  name: string;
  price: number;
  currency?: CurrencyCode;
  size: string;
  color?: string;
  colorHex?: string;
  image: string;
  quantity?: number;
}) => {
  const items = readCart();
  const index = items.findIndex(
    (item) =>
      item.productId === payload.productId &&
      item.size === payload.size &&
      getVariantKey(item) === getVariantKey(payload),
  );
  const quantityToAdd = payload.quantity ?? 1;

  if (index >= 0) {
    const current = items[index];
    items[index] = {
      ...current,
      quantity: current.quantity + quantityToAdd,
    };
  } else {
    items.push({
      id: buildCartItemId(payload),
      productId: payload.productId,
      variantId: payload.variantId,
      name: payload.name,
      price: payload.price,
      currency: payload.currency ?? DEFAULT_CURRENCY,
      size: payload.size,
      color: payload.color?.trim() || undefined,
      colorHex: payload.colorHex?.trim() || undefined,
      quantity: quantityToAdd,
      image: payload.image,
    });
  }

  writeCart(items);
  return items;
};

export const getCartStorageKey = () => STORAGE_KEY;
