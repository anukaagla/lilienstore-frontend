"use client";

import { getLocalizedText, type Language } from "../lib/i18n";
import type { Brand } from "../types/brand";
import Footer from "./footer";
import SiteHeader from "./site-header";
import { useBrandState } from "./brand-provider";
import { useLanguage } from "./language-provider";
import { StaticContentPageSkeleton } from "./page-skeletons";

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

type ParsedNumberedPolicy = {
  intro: string[];
  items: string[];
};

const resolvePolicyText = (
  brand: Brand | null,
  policyKey: PolicyKey,
  language: Language
) => {
  const policy = brand?.[policyKey];
  return getLocalizedText(policy, language, "");
};

const splitTextBlocks = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

const parseNumberedPolicy = (value: string): ParsedNumberedPolicy | null => {
  const normalized = value.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return null;
  }

  const matches = Array.from(normalized.matchAll(/(^|\s)(\d+)\.\s+/g));

  if (matches.length === 0) {
    return null;
  }

  const numbers = matches.map((match) => Number(match[2]));
  const hasSequentialNumbers = numbers.every((number, index) =>
    index === 0 ? number === 1 : number === numbers[index - 1] + 1
  );

  if (!hasSequentialNumbers) {
    return null;
  }

  const firstPrefixIndex = (matches[0].index ?? 0) + matches[0][1].length;
  const intro = splitTextBlocks(normalized.slice(0, firstPrefixIndex));
  const items = matches
    .map((match, index) => {
      const leadingWhitespace = match[1];
      const prefixIndex = (match.index ?? 0) + leadingWhitespace.length;
      const prefixLength = match[0].length - leadingWhitespace.length;
      const contentStart = prefixIndex + prefixLength;
      const nextMatch = matches[index + 1];
      const nextPrefixIndex = nextMatch
        ? (nextMatch.index ?? 0) + nextMatch[1].length
        : normalized.length;

      return normalized.slice(contentStart, nextPrefixIndex).trim();
    })
    .filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return { intro, items };
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
  const { brand, isLoading: brandLoading } = useBrandState();

  if (brandLoading && !brand) {
    return <StaticContentPageSkeleton />;
  }

  const policyText = resolvePolicyText(brand, policyKey, language);
  const numberedPolicy = parseNumberedPolicy(policyText);
  const sections = numberedPolicy ? [] : splitTextBlocks(policyText);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo />
      <main className="mx-auto flex-1 w-full max-w-4xl px-5 pb-24 pt-28">
        <div className="h-px w-full bg-black" />
        <section className="mt-12 space-y-8">
          <h1 className="text-center text-2xl font-semibold uppercase tracking-[0.2em] text-[#A79974] md:text-3xl">
            {title[language]}
          </h1>
          {numberedPolicy ? (
            <div className="space-y-8 text-sm leading-7 tracking-[0.01em] text-slate-700 md:text-base">
              {numberedPolicy.intro.length > 0 ? (
                <div className="space-y-4">
                  {numberedPolicy.intro.map((section, index) => (
                    <p key={`${policyKey}-intro-${index}`}>{section}</p>
                  ))}
                </div>
              ) : null}
              <ol className="list-decimal space-y-5 pl-5 marker:font-semibold marker:text-[#A79974] md:pl-6">
                {numberedPolicy.items.map((item, index) => (
                  <li key={`${policyKey}-item-${index}`} className="pl-1">
                    <div className="space-y-3">
                      {splitTextBlocks(item).map((paragraph, paragraphIndex) => (
                        <p
                          key={`${policyKey}-item-${index}-paragraph-${paragraphIndex}`}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : sections.length > 0 ? (
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
