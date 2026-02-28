"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ChangeEvent } from "react";
import type { CartItem } from "../lib/cart";
import { readCart, subscribeToCart } from "../lib/cart";
import type { Address } from "../lib/addresses";
import {
  getAddressesStorageKey,
  readAddresses,
  subscribeToAddresses,
} from "../lib/addresses";
import { fetchWithAuthRetry } from "../lib/auth";
import { byLanguage } from "../lib/i18n";
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
  notes: string;
  agreed: boolean;
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
  notes: "",
  agreed: false,
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const PAYMENTS_ENABLED = false;

const formatPrice = (value: number) => `${value.toFixed(2)} GEL`;

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

const getApiMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return fallback;
};

export default function Checkout() {
  const { language } = useLanguage();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [addressesReady, setAddressesReady] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<CheckoutFormState>(emptyForm);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const text = {
    addedAddresses: byLanguage({ EN: "Added Addresses", KA: "დამატებული მისამართები" }, language),
    home: byLanguage({ EN: "Home", KA: "სახლი" }, language),
    edit: byLanguage({ EN: "Edit", KA: "რედაქტირება" }, language),
    deliveryAddressDetails: byLanguage(
      { EN: "Delivery Address Details", KA: "მიწოდების მისამართი" },
      language
    ),
    firstName: byLanguage({ EN: "First Name", KA: "სახელი" }, language),
    lastName: byLanguage({ EN: "Last Name", KA: "გვარი" }, language),
    phoneNumber: byLanguage({ EN: "Phone Number", KA: "ტელეფონის ნომერი" }, language),
    country: byLanguage({ EN: "Country", KA: "ქვეყანა" }, language),
    state: byLanguage({ EN: "State", KA: "რეგიონი" }, language),
    city: byLanguage({ EN: "City", KA: "ქალაქი" }, language),
    addressNo1: byLanguage({ EN: "Address No 1", KA: "მისამართი 1" }, language),
    addressNo2: byLanguage({ EN: "Address No 2", KA: "მისამართი 2" }, language),
    postalCode: byLanguage({ EN: "Postal Code", KA: "საფოსტო ინდექსი" }, language),
    name: byLanguage({ EN: "Name", KA: "სახელი" }, language),
    addressNotes: byLanguage({ EN: "Address Notes", KA: "მისამართის შენიშვნა" }, language),
    optional: byLanguage({ EN: "optional", KA: "არასავალდებულო" }, language),
    agreeTo: byLanguage({ EN: "I agree to", KA: "ვეთანხმები" }, language),
    terms: byLanguage({ EN: "Terms & Conditions", KA: "წესებსა და პირობებს" }, language),
    privacy: byLanguage({ EN: "Privacy Policy", KA: "კონფიდენციალურობის პოლიტიკას" }, language),
    and: byLanguage({ EN: "and", KA: "და" }, language),
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
    agreementRequired: byLanguage(
      {
        EN: "Please agree to Terms & Conditions and Privacy Policy before placing an order.",
        KA: "შეკვეთის გასაფორმებლად დაეთანხმეთ წესებსა და პირობებს და კონფიდენციალურობის პოლიტიკას.",
      },
      language,
    ),
    paymentTemporarilyUnavailable: byLanguage(
      {
        EN: "Payment is temporarily unavailable.",
        KA: "დროებით გადახდა შეუძლებელია",
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
    placeOrderSuccess: byLanguage(
      {
        EN: "Order placed successfully.",
        KA: "შეკვეთა წარმატებით გაფორმდა.",
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
    setOrderError(null);
    setOrderSuccess(null);
  }, [language]);

  useEffect(() => {
    const load = () => {
      const next = readAddresses();
      setSavedAddresses(next);
      setSelectedAddressId((prev) =>
        prev && next.some((address) => address.id === prev) ? prev : null,
      );
    };
    load();
    setAddressesReady(true);
    const unsubscribe = subscribeToAddresses((nextItems) => {
      setSavedAddresses(nextItems);
      setSelectedAddressId((prev) =>
        prev && nextItems.some((address) => address.id === prev) ? prev : null,
      );
    });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getAddressesStorageKey()) {
        load();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
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
  const deliveryFee = subtotal > 0 ? 5 : 0;
  const total = subtotal + deliveryFee;
  const checkoutAddressId = useMemo(() => {
    const candidate = selectedAddressId ?? savedAddresses[0]?.id ?? "";
    const parsed = Number.parseInt(candidate, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [savedAddresses, selectedAddressId]);

  if (!cartReady || !addressesReady) {
    return <CheckoutPageSkeleton />;
  }

  const handleInputChange =
    (field: keyof CheckoutFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        field === "agreed"
          ? (event.target as HTMLInputElement).checked
          : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handlePlaceOrder = async () => {
    setOrderError(null);
    setOrderSuccess(null);

    if (!checkoutAddressId) {
      setOrderError(text.addressRequired);
      return;
    }

    if (!form.agreed) {
      setOrderError(text.agreementRequired);
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

      setOrderSuccess(text.placeOrderSuccess);
    } catch {
      setOrderError(text.placeOrderFailed);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const disablePlaceOrder = orderSubmitting || (PAYMENTS_ENABLED && (!checkoutAddressId || items.length === 0));

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
                            type="checkbox"
                            checked={selectedAddressId === address.id}
                            onChange={() =>
                              setSelectedAddressId((prev) =>
                                prev === address.id ? null : address.id,
                              )
                            }
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
            {selectedAddressId ? null : (
              <>
                <div className="text-center text-xs font-semibold uppercase tracking-[0.32em] text-slate-700">
                  {text.deliveryAddressDetails}
                </div>
                <form className="mt-8 space-y-6 text-[9px] uppercase tracking-[0.16em] text-slate-500 sm:space-y-6 sm:text-[10px] sm:tracking-[0.2em]">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-6">
                <label className="space-y-3">
                  <span>
                    {text.firstName} <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="JANE"
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
                    placeholder="DOE"
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
                  placeholder="NUMBER"
                  value={form.phone}
                  onChange={handleInputChange("phone")}
                  className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                />
              </label>

              <label className="space-y-2">
                <span>{text.country}</span>
                <input
                  type="text"
                  placeholder="GEORGIA"
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
                  placeholder="ZNAKVA"
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
                  placeholder="TBILISI"
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
                  placeholder="TBILISI"
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
                  placeholder="TBILISI"
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
                  placeholder="1234"
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
                  placeholder="HOME"
                  value={form.name}
                  onChange={handleInputChange("name")}
                  className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                />
              </label>

              <label className="space-y-2">
                <span>
                  {text.addressNotes}{" "}
                  <span className="text-slate-400">({text.optional})</span>
                </span>
                <textarea
                  placeholder=""
                  value={form.notes}
                  onChange={handleInputChange("notes")}
                  className="mb-[10px] h-20 w-full resize-none border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                />
              </label>

              </form>
            </>
            )}

            <label className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={handleInputChange("agreed")}
                className="h-3 w-3 border border-slate-400"
              />
              <span>
                {text.agreeTo}{" "}
                <Link
                  href="/policies/terms-of-service"
                  className="underline transition hover:text-slate-700"
                >
                  {text.terms}
                </Link>{" "}
                {text.and}{" "}
                <Link
                  href="/policies/privacy-policy"
                  className="underline transition hover:text-slate-700"
                >
                  {text.privacy}
                </Link>
                .
              </span>
            </label>
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
                if (!PAYMENTS_ENABLED) {
                  setOrderSuccess(null);
                  setOrderError(text.paymentTemporarilyUnavailable);
                  return;
                }
                void handlePlaceOrder();
              }}
              disabled={disablePlaceOrder}
              className={`w-full py-3 text-[10px] uppercase tracking-[0.3em] text-white transition ${
                PAYMENTS_ENABLED
                  ? "bg-black enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-black/40"
                  : "cursor-not-allowed bg-black/40"
              }`}
            >
              {orderSubmitting ? text.placingOrder : text.placeOrder}
            </button>
            {orderError ? (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-red-600">
                {orderError}
              </p>
            ) : null}
            {orderSuccess ? (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                {orderSuccess}
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
