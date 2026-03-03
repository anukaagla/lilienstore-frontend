"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { CartItem } from "../lib/cart";
import {
  getCartStorageKey,
  readCart,
  subscribeToCart,
  writeCart,
} from "../lib/cart";
import {
  clearCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from "../lib/cart-api";
import { fetchAuthSession, fetchWithAuthRetry } from "../lib/auth";
import { byLanguage } from "../lib/i18n";
import { toAbsoluteMediaUrl } from "../lib/media";
import Footer from "./footer";
import { useLanguage } from "./language-provider";
import { ShoppingBagPageSkeleton } from "./page-skeletons";
import SiteHeader from "./site-header";

const formatPrice = (value: number) => `${value.toFixed(2)} GEL`;

const fetchAccountActiveStatus = async (): Promise<boolean | null> => {
  const endpoints = ["/api/me/", "/api/auth/me/"];

  for (let index = 0; index < endpoints.length; index += 1) {
    const endpoint = endpoints[index];
    const isLastEndpoint = index === endpoints.length - 1;
    const response = await fetchWithAuthRetry(endpoint, {
      method: "GET",
      cache: "no-store",
    });

    if (!response) {
      if (isLastEndpoint) {
        return null;
      }
      continue;
    }

    const payload = await response.json().catch(() => null);

    if (response.ok) {
      if (!payload || typeof payload !== "object") {
        return null;
      }

      const activeStatus = (payload as { active_status?: unknown }).active_status;
      return typeof activeStatus === "boolean" ? activeStatus : null;
    }

    if (response.status !== 404 || isLastEndpoint) {
      return null;
    }
  }

  return null;
};

export default function ShoppingBag() {
  const { language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [loginOpenRequest, setLoginOpenRequest] = useState(0);
  const [cartReloadKey, setCartReloadKey] = useState(0);
  const text = {
    back: byLanguage({ EN: "Back", KA: "უკან" }, language),
    product: byLanguage({ EN: "Product", KA: "პროდუქტი" }, language),
    price: byLanguage({ EN: "Price", KA: "ფასი" }, language),
    emptyBag: byLanguage(
      { EN: "Your shopping bag is empty", KA: "შენი კალათა ცარიელია" },
      language
    ),
    remove: byLanguage({ EN: "Remove", KA: "წაშლა" }, language),
    color: byLanguage({ EN: "Colour", KA: "ფერი" }, language),
    size: byLanguage({ EN: "Size", KA: "ზომა" }, language),
    clearBag: byLanguage(
      { EN: "Clear Shopping Bag", KA: "კალათის გასუფთავება" },
      language
    ),
    orderSummary: byLanguage({ EN: "Order Summary", KA: "შეკვეთის შეჯამება" }, language),
    subtotal: byLanguage({ EN: "Subtotal", KA: "პროდუქციის ფასი" }, language),
    delivery: byLanguage({ EN: "Delivery", KA: "მიწოდება" }, language),
    total: byLanguage({ EN: "Total", KA: "სულ" }, language),
    deliveryInfo: byLanguage(
      { EN: "Delivery Information", KA: "მიწოდების ინფორმაცია" },
      language
    ),
    proceedToCheckout: byLanguage(
      { EN: "Proceed To Checkout", KA: "გადადი გადახდაზე" },
      language
    ),
    loginRequired: byLanguage(
      {
        EN: "Please log in first to view your shopping bag.",
        KA: "კალათის სანახავად ჯერ გაიარე ავტორიზაცია.",
      },
      language
    ),
    verifyEmailRequired: byLanguage(
      {
        EN: "Please verify your email first to access your shopping bag.",
        KA: "კალათაზე წვდომისთვის ჯერ დაადასტურე ელ.ფოსტა.",
      },
      language
    ),
    logIn: byLanguage({ EN: "Log In", KA: "შესვლა" }, language),
    verifyEmail: byLanguage(
      { EN: "Verify Email", KA: "ელ.ფოსტის დადასტურება" },
      language
    ),
  };
  useEffect(() => {
    let isActive = true;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getCartStorageKey()) {
        setItems(readCart());
      }
    };
    let unsubscribe = () => {};

    const loadCart = async () => {
      const session = await fetchAuthSession();
      if (!isActive) return;

      if (!session?.authenticated) {
        setItems([]);
        setLoginRequired(true);
        setVerificationRequired(false);
        setCartLoading(false);
        return;
      }

      setLoginRequired(false);
      const activeStatus = await fetchAccountActiveStatus();
      if (!isActive) return;

      if (activeStatus === false) {
        setItems([]);
        setVerificationRequired(true);
        setCartLoading(false);
        return;
      }

      setVerificationRequired(false);
      const localItems = readCart();
      setItems(localItems);
      if (localItems.length > 0) {
        setCartLoading(false);
      }

      unsubscribe = subscribeToCart((nextItems) => {
        setItems(nextItems);
      });
      window.addEventListener("storage", handleStorage);

      const snapshot = await fetchCart();
      if (!isActive) return;
      if (snapshot) {
        setItems(snapshot.items);
      }
      setCartLoading(false);
    };
    void loadCart();

    return () => {
      isActive = false;
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, [cartReloadKey]);

  const handleLoginSuccess = () => {
    setCartLoading(true);
    setLoginRequired(false);
    setCartReloadKey((current) => current + 1);
  };

  const updateItems = (updater: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      writeCart(next);
      return next;
    });
  };

  const handleRemoveItem = async (id: string) => {
    const itemId = Number(id);
    if (!Number.isFinite(itemId)) {
      updateItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    const snapshot = await removeCartItem(itemId);
    if (snapshot) {
      setItems(snapshot.items);
    }
  };

  const handleQuantityChange = async (id: string, delta: number) => {
    const itemId = Number(id);
    if (!Number.isFinite(itemId)) {
      updateItems((prev) =>
        prev.flatMap((item) => {
          if (item.id !== id) return [item];
          const nextQuantity = item.quantity + delta;
          if (nextQuantity <= 0) {
            return [];
          }
          return [{ ...item, quantity: nextQuantity }];
        }),
      );
      return;
    }
    const current = items.find((item) => item.id === id);
    if (!current) return;
    const nextQuantity = current.quantity + delta;
    if (nextQuantity <= 0) {
      const snapshot = await removeCartItem(itemId);
      if (snapshot) {
        setItems(snapshot.items);
      }
      return;
    }
    const snapshot = await updateCartItem(itemId, nextQuantity);
    if (snapshot) {
      setItems(snapshot.items);
    }
  };

  const handleClear = async () => {
    const snapshot = await clearCart();
    if (snapshot) {
      setItems(snapshot.items);
      return;
    }
    const hasLocalIds = items.some(
      (item) => !Number.isFinite(Number(item.id))
    );
    if (hasLocalIds) {
      updateItems(() => []);
    }
  };
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

  if (cartLoading) {
    return <ShoppingBagPageSkeleton />;
  }

  if (loginRequired) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
        <SiteHeader
          showFullLogo
          isFixed={false}
          loginOpenRequest={loginOpenRequest}
          onLoginSuccess={handleLoginSuccess}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6">
          <div className="w-full">
            <div className="h-px w-full bg-black/60" />
            <section className="flex min-h-[50vh] flex-col items-center justify-center gap-6">
              <p className="max-w-md text-center text-[11px] uppercase tracking-[0.28em] text-slate-500 sm:text-xs">
                {text.loginRequired}
              </p>
              <button
                type="button"
                onClick={() => setLoginOpenRequest((current) => current + 1)}
                className="rounded-full bg-black px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
              >
                {text.logIn}
              </button>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (verificationRequired) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
        <SiteHeader
          showFullLogo
          isFixed={false}
          loginOpenRequest={loginOpenRequest}
          onLoginSuccess={handleLoginSuccess}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6">
          <div className="w-full">
            <div className="h-px w-full bg-black/60" />
            <section className="flex min-h-[50vh] flex-col items-center justify-center gap-6">
              <p className="max-w-md text-center text-[11px] uppercase tracking-[0.28em] text-slate-500 sm:text-xs">
                {text.verifyEmailRequired}
              </p>
              <Link
                href="/profile?tab=confirmEmail"
                className="rounded-full bg-black px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
              >
                {text.verifyEmail}
              </Link>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader
        showFullLogo
        isFixed={false}
        loginOpenRequest={loginOpenRequest}
        onLoginSuccess={handleLoginSuccess}
      />

      <main className="mx-auto flex-1 w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <div className="h-px w-full bg-black/60" />

        <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24px_minmax(0,360px)]">
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4 5 10l6 6" />
              </svg>
              {text.back}
            </button>
            <div className="flex items-center justify-between border-b border-black/40 pb-3 text-xs uppercase tracking-[0.22em] text-slate-600">
              <span>{text.product}</span>
              <span className="hidden sm:inline">{text.price}</span>
            </div>

            <div className="space-y-6">
              {items.length === 0 ? (
                <div className="py-10 text-center text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  {text.emptyBag}
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 border-b border-black/20 pb-6"
                  >
                    <button
                      type="button"
                      aria-label={`${text.remove} ${item.name}`}
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-lg font-light text-slate-500 transition hover:text-slate-900"
                    >
                      X
                    </button>
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
                      <Image
                        src={toAbsoluteMediaUrl(item.image) || "/images/dress.png"}
                        alt={item.name}
                        width={80}
                        height={96}
                        sizes="80px"
                        className="h-24 w-20 rounded-lg object-contain"
                      />
                      <div className="flex flex-1 flex-col gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <div className="flex items-center justify-between gap-4 text-slate-700">
                          <span>{item.name}</span>
                          <span className="hidden sm:inline">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        <span>{formatPrice(item.price)}</span>
                        {item.color ? (
                          <span className="inline-flex items-center gap-2">
                            {text.color}: {item.color}
                            {item.colorHex ? (
                              <span
                                aria-hidden="true"
                                className="h-3 w-3 rounded-full border border-black/15"
                                style={{ backgroundColor: item.colorHex }}
                              />
                            ) : null}
                          </span>
                        ) : null}
                        <span>
                          {text.size}: {item.size}
                        </span>
                        <div className="inline-flex w-fit items-center border border-slate-300 text-[10px] uppercase tracking-[0.2em] text-slate-600">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="px-3 py-1 transition hover:text-slate-900"
                          >
                            -
                          </button>
                          <span className="px-3 py-1">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="px-3 py-1 transition hover:text-slate-900"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 border-b border-slate-400 pb-1 text-[10px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
            >
              {text.clearBag}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h14" />
                <path d="M7 6V4h6v2" />
                <path d="M6 6l1 10h6l1-10" />
              </svg>
            </button>
          </div>

          <div className="hidden lg:block w-px bg-black/40" />

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-black/40 pb-3 text-xs uppercase tracking-[0.22em] text-slate-600">
              <span>{text.orderSummary}</span>
            </div>
            <div className="space-y-3 text-[11px] uppercase tracking-[0.2em] text-slate-600">
              <div className="flex items-center justify-between border-b border-black/20 pb-2">
                <span>{text.subtotal}:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-black/20 pb-2">
                <span>{text.delivery}:</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{text.total}:</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            <div className="space-y-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              <Link
                href="/policies/shipping-and-delivery-policy"
                className="transition hover:text-slate-600"
              >
                {text.deliveryInfo}
              </Link>
            </div>
            {items.length === 0 ? (
              <button
                type="button"
                aria-disabled="true"
                className="mt-2 block w-full cursor-not-allowed bg-black/40 py-3 text-center text-[10px] uppercase tracking-[0.3em] text-white"
              >
                {text.proceedToCheckout}
              </button>
            ) : (
              <Link
                href="/checkout"
                className="mt-2 block w-full bg-black py-3 text-center text-[10px] uppercase tracking-[0.3em] text-white transition hover:scale-[1.02]"
              >
                {text.proceedToCheckout}
              </Link>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
