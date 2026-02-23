"use client";

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
import { byLanguage } from "../lib/i18n";
import Footer from "./footer";
import { useLanguage } from "./language-provider";
import SiteHeader from "./site-header";

const formatPrice = (value: number) => `${value.toFixed(2)} GEL`;

export default function ShoppingBag() {
  const { language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const text = {
    back: byLanguage({ EN: "Back", KA: "უკან" }, language),
    product: byLanguage({ EN: "Product", KA: "პროდუქტი" }, language),
    price: byLanguage({ EN: "Price", KA: "ფასი" }, language),
    emptyBag: byLanguage(
      { EN: "Your shopping bag is empty", KA: "შენი კალათა ცარიელია" },
      language
    ),
    remove: byLanguage({ EN: "Remove", KA: "წაშლა" }, language),
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
  };
  useEffect(() => {
    let isActive = true;

    const loadCart = async () => {
      const localItems = readCart();
      if (isActive) {
        setItems(localItems);
      }
      const snapshot = await fetchCart();
      if (!isActive || !snapshot) return;
      setItems(snapshot.items);
    };
    loadCart();

    const unsubscribe = subscribeToCart((nextItems) => {
      setItems(nextItems);
    });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getCartStorageKey()) {
        setItems(readCart());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      isActive = false;
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo isFixed={false} />

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
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-24 w-20 object-cover"
                      />
                      <div className="flex flex-1 flex-col gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <div className="flex items-center justify-between gap-4 text-slate-700">
                          <span>{item.name}</span>
                          <span className="hidden sm:inline">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        <span>{formatPrice(item.price)}</span>
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
