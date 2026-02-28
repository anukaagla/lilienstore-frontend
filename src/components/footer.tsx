"use client";

import Link from "next/link";
import { byLanguage, getLocalizedText } from "../lib/i18n";
import { useBrandState } from "./brand-provider";
import { SkeletonBlock } from "./page-skeletons";
import { useLanguage } from "./language-provider";

const instagramIcon = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" />
  </svg>
);

const emailIcon = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    <path d="m22 8-10 6L2 8" />
  </svg>
);

const facebookIcon = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M14 9h3V5h-3a4 4 0 0 0-4 4v3H7v4h3v4h4v-4h3l1-4h-4V9a1 1 0 0 1 1-1Z" />
  </svg>
);

const tiktokIcon = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M14 5v8.5a3.5 3.5 0 1 1-3.5-3.5" />
    <path d="M14 5c.6 1.8 2 3 4 3" />
  </svg>
);

const phoneIcon = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M6.5 4.5h3l1.2 3-1.8 1.8a15 15 0 0 0 5.8 5.8l1.8-1.8 3 1.2v3c0 1-1 2-2.2 2C10.4 19.5 4.5 13.6 4.5 6.7c0-1.2 1-2.2 2-2.2Z" />
  </svg>
);

const toSocialUrl = (value: string, platform: "instagram" | "facebook" | "tiktok") => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const cleaned = trimmed.replace(/^@/, "");
  if (platform === "instagram") return `https://www.instagram.com/${cleaned}`;
  if (platform === "facebook") return `https://www.facebook.com/${cleaned}`;
  return `https://www.tiktok.com/@${cleaned}`;
};

const footerLinks = [
  {
    label: {
      EN: "Shipping & Delivery",
      KA: "მიწოდება",
    },
    href: "/policies/shipping-and-delivery-policy",
  },
  {
    label: {
      EN: "Return & Refund",
      KA: "დაბრუნება და ანაზღაურება",
    },
    href: "/policies/return-and-refund-policy",
  },
  {
    label: {
      EN: "Privacy Policy",
      KA: "კონფიდენციალურობის პოლიტიკა",
    },
    href: "/policies/privacy-policy",
  },
  {
    label: {
      EN: "Terms & Conditions",
      KA: "წესები და პირობები",
    },
    href: "/policies/terms-of-service",
  },
];

type FooterProps = {
  variant?: "dark" | "light";
};

export default function Footer({ variant = "dark" }: FooterProps) {
  const isLight = variant === "light";
  const { language } = useLanguage();
  const { brand, isLoading: brandLoading } = useBrandState();
  const brandName = getLocalizedText(brand?.brand_name, language, "Lilienstore");
  const addressText = getLocalizedText(
    brand?.address,
    language,
    byLanguage(
      {
        EN: "29 Irakli Abashidze Street, Tbilisi, Georgia",
        KA: "ირაკლი აბაშიძის ქუჩა 29, თბილისი, საქართველო",
      },
      language
    )
  );
  const workingHoursText = getLocalizedText(
    brand?.working_hours,
    language,
    byLanguage({ EN: "12:00-20:00", KA: "12:00-20:00" }, language)
  );
  const emailValue = brand?.email?.trim() || "lilienspprt@gmail.com";
  const phoneValue = brand?.phone_number?.trim() || "";
  const instagramValue = toSocialUrl(
    brand?.instagram_url?.trim() || "lilienstore_",
    "instagram"
  );
  const facebookValue = toSocialUrl(brand?.facebook_url?.trim() || "", "facebook");
  const tiktokValue = toSocialUrl(brand?.tiktok_url?.trim() || "", "tiktok");
  const logoSrc = brand?.logo_url?.trim() || brand?.logo?.trim() || "/images/fotter-logo.png";
  const text = {
    instagram: byLanguage({ EN: "Instagram", KA: "ინსტაგრამი" }, language),
    facebook: byLanguage({ EN: "Facebook", KA: "ფეისბუქი" }, language),
    tiktok: byLanguage({ EN: "TikTok", KA: "ტიკტოკი" }, language),
    email: byLanguage({ EN: "Email", KA: "ელ.ფოსტა" }, language),
    phone: byLanguage({ EN: "Phone", KA: "ტელეფონი" }, language),
    store: byLanguage({ EN: "Store", KA: "მაღაზია" }, language),
    hours: byLanguage({ EN: "Working Hours", KA: "სამუშაო საათები" }, language),
    copyright: byLanguage(
      {
        EN: "© 2026. Designed with care. All rights reserved.",
        KA: "© 2026. შექმნილია ყურადღებით. ყველა უფლება დაცულია.",
      },
      language
    ),
  };
  const socialLinks = [
    {
      label: text.instagram,
      href: instagramValue,
      icon: instagramIcon,
    },
    ...(facebookValue
      ? [{ label: text.facebook, href: facebookValue, icon: facebookIcon }]
      : []),
    ...(tiktokValue ? [{ label: text.tiktok, href: tiktokValue, icon: tiktokIcon }] : []),
  ];
  const contactLinks = [
    {
      label: text.email,
      href: `mailto:${emailValue}`,
      value: emailValue,
      icon: emailIcon,
    },
    ...(phoneValue
      ? [{ label: text.phone, href: `tel:${phoneValue}`, value: phoneValue, icon: phoneIcon }]
      : []),
  ];

  return (
    <footer
      className={
        isLight
          ? "border-t-2 border-black bg-white text-slate-900"
          : "bg-[#0b0b0b] text-white"
      }
    >
      <div className="w-full px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {brandLoading ? (
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-9 w-16 rounded-2xl" />
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <img
                    src={logoSrc}
                    alt={`${brandName} logo`}
                    className="h-9 w-auto object-contain"
                  />
                  <span className="font-display text-sm font-bold uppercase tracking-[0.3em] text-[#A79974]">
                    {brandName}
                  </span>
                </div>
              )}
              <span
                className={`h-px w-32 ${isLight ? "bg-slate-900/20" : "bg-white/35"}`}
              />
            </div>
            <div
              className={`flex items-center gap-4 ${
                isLight ? "text-black" : "text-white/80"
              }`}
            >
              {brandLoading
                ? Array.from({ length: 3 }, (_, index) => (
                    <SkeletonBlock
                      key={index}
                      className="h-6 w-6 rounded-full"
                    />
                  ))
                : socialLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      className={`transition ${isLight ? "hover:text-black" : "hover:text-white"}`}
                    >
                      {item.icon}
                    </a>
                  ))}
            </div>
            {brandLoading ? (
              <>
                <SkeletonBlock className="h-4 w-full max-w-md rounded-full" />
                <SkeletonBlock className="h-4 w-52 rounded-full" />
              </>
            ) : (
              <>
                <p
                  className={`text-[11px] tracking-[0.16em] ${
                    isLight ? "font-semibold text-black" : "text-white/60"
                  }`}
                >
                  {text.store}: {addressText}
                </p>
                <p
                  className={`text-[11px] tracking-[0.16em] ${
                    isLight ? "font-semibold text-black" : "text-white/60"
                  }`}
                >
                  {text.hours}: {workingHoursText}
                </p>
              </>
            )}
            <div className="flex flex-col gap-2">
              {brandLoading
                ? (
                    <>
                      <SkeletonBlock className="h-4 w-52 rounded-full" />
                      <SkeletonBlock className="h-4 w-40 rounded-full" />
                    </>
                  )
                : contactLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className={`inline-flex items-center gap-2 text-[11px] tracking-[0.16em] transition ${
                        isLight ? "font-semibold text-black hover:text-black/70" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {item.icon}
                      <span>{item.value}</span>
                    </a>
                  ))}
            </div>
          </div>

          <nav
            className={`flex flex-col items-start gap-3 text-[11px] tracking-[0.16em] md:flex-row md:items-center ${
              isLight ? "font-semibold text-black" : "text-white/70"
            }`}
          >
            {footerLinks.map((item, index) => (
              <div key={item.href} className="flex items-center gap-3">
                <Link
                  href={item.href}
                  className={`transition ${isLight ? "hover:text-black" : "hover:text-white"}`}
                >
                  {item.label[language]}
                </Link>
                {index < footerLinks.length - 1 ? (
                  <span
                    className={`hidden h-3 w-px md:inline-block ${
                      isLight ? "bg-slate-900/20" : "bg-white/30"
                    }`}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            ))}
          </nav>
        </div>

        <p
          className={`mt-8 text-center text-[11px] tracking-[0.16em] ${
            isLight ? "font-semibold text-black" : "text-white/60"
          }`}
        >
          {text.copyright}
        </p>
      </div>
    </footer>
  );
}
