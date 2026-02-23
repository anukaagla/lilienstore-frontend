"use client";

import Footer from "./footer";
import { byLanguage, getLocalizedText } from "../lib/i18n";
import SiteHeader from "./site-header";
import { useBrand } from "./brand-provider";
import { useLanguage } from "./language-provider";

export default function AboutUs() {
  const { language } = useLanguage();
  const brand = useBrand();
  const brandName = getLocalizedText(brand?.brand_name, language, "Lilien");
  const brandNameUpper = brandName.toUpperCase();
  const description = getLocalizedText(brand?.description, language, "");
  const text = {
    fallbackIntroFirst: byLanguage(
      {
        EN: `${brandNameUpper} is a fashion brand born in Tbilisi, created for those who value elegance, quality, and individuality.`,
        KA: `${brandNameUpper} არის თბილისში დაბადებული მოდის ბრენდი, მათთვის ვინც აფასებს ელეგანტურობას, ხარისხსა და ინდივიდუალობას.`,
      },
      language
    ),
    fallbackIntroSecond: byLanguage(
      {
        EN: `Every ${brandNameUpper} piece is thoughtfully designed and crafted in-house — from the first sketch to the final stitch. We work with premium fabrics, focusing on refined silhouettes, timeless designs, and limited-edition collections that feel personal and truly unique.`,
        KA: `ყოველი ${brandNameUpper}-ის ნივთი იქმნება განსაკუთრებული ყურადღებით — პირველი ესკიზიდან საბოლოო ნაკერამდე. ვმუშაობთ პრემიუმ ქსოვილებით და ვქმნით დახვეწილ სილუეტებს, დროისმიღმა დიზაინებსა და ლიმიტირებულ კოლექციებს.`,
      },
      language
    ),
    fallbackSimple: byLanguage(
      { EN: "Our philosophy is simple:", KA: "ჩვენი ფილოსოფია მარტივია:" },
      language
    ),
    fallbackBody: byLanguage(
      {
        EN: `fashion should empower, inspire confidence, and feel effortless. ${brandNameUpper} is not about trends — it's about creating pieces that become part of your story.`,
        KA: `მოდა უნდა გაძლიერებდეს, თავდაჯერებას მატებდეს და ბუნებრივად გეხამოს. ${brandNameUpper} ტრენდებზე არაა — ეს არის შენი ისტორიის ნაწილი გახდეს.`,
      },
      language
    ),
    fallbackWelcome: byLanguage(
      {
        EN: `Welcome to ${brandNameUpper} — where elegance meets intention.`,
        KA: `კეთილი იყოს შენი მობრძანება ${brandNameUpper}-ში — სადაც ელეგანტურობა აზრს ხვდება.`,
      },
      language
    ),
  };
  const descriptionParts = description
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const hasDescription = descriptionParts.length > 0;
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo />
      <main className="mx-auto flex-1 w-full max-w-6xl px-5 pb-24 pt-28">
        <div className="h-px w-full bg-black" />
        <section className="mt-16 space-y-12 lg:space-y-16">
          <div className="grid items-center gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
            <div className="mx-auto max-w-[480px] space-y-6 text-center text-[20px] leading-[1.95] text-slate-600 xl:mx-0 xl:max-w-[520px] xl:text-left xl:-translate-y-2">
              {hasDescription ? (
                descriptionParts.slice(0, 2).map((paragraph, index) => (
                  <p key={`intro-${index}`} className="font-display font-semibold">
                    {paragraph}
                  </p>
                ))
              ) : (
                <>
                  <p className="font-display font-semibold">
                    {text.fallbackIntroFirst}
                  </p>
                  <p className="font-display font-semibold">
                    {text.fallbackIntroSecond}
                  </p>
                </>
              )}
            </div>
            <img
              src="/images/aboutus1.png"
              alt={`${brandName} evening look`}
              className="mx-auto hidden w-full max-w-[320px] xl:mx-0 xl:block xl:justify-self-start"
              loading="lazy"
            />
          </div>

          <div className="grid items-center gap-10 xl:grid-cols-[380px_minmax(0,1fr)] xl:gap-14">
            <img
              src="/images/aboutus2.png"
              alt={`${brandName} studio portrait`}
              className="mx-auto w-full max-w-[380px] xl:mx-0 xl:justify-self-start"
              loading="lazy"
            />
            <div className="mx-auto flex max-w-[480px] flex-col justify-center space-y-6 text-center text-[20px] leading-[1.95] text-slate-600 xl:justify-self-end xl:text-left">
              {hasDescription ? (
                descriptionParts.slice(2).map((paragraph, index) => (
                  <p
                    key={`outro-${index}`}
                    className="font-display font-semibold"
                  >
                    {paragraph}
                  </p>
                ))
              ) : (
                <>
                  <p className="font-display font-semibold">
                    {text.fallbackSimple}
                  </p>
                  <p className="font-display font-semibold">
                    {text.fallbackBody}
                  </p>
                  <p className="font-display font-semibold">
                    {text.fallbackWelcome}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
