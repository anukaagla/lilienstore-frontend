"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { byLanguage, getLocalizedText } from "../lib/i18n";
import { useBrandState } from "./brand-provider";
import { useLanguage } from "./language-provider";
import type { BlogPost } from "../types/blog";
import Footer from "./footer";
import { HomePageSkeleton } from "./page-skeletons";
import SiteHeader from "./site-header";

type ShowRoomProps = {
  posts?: BlogPost[];
};

const Divider = () => (
  <div className="relative left-1/2 w-screen -translate-x-1/2">
    <div className="mx-auto h-px w-[calc(100%-160px)] bg-black" />
  </div>
);

export default function ShowRoom({ posts }: ShowRoomProps) {
  const { language } = useLanguage();
  const { brand, isLoading: brandLoading } = useBrandState();
  const brandName = getLocalizedText(brand?.brand_name, language, "Lilien");
  const logoSrc = brand?.logo_url?.trim() || brand?.logo?.trim() || "/images/Logo.png";
  const heroSrc =
    brand?.hero_image_url?.trim() || brand?.hero_image?.trim() || "/images/HERO IMAGE.png";
  const mobileHeroSrc =
    brand?.hero_image_url?.trim() || brand?.hero_image?.trim() || "/images/aboutus1.png";
  const text = {
    shopNow: byLanguage({ EN: "Shop Now", KA: "შეიძინე" }, language),
    seeMore: byLanguage({ EN: "See more", KA: "მეტის ნახვა" }, language),
    blogPostCover: byLanguage({ EN: "Blog post cover", KA: "ბლოგის ფოტო" }, language),
    homeHeading: byLanguage(
      { EN: `${brandName} Fashion Showroom`, KA: `${brandName} შოურუმი` },
      language
    ),
    mainShowroom: byLanguage(
      { EN: "Main fashion showroom", KA: "მთავარი შოურუმი" },
      language
    ),
  };
  const resolvedPosts = posts ?? [];
  const [visibleCount, setVisibleCount] = useState(3);

  const visiblePosts = resolvedPosts.slice(0, visibleCount);
  const canShowMore = visibleCount < resolvedPosts.length;

  if (brandLoading && !brand) {
    return <HomePageSkeleton />;
  }

  const renderPost = (post: BlogPost, index: number) => {
    const layoutIndex = index % 3;
    const title = getLocalizedText(post.title, language, "");
    const content = getLocalizedText(post.content, language, "");
    const coverImage = post.cover_image || "/images/BB.png";
    const animationDelay = `${220 + index * 120}ms`;

    if (layoutIndex === 1) {
      return (
        <section
          key={post.id}
          className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-8 text-center opacity-0 sm:min-h-screen sm:gap-8 sm:py-0 animate-[fade-up_0.9s_ease-out_forwards]"
          style={{ animationDelay }}
        >
          <div className="w-full max-w-xl">
            <Image
              className="h-[300px] w-full rounded-3xl object-cover shadow-[0_30px_60px_-40px_rgba(0,0,0,0.45)] sm:h-[360px] md:h-[440px]"
              src={coverImage}
              alt={title || text.blogPostCover}
              width={1200}
              height={1600}
              sizes="(min-width: 1024px) 42rem, 100vw"
            />
          </div>
          <div className="max-w-2xl">
            
            <h2 className="mt-3 text-2xl font-semibold sm:mt-4 sm:text-3xl md:text-4xl">
              {title}
            </h2>
            <p className="mt-3 text-sm text-slate-900 sm:mt-4 sm:text-base md:text-lg">
              {content}
            </p>
          </div>
        </section>
      );
    }

    if (layoutIndex === 2) {
      return (
        <section
          key={post.id}
          className="grid min-h-[70vh] place-items-center gap-8 py-8 opacity-0 sm:min-h-screen sm:gap-10 sm:py-0 md:grid-cols-2 animate-[fade-up_0.9s_ease-out_forwards]"
          style={{ animationDelay }}
        >
          <div className="w-full">
            <Image
              className="h-[360px] w-full rounded-3xl object-cover shadow-[0_28px_60px_-42px_rgba(0,0,0,0.45)] sm:h-[460px] md:h-[540px]"
              src={coverImage}
              alt={title || text.blogPostCover}
              width={1200}
              height={1600}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
          <div className="flex flex-col items-center justify-center md:h-[360px]">
            <h2 className="mt-3 text-center text-2xl font-semibold sm:mt-4 sm:text-3xl md:text-4xl">
              {title}
            </h2>
            <p className="mt-3 max-w-[380px] text-center text-sm text-slate-900 sm:mt-4 sm:text-left sm:text-base md:text-lg">
              {content}
            </p>
          </div>
        </section>
      );
    }

    return (
      <section
        key={post.id}
        className="grid min-h-[70vh] place-items-center gap-8 py-8 opacity-0 sm:min-h-screen sm:gap-10 sm:py-0 md:grid-cols-2 animate-[fade-up_0.9s_ease-out_forwards]"
        style={{ animationDelay }}
      >
        <div className="w-full md:order-2">
          <Image
            className="h-[320px] w-full rounded-3xl object-cover shadow-[0_28px_60px_-42px_rgba(0,0,0,0.45)] sm:h-[420px] md:h-[460px]"
            src={coverImage}
            alt={title || text.blogPostCover}
            width={1200}
            height={1600}
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </div>
        <div className="flex flex-col items-center justify-center md:order-1 md:h-[360px]">
          <h2 className="mt-3 text-center text-2xl font-semibold sm:mt-4 sm:text-3xl md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 max-w-[380px] text-center text-sm text-slate-900 sm:mt-4 sm:text-left sm:text-base md:text-lg">
            {content}
          </p>
        </div>
      </section>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <SiteHeader />


      <main className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pt-24 sm:px-6 md:pt-0">
        <h1 className="sr-only">{text.homeHeading}</h1>
        <section
          className="flex min-h-[70vh] w-full items-center justify-center py-8 opacity-0 sm:min-h-screen sm:py-0 animate-[fade-up_0.9s_ease-out_forwards]"
          style={{ animationDelay: "120ms" }}
        >
          <div className="w-full max-w-5xl">
            <div className="flex justify-center sm:hidden">
              <div className="relative inline-flex max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl shadow-[0_30px_60px_-40px_rgba(0,0,0,0.45)]">
                <Image
                  className="block h-auto max-h-[70vh] w-auto max-w-full"
                  src={mobileHeroSrc}
                  alt={`${brandName} hero`}
                  width={1080}
                  height={1440}
                  sizes="(max-width: 639px) calc(100vw - 2rem), 0px"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 pb-12 text-center">
                  <Image
                    className="h-40 w-full max-w-[240px] object-contain"
                    src={logoSrc}
                    alt={`${brandName} logo`}
                    width={480}
                    height={240}
                    sizes="240px"
                  />
                  <Link
                    href="/market"
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-10 py-3 text-base font-semibold uppercase tracking-[0.18em] text-slate-900 shadow-[0_10px_20px_-12px_rgba(0,0,0,0.5)]"
                  >
                    {text.shopNow}
                  </Link>
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-6 sm:grid sm:grid-cols-2">
              <div className="justify-self-center sm:justify-self-start">
                <Image
                  className="block h-auto max-h-[72vh] w-auto max-w-full rounded-3xl shadow-[0_30px_60px_-40px_rgba(0,0,0,0.45)]"
                  src={heroSrc}
                  alt={text.mainShowroom}
                  width={1200}
                  height={1600}
                  sizes="(min-width: 640px) 44vw, 0px"
                />
              </div>
              <div className="flex h-full flex-col items-center justify-center gap-5 sm:gap-6 pb-10">
                <Image
                  className="h-[180px] w-full max-w-[280px] object-contain sm:h-[220px] sm:max-w-[320px] md:h-[260px]"
                  src={logoSrc}
                  alt={`${brandName} logo`}
                  width={640}
                  height={320}
                  sizes="320px"
                />
                <Link
                  href="/market"
                  className="relative flex items-center justify-center rounded-full border border-white/60 bg-[#A79974]/85 px-12 py-4 text-lg font-semibold uppercase tracking-[0.18em] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),_0_14px_30px_-18px_rgba(0,0,0,0.65)] backdrop-blur-md transition hover:translate-y-[-1px]"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/70 via-white/10 to-transparent opacity-70" />
                  <span className="pointer-events-none absolute -top-6 left-10 h-12 w-40 rotate-12 rounded-full bg-white/50 blur-xl" />
                  <span className="relative z-10 flex items-center gap-3">
                    <span>{text.shopNow}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 17L17 7" />
                      <path d="M8 7h9v9" />
                    </svg>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="relative left-1/2 w-screen -translate-x-1/2 -mt-[20px] md:-mt-[50px]">
          <div className="mx-auto h-px w-[calc(100%-160px)] bg-black" />
        </div>

        {visiblePosts.map((post, index) => (
          <div key={post.id}>
            {renderPost(post, index)}
            {index !== visiblePosts.length - 1 ? <Divider /> : null}
          </div>
        ))}

        {canShowMore ? (
          <>
            <Divider />
            <div className="flex justify-center py-10">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + 3, resolvedPosts.length)
                  )
                }
                className="rounded-full border border-black/20 bg-white/90 px-10 py-3 text-xs uppercase tracking-[0.3em] text-slate-700 shadow-[0_16px_28px_-18px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5"
              >
                {text.seeMore}
              </button>
            </div>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
