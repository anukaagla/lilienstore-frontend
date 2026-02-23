export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image: string;
};

const STORAGE_KEY = "lilien-cart";
const EVENT_NAME = "lilien-cart-updated";

const safeParse = (value: string | null): CartItem[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
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

export const addToCart = (payload: {
  productId: string;
  name: string;
  price: number;
  size: string;
  image: string;
  quantity?: number;
}) => {
  const items = readCart();
  const index = items.findIndex(
    (item) => item.productId === payload.productId && item.size === payload.size,
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
      id: `${payload.productId}-${payload.size}`,
      productId: payload.productId,
      name: payload.name,
      price: payload.price,
      size: payload.size,
      quantity: quantityToAdd,
      image: payload.image,
    });
  }

  writeCart(items);
  return items;
};

export const getCartStorageKey = () => STORAGE_KEY;
