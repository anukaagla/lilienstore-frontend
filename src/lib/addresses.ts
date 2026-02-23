export type Address = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address1: string;
  address2: string;
  postalCode: string;
  name: string;
};

const STORAGE_KEY = "lilien-addresses";
const EVENT_NAME = "lilien-addresses-updated";

const safeParse = (value: string | null): Address[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Address[]) : [];
  } catch {
    return [];
  }
};

export const readAddresses = (): Address[] => {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const writeAddresses = (items: Address[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
};

export const subscribeToAddresses = (handler: (items: Address[]) => void) => {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const custom = event as CustomEvent;
    const detail = custom.detail;
    if (Array.isArray(detail)) {
      handler(detail as Address[]);
    } else {
      handler(readAddresses());
    }
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
};

export const getAddressesStorageKey = () => STORAGE_KEY;
