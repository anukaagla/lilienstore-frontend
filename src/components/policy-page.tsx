"use client";

import { getLocalizedText, type Language } from "../lib/i18n";
import type { Brand } from "../types/brand";
import Footer from "./footer";
import SiteHeader from "./site-header";
import { useBrand } from "./brand-provider";
import { useLanguage } from "./language-provider";

type PolicyKey =
  | "privacy_policy"
  | "terms_of_service"
  | "return_and_refund_policy"
  | "shipping_and_delivery_policy";

type PolicyPageProps = {
  title: { EN: string; KA: string };
  policyKey: PolicyKey;
  fallbackText?: { EN: string; KA: string };
};

const resolvePolicyText = (
  brand: Brand | null,
  policyKey: PolicyKey,
  language: Language
) => {
  const policy = brand?.[policyKey];
  return getLocalizedText(policy, language, "");
};

export default function PolicyPage({
  title,
  policyKey,
  fallbackText = {
    EN: "This policy is not available yet.",
    KA: "ეს პოლიტიკა ჯერ მიუწვდომელია.",
  },
}: PolicyPageProps) {
  const { language } = useLanguage();
  const brand = useBrand();
  const policyText = resolvePolicyText(brand, policyKey, language);
  const sections = policyText
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo />
      <main className="mx-auto flex-1 w-full max-w-4xl px-5 pb-24 pt-28">
        <div className="h-px w-full bg-black" />
        <section className="mt-12 space-y-8">
          <h1 className="text-center text-2xl font-semibold uppercase tracking-[0.2em] text-[#A79974] md:text-3xl">
            {title[language]}
          </h1>
          {sections.length > 0 ? (
            <div className="space-y-6 text-sm leading-7 tracking-[0.01em] text-slate-700 md:text-base">
              {sections.map((section, index) => (
                <p key={`${policyKey}-${index}`}>{section}</p>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm uppercase tracking-[0.2em] text-slate-500">
              {fallbackText[language]}
            </p>
          )}
        </section>
      </main>
      <Footer variant="light" />
    </div>
  );
}
