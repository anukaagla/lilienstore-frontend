"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { byLanguage } from "../lib/i18n";
import { parseOrderConfirmation, readOrderConfirmationValue } from "../lib/order-confirmation";
import Footer from "./footer";
import { useLanguage } from "./language-provider";
import SiteHeader from "./site-header";

const subscribeToSnapshot = () => () => {}

const cancelIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="m8.75 8.75 6.5 6.5M15.25 8.75l-6.5 6.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

export default function PaymentCancel() {
  const { language } = useLanguage()
  const confirmationValue = useSyncExternalStore(
    subscribeToSnapshot,
    readOrderConfirmationValue,
    () => null,
  )
  const confirmation = parseOrderConfirmation(confirmationValue)

  const text = {
    pill: byLanguage({ EN: "Payment Cancelled", KA: "გადახდა გაუქმდა" }, language),
    eyebrow: byLanguage({ EN: "Checkout Interrupted", KA: "შეჩერებული გადახდა" }, language),
    title: byLanguage({ EN: "Order Was Cancelled", KA: "შეკვეთა გაუქმებულია" }, language),
    description: byLanguage(
      {
        EN: "Your payment session was cancelled before completion. No charge was captured.",
        KA: "გადახდის სესია დასრულებამდე გაუქმდა. თანხა არ ჩამოგეჭრათ.",
      },
      language,
    ),
    orderNumber: byLanguage({ EN: "Order Number", KA: "შეკვეთის ნომერი" }, language),
    status: byLanguage({ EN: "Status", KA: "სტატუსი" }, language),
    cancelled: byLanguage({ EN: "Cancelled", KA: "გაუქმებულია" }, language),
    noOrderNumber: "#-",
    nextSteps: byLanguage({ EN: "What You Can Do Next", KA: "შემდეგი ნაბიჯები" }, language),
    retryHint: byLanguage(
      {
        EN: "Return to checkout and complete payment when you are ready.",
        KA: "დაბრუნდი ჩექაუთზე და დაასრულე გადახდა როცა მზად იქნები.",
      },
      language,
    ),
    cartHint: byLanguage(
      {
        EN: "Your shopping bag items are still saved.",
        KA: "შენი ჩანთის ნივთები შენახულია.",
      },
      language,
    ),
    supportHint: byLanguage(
      {
        EN: "If cancellation was accidental, you can retry immediately.",
        KA: "თუ გაუქმება შემთხვევით მოხდა, შეგიძლია ახლავე სცადო თავიდან.",
      },
      language,
    ),
    backToBag: byLanguage({ EN: "Back To Bag", KA: "ჩანთაზე დაბრუნება" }, language),
    continueShopping: byLanguage(
      { EN: "Continue Shopping", KA: "შოპინგის გაგრძელება" },
      language,
    ),
  }

  const orderNumber = confirmation?.orderNumber || text.noOrderNumber

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo isFixed={false} />

      <main className="mx-auto flex-1 w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <div className="h-px w-full bg-black/60" />

        <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="relative overflow-hidden rounded-[2rem] border border-[#f0d2d2] bg-[linear-gradient(135deg,rgba(255,246,246,0.98),rgba(255,255,255,1)_54%,rgba(252,236,236,0.96))] px-6 py-7 shadow-[0_24px_80px_rgba(127,29,29,0.08)] sm:px-8 sm:py-8">
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-[#fde7e7] blur-3xl" />
            <div className="absolute -bottom-10 left-0 h-36 w-36 rounded-full bg-[#fceeee] blur-3xl" />

            <div className="relative flex flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e6bcbc] bg-white/85 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#af4d4d]">
                <span className="h-2 w-2 rounded-full bg-[#c95e5e]" />
                {text.pill}
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-[#e6bcbc] bg-white text-[#b44b4b] shadow-[0_10px_24px_rgba(180,75,75,0.18)]">
                  {cancelIcon}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#af4d4d]">
                    {text.eyebrow}
                  </p>
                  <h1 className="font-display text-4xl leading-none text-slate-900 sm:text-5xl">
                    {text.title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                    {text.description} {text.orderNumber}: {orderNumber}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-black/10 bg-white/85 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {text.orderNumber}
                  </p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
                    {orderNumber}
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-black/10 bg-white/85 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {text.status}
                  </p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#b44b4b]">
                    {text.cancelled}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[1.6rem] border border-black/10 bg-white px-6 py-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              {text.nextSteps}
            </p>

            <div className="mt-5 space-y-3">
              <p className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {text.retryHint}
              </p>
              <p className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {text.cartHint}
              </p>
              <p className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {text.supportHint}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/shopping-bag"
                className="flex w-full items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:border-black/20 hover:bg-slate-50"
              >
                {text.backToBag}
              </Link>
              <Link
                href="/market"
                className="flex w-full items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:border-black/20 hover:bg-slate-50"
              >
                {text.continueShopping}
              </Link>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  )
}
