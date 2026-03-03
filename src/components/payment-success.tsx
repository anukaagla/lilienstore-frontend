"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { writeCart } from "../lib/cart";
import { byLanguage } from "../lib/i18n";
import { toAbsoluteMediaUrl } from "../lib/media";
import {
  parseOrderConfirmation,
  readOrderConfirmationValue,
  type OrderConfirmationSnapshot,
} from "../lib/order-confirmation";
import Footer from "./footer";
import { useLanguage } from "./language-provider";
import SiteHeader from "./site-header";

const formatPrice = (value: number) => `${value.toFixed(2)} GEL`
const subscribeToSnapshot = () => () => {}

const successIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-7 w-7"
    fill="none"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="m8.5 12.2 2.2 2.2 4.8-5.1"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const formatPlacedAt = (value: string, locale: "en-US" | "ka-GE", fallback: string) => {
  if (!value.trim()) return fallback

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

export default function PaymentSuccess() {
  const { language } = useLanguage()
  const confirmationValue = useSyncExternalStore(
    subscribeToSnapshot,
    readOrderConfirmationValue,
    () => null,
  )
  const confirmation = parseOrderConfirmation(confirmationValue)
  const ready = useSyncExternalStore(subscribeToSnapshot, () => true, () => false)

  useEffect(() => {
    if (confirmationValue) {
      writeCart([])
    }
  }, [confirmationValue])

  const text = {
    pill: byLanguage({ EN: "Payment Successful", KA: "გადახდა წარმატებულია" }, language),
    eyebrow: byLanguage({ EN: "Thank You", KA: "გმადლობთ" }, language),
    title: byLanguage(
      { EN: "Your Order Is Confirmed", KA: "შენი შეკვეთა დადასტურებულია" },
      language,
    ),
    description: byLanguage(
      {
        EN: "Your payment was received successfully and your order is now being prepared.",
        KA: "გადახდა წარმატებით მივიღეთ და შენი შეკვეთა უკვე მზადების პროცესშია.",
      },
      language,
    ),
    fallbackNote: byLanguage(
      {
        EN: "We could not load the full receipt details, but your confirmation page is ready.",
        KA: "სრული ქვითრის დეტალები ვერ ჩაიტვირთა, თუმცა დადასტურების გვერდი მზად არის.",
      },
      language,
    ),
    orderNumber: byLanguage({ EN: "Order Number", KA: "შეკვეთის ნომერი" }, language),
    status: byLanguage({ EN: "Status", KA: "სტატუსი" }, language),
    placedAt: byLanguage({ EN: "Placed At", KA: "განთავსდა" }, language),
    itemsTitle: byLanguage({ EN: "Items In This Order", KA: "შეკვეთაში არსებული ნივთები" }, language),
    itemsEmpty: byLanguage(
      {
        EN: "Your item breakdown will appear here once the order sync finishes.",
        KA: "ნივთების ჩამონათვალი აქ გამოჩნდება, როგორც კი შეკვეთა სრულად დასინქრონდება.",
      },
      language,
    ),
    qty: byLanguage({ EN: "Qty", KA: "რაოდ." }, language),
    size: byLanguage({ EN: "Size", KA: "ზომა" }, language),
    color: byLanguage({ EN: "Color", KA: "ფერი" }, language),
    receipt: byLanguage({ EN: "Receipt Summary", KA: "ქვითრის შეჯამება" }, language),
    subtotal: byLanguage({ EN: "Subtotal", KA: "შუალედური ჯამი" }, language),
    shipping: byLanguage({ EN: "Delivery", KA: "მიწოდება" }, language),
    total: byLanguage({ EN: "Total Paid", KA: "სულ გადახდილი" }, language),
    deliveryTitle: byLanguage({ EN: "Delivery Details", KA: "მიწოდების დეტალები" }, language),
    contact: byLanguage({ EN: "Contact", KA: "კონტაქტი" }, language),
    paymentMethod: byLanguage({ EN: "Payment Method", KA: "გადახდის მეთოდი" }, language),
    eta: byLanguage({ EN: "Estimated Delivery", KA: "მოსალოდნელი მიწოდება" }, language),
    trackOrder: byLanguage({ EN: "Track In Profile", KA: "იხილე პროფილში" }, language),
    continueShopping: byLanguage({ EN: "Continue Shopping", KA: "განაგრძე შოპინგი" }, language),
    needHelp: byLanguage(
      {
        EN: "Need to update your delivery details or review the order later?",
        KA: "გჭირდება მიწოდების დეტალების შეცვლა ან შეკვეთის შემოწმება მოგვიანებით?",
      },
      language,
    ),
    loadingReceipt: byLanguage(
      { EN: "Loading your receipt...", KA: "მიმდინარეობს ქვითრის ჩატვირთვა..." },
      language,
    ),
    confirmed: byLanguage({ EN: "Confirmed", KA: "დადასტურებულია" }, language),
    justNow: byLanguage({ EN: "Just now", KA: "ახლახან" }, language),
    customer: byLanguage({ EN: "Customer", KA: "მომხმარებელი" }, language),
    fallbackAddress: byLanguage(
      {
        EN: "Delivery details will be attached to your order confirmation shortly.",
        KA: "მიწოდების დეტალები მალე დაემატება შეკვეთის დადასტურებას.",
      },
      language,
    ),
    fallbackEta: byLanguage(
      {
        EN: "Our team will contact you shortly with delivery timing.",
        KA: "ჩვენი გუნდი მალე დაგიკავშირდება მიწოდების დროის დასაზუსტებლად.",
      },
      language,
    ),
    updatesEmail: byLanguage(
      {
        EN: "Order updates will be sent to your account email.",
        KA: "შეკვეთის განახლებები გაიგზავნება შენი ანგარიშის ელფოსტაზე.",
      },
      language,
    ),
    itemSingular: byLanguage({ EN: "item", KA: "ნივთი" }, language),
    itemPlural: byLanguage({ EN: "items", KA: "ნივთი" }, language),
  }

  const fallbackSummary: OrderConfirmationSnapshot = {
    orderNumber: "#-",
    status: text.confirmed,
    subtotal: 0,
    shippingFee: 0,
    total: 0,
    itemCount: 0,
    items: [],
    customerName: text.customer,
    phone: "-",
    deliveryAddress: text.fallbackAddress,
    addressLabel: "",
    paymentMethod: "UniPay",
    estimatedDelivery: text.fallbackEta,
    email: "",
    placedAt: "",
  }

  const summary = confirmation ?? fallbackSummary
  const locale = language === "KA" ? "ka-GE" : "en-US"
  const placedAtLabel = formatPlacedAt(summary.placedAt, locale, text.justNow)
  const itemCount = summary.items.reduce((total, item) => total + item.quantity, 0) || summary.itemCount
  const contactDetail = summary.email || text.updatesEmail
  const showFallbackNote = ready && confirmationValue === null

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo isFixed={false} />

      <main className="mx-auto flex-1 w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <div className="h-px w-full bg-black/60" />

        <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-[#e6e3da] bg-[linear-gradient(135deg,rgba(249,246,240,0.98),rgba(255,255,255,1)_54%,rgba(239,234,223,0.96))] px-6 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8">
              <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-[#efe8db] blur-3xl" />
              <div className="absolute -bottom-10 left-0 h-36 w-36 rounded-full bg-[#f6f0e5] blur-3xl" />

              <div className="relative flex flex-col gap-8">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d8ccb4] bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a7a55]">
                  <span className="h-2 w-2 rounded-full bg-[#a79974]" />
                  {text.pill}
                </div>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-[#d8ccb4] bg-white text-[#8a7a55] shadow-[0_10px_24px_rgba(167,153,116,0.16)]">
                    {successIcon}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#8a7a55]">
                      {text.eyebrow}
                    </p>
                    <h1 className="font-display text-4xl leading-none text-slate-900 sm:text-5xl">
                      {text.title}
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                      {text.description} {text.orderNumber}: {summary.orderNumber}
                    </p>
                    {showFallbackNote ? (
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {text.fallbackNote}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.35rem] border border-black/10 bg-white/85 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {text.orderNumber}
                    </p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
                      {summary.orderNumber}
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-black/10 bg-white/85 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {text.status}
                    </p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8a7a55]">
                      {summary.status || text.confirmed}
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-black/10 bg-white/85 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {text.placedAt}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {placedAtLabel}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-black/10 bg-white px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:px-7">
              <div className="flex flex-col gap-2 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {text.itemsTitle}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {itemCount} {itemCount === 1 ? text.itemSingular : text.itemPlural}
                  </p>
                </div>
                {!ready ? (
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {text.loadingReceipt}
                  </p>
                ) : null}
              </div>

              {summary.items.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {summary.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 border-b border-black/10 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-start"
                    >
                      <Image
                        src={toAbsoluteMediaUrl(item.image) || "/images/dress.png"}
                        alt={item.name}
                        width={96}
                        height={96}
                        sizes="96px"
                        className="h-24 w-full rounded-[1.2rem] object-contain sm:h-24 sm:w-24"
                      />

                      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            <span>
                              {text.qty}: {item.quantity}
                            </span>
                            <span>
                              {text.size}: {item.size}
                            </span>
                            {item.color ? (
                              <span>
                                {text.color}: {item.color}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <p className="text-sm font-semibold text-slate-700">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.2rem] border border-dashed border-black/10 bg-[#faf8f3] px-5 py-6 text-center text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {text.itemsEmpty}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <aside className="rounded-[1.6rem] border border-black/10 bg-[#fbfaf7] px-6 py-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                {text.receipt}
              </p>

              <div className="mt-5 space-y-3 text-[11px] uppercase tracking-[0.16em] text-slate-600">
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <span>{text.subtotal}</span>
                  <span>{formatPrice(summary.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <span>{text.shipping}</span>
                  <span>{formatPrice(summary.shippingFee)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-900">
                  <span>{text.total}</span>
                  <span className="text-base font-semibold">{formatPrice(summary.total)}</span>
                </div>
              </div>
            </aside>

            <aside className="rounded-[1.6rem] border border-black/10 bg-white px-6 py-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                {text.deliveryTitle}
              </p>

              <div className="mt-5 space-y-5 text-sm text-slate-600">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {summary.addressLabel || text.deliveryTitle}
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">{summary.customerName}</p>
                  <p className="mt-1">{summary.phone}</p>
                  <p className="mt-2 leading-6">{summary.deliveryAddress}</p>
                </div>

                <div className="h-px w-full bg-black/10" />

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {text.contact}
                  </p>
                  <p className="mt-2 leading-6">{contactDetail}</p>
                </div>

                <div className="h-px w-full bg-black/10" />

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {text.paymentMethod}
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">{summary.paymentMethod}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {text.eta}
                  </p>
                  <p className="mt-2 leading-6">{summary.estimatedDelivery}</p>
                </div>
              </div>
            </aside>

            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                {text.needHelp}
              </p>
              <Link
                href="/profile?tab=orders"
                className="flex w-full items-center justify-center rounded-full bg-black px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
              >
                {text.trackOrder}
              </Link>
              <Link
                href="/market"
                className="flex w-full items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:border-black/20 hover:bg-slate-50"
              >
                {text.continueShopping}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
