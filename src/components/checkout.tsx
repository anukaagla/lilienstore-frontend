"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ChangeEvent, FormEvent } from "react";
import type { CartItem } from "../lib/cart";
import { readCart, subscribeToCart } from "../lib/cart";
import type { Address } from "../lib/addresses";
import {
  getAddressesStorageKey,
  readAddresses,
  subscribeToAddresses,
  writeAddresses,
} from "../lib/addresses";
import { fetchWithAuthRetry } from "../lib/auth";
import { byLanguage } from "../lib/i18n";
import { writeOrderConfirmation } from "../lib/order-confirmation";
import Footer from "./footer";
import { useLanguage } from "./language-provider";
import { CheckoutPageSkeleton } from "./page-skeletons";
import SiteHeader from "./site-header";

type CheckoutFormState = {
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

type AddressApiPayload = {
  address_name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type CheckoutApiAddress = {
  id?: unknown;
  address_name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  phone_number?: unknown;
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postal_code?: unknown;
  country?: unknown;
};

type ShippingSettings = {
  isActive: boolean;
  tbilisiPrice: number;
  georgiaOtherPrice: number;
  internationalPrice: number;
};

const emptyForm: CheckoutFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  country: "",
  state: "",
  city: "",
  address1: "",
  address2: "",
  postalCode: "",
  name: "",
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const LEGACY_DELIVERY_FEE = 5;
const GEORGIA_COUNTRY_NAMES = new Set(["georgia", "ge", "sakartvelo", "საქართველო"]);
const TBILISI_LOCATION_NAMES = ["tbilisi", "თბილისი"];

const formatPrice = (value: number) => `${value.toFixed(2)} GEL`;
const normalizeString = (value: unknown) =>
  typeof value === "string" ? value : "";
const normalizeTrimmedString = (value: string) => value.trim();
const normalizeLocationValue = (value: string) =>
  value.trim().toLocaleLowerCase();

const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) {
    return null;
  }

  try {
    return new URL(path, API_BASE_URL).toString();
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getCheckoutPayloadCandidates = (payload: unknown) => {
  if (!isRecord(payload)) {
    return [];
  }

  const dataRecord = isRecord(payload.data) ? payload.data : null;

  return [
    payload,
    isRecord(payload.order) ? payload.order : null,
    dataRecord,
    dataRecord && isRecord(dataRecord.order) ? dataRecord.order : null,
    isRecord(payload.result) ? payload.result : null,
  ].filter((candidate): candidate is Record<string, unknown> => candidate !== null);
};

const pickPayloadText = (payload: unknown, keys: string[]) => {
  const candidates = getCheckoutPayloadCandidates(payload);

  for (const record of candidates) {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }
    }
  }

  return "";
};

const pickPayloadNumber = (payload: unknown, keys: string[]) => {
  const candidates = getCheckoutPayloadCandidates(payload);

  for (const record of candidates) {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value.replace(/[^0-9.-]/g, ""));
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
  }

  return null;
};

const parsePriceValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const formatDeliveryAddress = (address: Address) =>
  [
    address.address1,
    address.address2,
    address.city,
    address.state,
    address.country,
    address.postalCode,
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(", ");

const getApiMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  const parts = Object.entries(payload as Record<string, unknown>)
    .map(([field, value]) => {
      if (typeof value === "string" && value.trim()) {
        return `${field}: ${value}`;
      }

      if (Array.isArray(value)) {
        const firstText = value.find(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
        );
        if (firstText) {
          return `${field}: ${firstText}`;
        }
      }

      return null;
    })
    .filter((value): value is string => Boolean(value));

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  return fallback;
};

const normalizeShippingSettingsResponse = (payload: unknown): ShippingSettings | null => {
  if (!isRecord(payload)) {
    return null;
  }

  return {
    isActive: Boolean(payload.is_active),
    tbilisiPrice: parsePriceValue(payload.tbilisi_price) ?? 0,
    georgiaOtherPrice: parsePriceValue(payload.georgia_other_price) ?? 0,
    internationalPrice: parsePriceValue(payload.international_price) ?? 0,
  };
};

const isGeorgiaAddress = (address: Address) => {
  const country = normalizeLocationValue(address.country);
  return GEORGIA_COUNTRY_NAMES.has(country);
};

const isTbilisiAddress = (address: Address) => {
  const city = normalizeLocationValue(address.city);
  const state = normalizeLocationValue(address.state);

  return TBILISI_LOCATION_NAMES.some(
    (name) =>
      city === name ||
      state === name ||
      city.includes(name) ||
      state.includes(name),
  );
};

const getShippingFeeForAddress = (
  address: Address,
  settings: ShippingSettings,
) => {
  if (!settings.isActive) {
    return 0;
  }

  if (!isGeorgiaAddress(address)) {
    return settings.internationalPrice;
  }

  if (isTbilisiAddress(address)) {
    return settings.tbilisiPrice;
  }

  return settings.georgiaOtherPrice;
};

const normalizeCheckoutAddressResponse = (
  payload: unknown,
): CheckoutApiAddress | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload as CheckoutApiAddress;
};

const normalizeCheckoutAddressesResponse = (payload: unknown): CheckoutApiAddress[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (entry): entry is CheckoutApiAddress =>
        Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
    );
  }

  if (!isRecord(payload)) {
    return [];
  }

  const directCollections = ["results", "addresses", "items", "data"];
  for (const key of directCollections) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (entry): entry is CheckoutApiAddress =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      );
    }
  }

  const dataRecord = isRecord(payload.data) ? payload.data : null;
  if (!dataRecord) {
    return [];
  }

  for (const key of ["results", "addresses", "items"]) {
    const candidate = dataRecord[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (entry): entry is CheckoutApiAddress =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      );
    }
  }

  return [];
};

const mapCheckoutAddressToSavedAddress = (
  address: CheckoutApiAddress,
  index: number,
): Address => {
  const apiId =
    typeof address.id === "number" || typeof address.id === "string"
      ? String(address.id).trim()
      : "";

  return {
    id: apiId || `local-fallback-${index + 1}`,
    name: normalizeString(address.address_name),
    firstName: normalizeString(address.first_name),
    lastName: normalizeString(address.last_name),
    phone: normalizeString(address.phone_number),
    country: normalizeString(address.country),
    state: normalizeString(address.state),
    city: normalizeString(address.city),
    address1: normalizeString(address.line1),
    address2: normalizeString(address.line2),
    postalCode: normalizeString(address.postal_code),
  };
};

const mapCheckoutFormToApiPayload = (form: CheckoutFormState): AddressApiPayload => ({
  address_name: normalizeTrimmedString(form.name),
  first_name: normalizeTrimmedString(form.firstName),
  last_name: normalizeTrimmedString(form.lastName),
  phone_number: normalizeTrimmedString(form.phone),
  line1: normalizeTrimmedString(form.address1),
  line2: normalizeTrimmedString(form.address2),
  city: normalizeTrimmedString(form.city),
  state: normalizeTrimmedString(form.state),
  postal_code: normalizeTrimmedString(form.postalCode),
  country: normalizeTrimmedString(form.country),
});

export default function Checkout() {
  const { language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [addressesReady, setAddressesReady] = useState(false);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(
    null,
  );
  const [shippingSettingsReady, setShippingSettingsReady] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [form, setForm] = useState<CheckoutFormState>(emptyForm);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const text = {
    addedAddresses: byLanguage({ EN: "Added Addresses", KA: "დამატებული მისამართები" }, language),
    home: byLanguage({ EN: "Home", KA: "სახლი" }, language),
    edit: byLanguage({ EN: "Edit", KA: "რედაქტირება" }, language),
    deliveryAddressDetails: byLanguage(
      { EN: "Delivery Address Details", KA: "მიწოდების მისამართი" },
      language
    ),
    firstName: byLanguage({ EN: "First Name", KA: "სახელი" }, language),
    firstNamePlaceholder: byLanguage({ EN: "e.g. Nino", KA: "მაგ. ნინო" }, language),
    lastName: byLanguage({ EN: "Last Name", KA: "გვარი" }, language),
    lastNamePlaceholder: byLanguage({ EN: "e.g. Beridze", KA: "მაგ. ბერიძე" }, language),
    phoneNumber: byLanguage({ EN: "Phone Number", KA: "ტელეფონის ნომერი" }, language),
    phonePlaceholder: byLanguage(
      { EN: "e.g. +995 555 12 34 56", KA: "მაგ. +995 555 12 34 56" },
      language
    ),
    country: byLanguage({ EN: "Country", KA: "ქვეყანა" }, language),
    countryPlaceholder: byLanguage({ EN: "e.g. Georgia", KA: "მაგ. საქართველო" }, language),
    state: byLanguage({ EN: "State", KA: "რეგიონი" }, language),
    statePlaceholder: byLanguage({ EN: "e.g. Tbilisi", KA: "მაგ. თბილისი" }, language),
    city: byLanguage({ EN: "City", KA: "ქალაქი" }, language),
    cityPlaceholder: byLanguage({ EN: "e.g. Tbilisi", KA: "მაგ. თბილისი" }, language),
    addressNo1: byLanguage({ EN: "Address No 1", KA: "მისამართი 1" }, language),
    addressNo1Placeholder: byLanguage(
      { EN: "e.g. 12 Rustaveli Ave", KA: "მაგ. რუსთაველის გამზირი 12" },
      language
    ),
    addressNo2: byLanguage({ EN: "Address No 2", KA: "მისამართი 2" }, language),
    addressNo2Placeholder: byLanguage(
      { EN: "e.g. Apt 8, Floor 3", KA: "მაგ. ბინა 8, სართული 3" },
      language
    ),
    postalCode: byLanguage({ EN: "Postal Code", KA: "საფოსტო ინდექსი" }, language),
    postalCodePlaceholder: byLanguage({ EN: "e.g. 0108", KA: "მაგ. 0108" }, language),
    name: byLanguage({ EN: "Name", KA: "სახელი" }, language),
    namePlaceholder: byLanguage({ EN: "e.g. Home", KA: "მაგ. სახლი" }, language),
    optional: byLanguage({ EN: "optional", KA: "არასავალდებულო" }, language),
    addAddress: byLanguage({ EN: "Add Address", KA: "მისამართის დამატება" }, language),
    addingAddress: byLanguage(
      { EN: "Adding Address...", KA: "მისამართი ემატება..." },
      language,
    ),
    orderSummary: byLanguage({ EN: "Order Summary", KA: "შეკვეთის შეჯამება" }, language),
    product: byLanguage({ EN: "Product", KA: "პროდუქტი" }, language),
    total: byLanguage({ EN: "Total", KA: "სულ" }, language),
    emptyBag: byLanguage(
      { EN: "Your shopping bag is empty", KA: "შენი კალათა ცარიელია" },
      language
    ),
    subtotal: byLanguage({ EN: "Subtotal", KA: "პროდუქციის ფასი" }, language),
    delivery: byLanguage({ EN: "Delivery", KA: "მიწოდება" }, language),
    placeOrder: byLanguage({ EN: "Place Order", KA: "შეკვეთის გაფორმება" }, language),
    placingOrder: byLanguage({ EN: "Placing Order...", KA: "შეკვეთის გაფორმება..." }, language),
    missingAccessToken: byLanguage(
      {
        EN: "Please log in before placing an order.",
        KA: "შეკვეთის გასაფორმებლად გაიარეთ ავტორიზაცია.",
      },
      language,
    ),
    missingApiBaseUrl: byLanguage(
      {
        EN: "API base URL is missing. Set NEXT_PUBLIC_API_BASE_URL.",
        KA: "API მისამართი არ არის კონფიგურირებული.",
      },
      language,
    ),
    addressRequired: byLanguage(
      {
        EN: "Select a valid saved address before placing an order.",
        KA: "შეკვეთის გასაფორმებლად აირჩიეთ შენახული მისამართი.",
      },
      language,
    ),
    placeOrderFailed: byLanguage(
      {
        EN: "We could not place your order. Please try again.",
        KA: "შეკვეთის გაფორმება ვერ მოხერხდა. სცადეთ ხელახლა.",
      },
      language,
    ),
    orderConfirmed: byLanguage(
      {
        EN: "Confirmed",
        KA: "დადასტურებულია",
      },
      language,
    ),
    paymentMethodFallback: byLanguage(
      {
        EN: "UniPay",
        KA: "UniPay",
      },
      language,
    ),
    estimatedDeliveryFallback: byLanguage(
      {
        EN: "Our team will contact you shortly with delivery timing.",
        KA: "ჩვენი გუნდი მალე დაგიკავშირდება მიწოდების დროის დასაზუსტებლად.",
      },
      language,
    ),
    customerFallback: byLanguage(
      {
        EN: "Customer",
        KA: "მომხმარებელი",
      },
      language,
    ),
    paymentNoticeLine1: byLanguage(
      {
        EN: "Payments are processed securely via UniPay.",
        KA: "Payments are processed securely via UniPay.",
      },
      language,
    ),
    paymentNoticeLine2: byLanguage(
      {
        EN: "You will be redirected to UniPay's secure payment page to complete the transaction.",
        KA: "You will be redirected to UniPay's secure payment page to complete the transaction.",
      },
      language,
    ),
    addressCreateFailed: byLanguage(
      {
        EN: "Failed to add address.",
        KA: "მისამართის დამატება ვერ მოხერხდა.",
      },
      language,
    ),
  };

  useEffect(() => {
    setItems(readCart());
    setCartReady(true);
    const unsubscribe = subscribeToCart((nextItems) => {
      setItems(nextItems);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setAddressError(null);
    setOrderError(null);
  }, [language]);

  useEffect(() => {
    let isActive = true;

    const applyAddresses = (
      next: Address[],
      options?: { forceShowForm?: boolean; forceHideForm?: boolean },
    ) => {
      if (!isActive) {
        return;
      }

      setSavedAddresses(next);
      setSelectedAddressId((prev) =>
        prev && next.some((address) => address.id === prev)
          ? prev
          : next[0]?.id ?? null,
      );

      if (options?.forceShowForm) {
        setShowAddressForm(true);
        return;
      }

      if (options?.forceHideForm) {
        setShowAddressForm(false);
        return;
      }

      setShowAddressForm((prev) => (next.length === 0 ? true : prev));
    };

    const loadStoredAddresses = (
      options?: { forceShowForm?: boolean; forceHideForm?: boolean },
    ) => {
      const next = readAddresses();
      applyAddresses(next, options);
      return next;
    };

    const restoreStoredAddresses = () => {
      const storedAddresses = readAddresses();
      applyAddresses(storedAddresses, {
        forceShowForm: storedAddresses.length === 0,
        forceHideForm: storedAddresses.length > 0,
      });
    };

    const loadAddresses = async () => {
      const listUrl = buildApiUrl("/api/auth/addresses/");

      if (!listUrl) {
        restoreStoredAddresses();
        if (isActive) {
          setAddressesReady(true);
        }
        return;
      }

      try {
        const response = await fetchWithAuthRetry(listUrl, {
          method: "GET",
          cache: "no-store",
        });

        if (!response) {
          restoreStoredAddresses();
          return;
        }

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          restoreStoredAddresses();
          return;
        }

        const nextAddresses = normalizeCheckoutAddressesResponse(payload).map(
          mapCheckoutAddressToSavedAddress,
        );
        writeAddresses(nextAddresses);
        applyAddresses(nextAddresses, {
          forceShowForm: nextAddresses.length === 0,
          forceHideForm: nextAddresses.length > 0,
        });
      } catch {
        restoreStoredAddresses();
      } finally {
        if (isActive) {
          setAddressesReady(true);
        }
      }
    };

    void loadAddresses();

    const unsubscribe = subscribeToAddresses((nextItems) => {
      applyAddresses(nextItems);
    });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getAddressesStorageKey()) {
        loadStoredAddresses();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      isActive = false;
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadShippingSettings = async () => {
      const settingsUrl = buildApiUrl("/api/shipping/settings/");

      if (!settingsUrl) {
        if (isActive) {
          setShippingSettingsReady(true);
        }
        return;
      }

      try {
        const response = await fetchWithAuthRetry(settingsUrl, {
          method: "GET",
          cache: "no-store",
        });

        if (!response) {
          return;
        }

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          return;
        }

        const nextSettings = normalizeShippingSettingsResponse(payload);
        if (nextSettings && isActive) {
          setShippingSettings(nextSettings);
        }
      } finally {
        if (isActive) {
          setShippingSettingsReady(true);
        }
      }
    };

    void loadShippingSettings();

    return () => {
      isActive = false;
    };
  }, []);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      ),
    [items],
  );
  const selectedAddress =
    savedAddresses.find((address) => address.id === selectedAddressId) ?? null;
  const deliveryFee = useMemo(() => {
    if (subtotal <= 0 || !selectedAddress) {
      return 0;
    }

    if (!shippingSettings) {
      return LEGACY_DELIVERY_FEE;
    }

    return getShippingFeeForAddress(selectedAddress, shippingSettings);
  }, [selectedAddress, shippingSettings, subtotal]);
  const total = subtotal + deliveryFee;
  const checkoutAddressId = useMemo(() => {
    const candidate = selectedAddressId ?? "";
    const parsed = Number.parseInt(candidate, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [selectedAddressId]);
  if (!cartReady || !addressesReady || !shippingSettingsReady) {
    return <CheckoutPageSkeleton />;
  }

  const handleInputChange =
    (field: keyof CheckoutFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setAddressError(null);
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleAddAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddressError(null);

    const formElement = event.currentTarget;
    if (!formElement.checkValidity()) {
      formElement.reportValidity();
      return;
    }

    const createUrl = buildApiUrl("/api/auth/addresses/");
    if (!createUrl) {
      setAddressError(text.missingApiBaseUrl);
      return;
    }

    try {
      setAddressSubmitting(true);
      const response = await fetchWithAuthRetry(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mapCheckoutFormToApiPayload(form)),
        cache: "no-store",
      });

      if (!response) {
        setAddressError(text.addressCreateFailed);
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setAddressError(text.missingAccessToken);
          return;
        }
        setAddressError(getApiMessage(payload, text.addressCreateFailed));
        return;
      }

      const normalizedPayload = normalizeCheckoutAddressResponse(payload);
      if (!normalizedPayload) {
        setAddressError(text.addressCreateFailed);
        return;
      }

      const newAddress = mapCheckoutAddressToSavedAddress(
        normalizedPayload,
        savedAddresses.length,
      );
      writeAddresses([...savedAddresses, newAddress]);
      setSelectedAddressId(newAddress.id);
      setShowAddressForm(false);
      setForm(emptyForm);
    } catch {
      setAddressError(text.addressCreateFailed);
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    setOrderError(null);

    if (items.length === 0) {
      setOrderError(text.emptyBag);
      return;
    }

    if (!checkoutAddressId || !selectedAddress) {
      setOrderError(text.addressRequired);
      return;
    }

    const checkoutUrl = buildApiUrl("/api/orders/checkout/");
    if (!checkoutUrl) {
      setOrderError(text.missingApiBaseUrl);
      return;
    }

    try {
      setOrderSubmitting(true);
      const response = await fetchWithAuthRetry(checkoutUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address_id: checkoutAddressId,
        }),
        cache: "no-store",
      });

      if (!response) {
        setOrderError(text.placeOrderFailed);
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setOrderError(text.missingAccessToken);
          return;
        }
        setOrderError(getApiMessage(payload, text.placeOrderFailed));
        return;
      }

      const rawOrderNumber =
        pickPayloadText(payload, [
          "order_number",
          "orderNumber",
          "number",
          "reference",
          "order_reference",
          "id",
        ]) || Date.now().toString().slice(-8);
      const orderNumber = rawOrderNumber.startsWith("#")
        ? rawOrderNumber
        : `#${rawOrderNumber}`;
      const paymentRedirectUrl = pickPayloadText(payload, [
        "payment_url",
        "paymentUrl",
        "redirect_url",
        "redirectUrl",
      ]);

      writeOrderConfirmation({
        orderNumber,
        status:
          pickPayloadText(payload, ["status", "payment_status", "paymentStatus"]) ||
          text.orderConfirmed,
        subtotal:
          pickPayloadNumber(payload, ["subtotal", "subtotal_amount", "cart_subtotal"]) ??
          subtotal,
        shippingFee:
          pickPayloadNumber(payload, [
            "shipping_price",
            "shipping",
            "shipping_fee",
            "delivery_fee",
          ]) ?? deliveryFee,
        total:
          pickPayloadNumber(payload, [
            "total",
            "estimated_total",
            "amount",
            "total_amount",
          ]) ?? total,
        itemCount: items.reduce((count, item) => count + item.quantity, 0),
        items,
        customerName:
          `${selectedAddress.firstName} ${selectedAddress.lastName}`.trim() ||
          selectedAddress.name.trim() ||
          text.customerFallback,
        phone: selectedAddress.phone.trim() || "-",
        deliveryAddress: formatDeliveryAddress(selectedAddress) || "-",
        addressLabel: selectedAddress.name.trim(),
        paymentMethod:
          pickPayloadText(payload, [
            "payment_method",
            "paymentMethod",
            "provider",
            "gateway",
          ]) || text.paymentMethodFallback,
        estimatedDelivery:
          pickPayloadText(payload, [
            "estimated_delivery",
            "estimated_delivery_date",
            "delivery_estimate",
            "eta",
          ]) || text.estimatedDeliveryFallback,
        email: pickPayloadText(payload, ["email", "customer_email", "customerEmail"]),
        placedAt: new Date().toISOString(),
      });

      if (paymentRedirectUrl && typeof window !== "undefined") {
        window.location.assign(paymentRedirectUrl);
        return;
      }

      router.push("/checkout/success");
    } catch {
      setOrderError(text.placeOrderFailed);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const disablePlaceOrder = orderSubmitting || items.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo isFixed={false} />

      <main className="mx-auto flex-1 w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <div className="h-px w-full bg-black/60" />

        <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="max-w-[460px]">
            {savedAddresses.length > 0 ? (
              <div className="mb-10">
                <div className="text-center text-xs font-semibold uppercase tracking-[0.32em] text-slate-700">
                  {text.addedAddresses}
                </div>
                <div className="mt-4 border border-black/10">
                  {savedAddresses.map((address, index) => {
                    const label = address.name.trim() || text.home;
                    const fullName = `${address.firstName} ${address.lastName}`.trim();
                    return (
                      <label
                        key={address.id}
                        className={`flex items-start justify-between gap-4 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-slate-500 ${
                          index === 0 ? "" : "border-t border-black/10"
                        }`}
                      >
                        <span className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="checkout-address"
                            checked={selectedAddressId === address.id}
                            onChange={() => {
                              setSelectedAddressId(address.id);
                              setShowAddressForm(false);
                              setAddressError(null);
                            }}
                            className="mt-1 h-3 w-3 border border-slate-400"
                          />
                          <span className="space-y-1">
                            <span className="block text-slate-700">
                              {label}
                            </span>
                            <span className="block">{fullName}</span>
                            <span className="block">{address.phone}</span>
                          </span>
                        </span>
                        <Link
                          href={`/profile?tab=addresses&edit=${address.id}`}
                          className="text-[9px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-700"
                        >
                          {text.edit}
                        </Link>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {addressError ? (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-red-600">
                {addressError}
              </div>
            ) : null}
            {showAddressForm ? (
              <>
                <div className="text-center text-xs font-semibold uppercase tracking-[0.32em] text-slate-700">
                  {text.deliveryAddressDetails}
                </div>
                <form
                  id="checkout-address-form"
                  onSubmit={(event) => {
                    void handleAddAddress(event);
                  }}
                  className="mt-8 space-y-6 text-[9px] uppercase tracking-[0.16em] text-slate-500 sm:space-y-6 sm:text-[10px] sm:tracking-[0.2em]"
                >
                  <fieldset disabled={addressSubmitting} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-6">
                      <label className="space-y-3">
                        <span>
                          {text.firstName} <span className="text-red-500">*</span>
                        </span>
                        <input
                          required
                          type="text"
                          placeholder={text.firstNamePlaceholder}
                          value={form.firstName}
                          onChange={handleInputChange("firstName")}
                          className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                        />
                      </label>
                      <label className="space-y-3">
                        <span>
                          {text.lastName} <span className="text-red-500">*</span>
                        </span>
                        <input
                          required
                          type="text"
                          placeholder={text.lastNamePlaceholder}
                          value={form.lastName}
                          onChange={handleInputChange("lastName")}
                          className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                        />
                      </label>
                    </div>

                    <label className="space-y-2">
                      <span>
                        {text.phoneNumber} <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        type="tel"
                        placeholder={text.phonePlaceholder}
                        value={form.phone}
                        onChange={handleInputChange("phone")}
                        className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.country} <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        type="text"
                        placeholder={text.countryPlaceholder}
                        value={form.country}
                        onChange={handleInputChange("country")}
                        className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.state} <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        type="text"
                        placeholder={text.statePlaceholder}
                        value={form.state}
                        onChange={handleInputChange("state")}
                        className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.city} <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        type="text"
                        placeholder={text.cityPlaceholder}
                        value={form.city}
                        onChange={handleInputChange("city")}
                        className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.addressNo1} <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        type="text"
                        placeholder={text.addressNo1Placeholder}
                        value={form.address1}
                        onChange={handleInputChange("address1")}
                        className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.addressNo2}{" "}
                        <span className="text-slate-400">({text.optional})</span>
                      </span>
                      <input
                        type="text"
                        placeholder={text.addressNo2Placeholder}
                        value={form.address2}
                        onChange={handleInputChange("address2")}
                        className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.postalCode} <span className="text-red-500">*</span>
                      </span>
                      <input
                        required
                        type="text"
                        placeholder={text.postalCodePlaceholder}
                        value={form.postalCode}
                        onChange={handleInputChange("postalCode")}
                        className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                      />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.name} <span className="text-slate-400">({text.optional})</span>
                      </span>
                      <input
                        type="text"
                        placeholder={text.namePlaceholder}
                        value={form.name}
                        onChange={handleInputChange("name")}
                        className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                      />
                    </label>
                  </fieldset>
                </form>
              </>
            ) : null}

            <button
              type={showAddressForm ? "submit" : "button"}
              form={showAddressForm ? "checkout-address-form" : undefined}
              onClick={
                showAddressForm
                  ? undefined
                  : () => {
                      setForm(emptyForm);
                      setAddressError(null);
                      setShowAddressForm(true);
                    }
              }
              disabled={addressSubmitting}
              className="mt-6 w-full py-3 text-[10px] uppercase tracking-[0.3em] text-white transition enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-black/40 bg-black"
            >
              {addressSubmitting ? text.addingAddress : text.addAddress}
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center text-xs font-semibold uppercase tracking-[0.32em] text-slate-700">
              {text.orderSummary}
            </div>
            <div className="border-t border-black/40 pt-4 text-[11px] uppercase tracking-[0.2em] text-slate-600">
              <div className="flex items-center justify-between border-b border-black/20 pb-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <span>{text.product}</span>
                <span>{text.total}</span>
              </div>
              <div className="space-y-3 pt-3">
                {items.length === 0 ? (
                  <div className="text-center text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    {text.emptyBag}
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b border-black/10 pb-2"
                    >
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <span>{text.subtotal}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <span>{text.delivery}</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{text.total}</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void handlePlaceOrder();
              }}
              disabled={disablePlaceOrder}
              className="w-full bg-black py-3 text-[10px] uppercase tracking-[0.3em] text-white transition enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-black/40"
            >
              {orderSubmitting ? text.placingOrder : text.placeOrder}
            </button>
            <p className="text-center text-[10px] normal-case tracking-[0.04em] text-slate-500">
              <span className="block">{text.paymentNoticeLine1}</span>
              <span className="mt-1 block">{text.paymentNoticeLine2}</span>
            </p>
            {orderError ? (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-red-600">
                {orderError}
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
