"use client";

import Link from "next/link";

import Footer from "./footer";
import SiteHeader from "./site-header";

type NotFoundNoticeProps = {
  variant?: "product" | "page";
};

export default function NotFoundNotice({
  variant = "page",
}: NotFoundNoticeProps) {

  const text = {
    productTitle: "Product not found",
    // Deliberately neutral: a product with no price in the visitor's currency is
    // hidden by design, so this is a normal outcome rather than a failure.
    productBody: "This item may not be available in your region right now.",
    pageTitle: "Page not found",
    pageBody: "The page you were looking for does not exist.",
    backToShop: "Back to shop",
    backHome: "Back home",
  };

  const isProduct = variant === "product";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo isFixed={false} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <h1 className="text-xs uppercase tracking-[0.32em] text-slate-900">
          {isProduct ? text.productTitle : text.pageTitle}
        </h1>
        <p className="mt-5 max-w-md text-[11px] uppercase leading-6 tracking-[0.18em] text-slate-500">
          {isProduct ? text.productBody : text.pageBody}
        </p>
        <Link
          href={isProduct ? "/market" : "/"}
          className="mt-10 inline-flex border-b border-black pb-1 text-[11px] uppercase tracking-[0.24em] text-black transition hover:-translate-y-0.5"
        >
          {isProduct ? text.backToShop : text.backHome}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
