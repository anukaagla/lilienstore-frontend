"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { byLanguage, getLocalizedText } from "../lib/i18n";
import { buildCategoryHref } from "../lib/catalog-routing";
import {
  getHomeCollectionHeroImage,
  getHomeCollectionMobileHeroImage,
} from "../lib/home-collection";
import {
  FOOTER_NEWSLETTER_HIDDEN_SESSION_KEY,
  NEWSLETTER_DISMISSED_SESSION_KEY,
  isValidNewsletterEmail,
} from "../lib/newsletter";
import { useBrandState } from "./brand-provider";
import { useLanguage } from "./language-provider";
import type { BlogPost } from "../types/blog";
import Footer from "./footer";
import { HomePageSkeleton } from "./page-skeletons";
import SiteHeader from "./site-header";

type ShowRoomProps = {
  posts?: BlogPost[];
};

type InstagramEmbed = {
  id: number;
  post_url: string;
  embed_html: string;
  updated_at: string;
};

const Divider = () => (
  <div className="relative left-1/2 w-screen -translate-x-1/2">
    <div className="mx-auto h-px w-[calc(100%-48px)] bg-black/15 sm:w-[calc(100%-120px)] lg:w-[calc(100%-180px)]" />
  </div>
);

const InstagramEmbedsSection = memo(function InstagramEmbedsSection({
  embeds,
}: {
  embeds: InstagramEmbed[];
}) {
  if (!embeds.length) {
    return null;
  }

  return (
    <>
      <Divider />
      <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-10 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {embeds.map((embed, index) => (
            <article
              key={`${embed.id}-${embed.post_url || index}`}
              className="rounded-[1.75rem] border border-black/10 bg-white/80 p-3 shadow-[0_18px_42px_-36px_rgba(0,0,0,0.58)]"
            >
              <div
                className="mx-auto w-full max-w-[calc(100%-43px)] sm:max-w-[560px] [&_blockquote.instagram-media]:!m-0 [&_blockquote.instagram-media]:!min-w-0 [&_blockquote.instagram-media]:!w-full [&_blockquote.instagram-media]:max-w-full"
                dangerouslySetInnerHTML={{ __html: embed.embed_html }}
              />
            </article>
          ))}
        </div>
      </section>
    </>
  );
});

const INITIAL_NEWSLETTER_POPUP_DELAY_MS = 1600;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const NEWSLETTER_SUBSCRIBE_PATH = "/api/proxy/newsletter/subscribe/";
const INSTAGRAM_EMBEDS_PATH = "/api/instagram/embeds/";
const INSTAGRAM_EMBED_SCRIPT_URL = "https://www.instagram.com/embed.js";
const SUCCESS_TYPING_INTERVAL_MS = 50;
const SUCCESS_DESCRIPTION_DELAY_MS = 500;
const HEADER_TONE_SWITCH_OFFSET_PX = 96;

function SuccessMessageBlock({
  text,
  description,
  className,
  descriptionClassName,
}: {
  text: string;
  description: string;
  className: string;
  descriptionClassName: string;
}) {
  const [typedText, setTypedText] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    let nextIndex = 0;
    let descriptionTimer: number | null = null;
    const typingTimer = window.setInterval(() => {
      nextIndex += 1;
      setTypedText(text.slice(0, nextIndex));

      if (nextIndex >= text.length) {
        window.clearInterval(typingTimer);
        descriptionTimer = window.setTimeout(() => {
          setShowDescription(true);
        }, SUCCESS_DESCRIPTION_DELAY_MS);
      }
    }, SUCCESS_TYPING_INTERVAL_MS);

    return () => {
      window.clearInterval(typingTimer);
      if (descriptionTimer) {
        window.clearTimeout(descriptionTimer);
      }
    };
  }, [text]);

  return (
    <div className="flex max-w-md flex-col items-center text-center">
      <p aria-live="polite" className={className}>
        {typedText}
      </p>
      {showDescription ? (
        <p className={`${descriptionClassName} animate-[fadeIn_650ms_ease-out]`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

const getString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  return fallback;
};

const getNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const normalizeInstagramEmbeds = (payload: unknown): InstagramEmbed[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item),
    )
    .map((entry, index) => ({
      id: getNumber(entry.id, index + 1),
      post_url: getString(entry.post_url, ""),
      embed_html: getString(entry.embed_html, ""),
      updated_at: getString(entry.updated_at, ""),
    }))
    .filter((entry) => entry.embed_html.length > 0);
};

const fetchInstagramEmbeds = async (signal?: AbortSignal): Promise<InstagramEmbed[]> => {
  if (!API_BASE_URL) {
    return [];
  }

  try {
    const requestUrl = new URL(INSTAGRAM_EMBEDS_PATH, API_BASE_URL);
    const response = await fetch(requestUrl.toString(), {
      method: "GET",
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return normalizeInstagramEmbeds(payload);
  } catch {
    return [];
  }
};

type NewsletterSubscribeResult =
  | { ok: true }
  | { ok: false; message: string };

const getNewsletterApiMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  const parts = Object.entries(payload as Record<string, unknown>)
    .map(([field, value]) => {
      if (typeof value === "string" && value.trim()) {
        return `${field}: ${value}`;
      }

      if (Array.isArray(value)) {
        const firstText = value.find(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
        );
        if (firstText) {
          return `${field}: ${firstText}`;
        }
      }

      return null;
    })
    .filter((value): value is string => Boolean(value));

  return parts[0] ?? fallback;
};

const subscribeToNewsletter = async (
  email: string,
  fallbackMessage: string,
): Promise<NewsletterSubscribeResult> => {
  try {
    const response = await fetch(NEWSLETTER_SUBSCRIBE_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      return { ok: true };
    }

    const payload = await response.json().catch(() => null);
    return {
      ok: false,
      message: getNewsletterApiMessage(payload, fallbackMessage),
    };
  } catch {
    return { ok: false, message: fallbackMessage };
  }
};

export default function ShowRoom({ posts }: ShowRoomProps) {
  const { language } = useLanguage();
  const { brand, isLoading: brandLoading } = useBrandState();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandName = getLocalizedText(brand?.brand_name, language, "Lilien");
  const collectionTitle = getLocalizedText(
    brand?.hero_title ?? brand?.home_collection?.title,
    language,
    "New Collection Is Here"
  );
  const collectionViewMoreLabel = getLocalizedText(
    brand?.home_collection?.view_more_label,
    language,
    "View More"
  );
  const collectionViewAllProductsLabel = getLocalizedText(
    brand?.home_collection?.view_all_products_label,
    language,
    "View All Products"
  );
  const collectionHeroSrc = getHomeCollectionHeroImage(brand);
  const collectionMobileHeroSrc = getHomeCollectionMobileHeroImage(brand);
  const collectionViewMoreHref = buildCategoryHref({
    slug: brand?.hero_category?.slug,
    catalogBasePath: "/market",
    pathname,
    searchParams,
  });
  const newsletterPopupImageSrc =
    brand?.newsletter_signup_popup_image_url?.trim() ||
    brand?.newsletter_signup_popup_image?.trim() ||
    "/images/newsletter-pic.png";
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
  const heroText = {
    homeHeading: `${brandName} ${collectionTitle}`.trim(),
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const footerSignupText = {
    title: byLanguage(
      { EN: "Sign Up To Our Newsletter", KA: "გამოიწერე ჩვენი ნიუსლეთერი" },
      language
    ),
    button: byLanguage({ EN: "Subscribe", KA: "გამოწერა" }, language),
    placeholder: byLanguage(
      { EN: "ENTER YOUR EMAIL", KA: "შეიყვანე შენი ელფოსტა" },
      language
    ),
  };
  const newsletterSuccessText = byLanguage(
    { EN: "Thank you for subscribing!", KA: "გმადლობთ, რომ გამოიწერეთ!" },
    language
  );
  const newsletterSuccessDescription = byLanguage(
    {
      EN: "You’ll be first to hear about new pieces, special releases, and exclusive news.",
      KA: "თქვენ პირველი შეიტყობთ ახალი ნივთების, განსაკუთრებული გამოშვებების და ექსკლუზიური სიახლეების შესახებ.",
    },
    language
  );
  const newsletterText = {
    title: byLanguage(
      { EN: "SIGN UP ON NEWSLETTER", KA: "გამოიწერე ნიუსლეთერი" },
      language
    ),
    heading: byLanguage(
      { EN: "DISCOVER LILIEN FIRST", KA: "აღმოაჩინე LILIEN პირველი" },
      language
    ),
    description: byLanguage(
      {
        EN: "Be the first to discover new collections, curated pieces, and showroom updates.",
        KA: "პირველმა გაიგე ახალი კოლექციების, შერჩეული ნივთებისა და showroom-ის სიახლეების შესახებ.",
      },
      language
    ),
    emailPlaceholder: byLanguage(
      { EN: "ENTER YOUR EMAIL", KA: "შეიყვანე შენი ელფოსტა" },
      language
    ),
    signUp: byLanguage({ EN: "SIGN UP", KA: "გამოწერა" }, language),
    privacyPrefix: byLanguage(
      { EN: "BY SIGNING UP YOU AGREE TO OUR", KA: "რეგისტრაციით ეთანხმები ჩვენს" },
      language
    ),
    privacyLabel: byLanguage(
      { EN: "PRIVACY POLICY", KA: "კონფიდენციალურობის პოლიტიკას" },
      language
    ),
    invalidEmail: byLanguage(
      { EN: "Please enter a valid email address.", KA: "გთხოვ, სწორად შეიყვანე ელფოსტა." },
      language
    ),
    success: byLanguage(
      {
        EN: "Thank you for subscribing!",
        KA: "გამოწერა დასრულებულია.",
      },
      language
    ),
    successDescription: byLanguage(
      {
        EN: "You’ll be first to hear about new pieces, special releases, and exclusive news.",
        KA: "თქვენ პირველი შეიტყობთ ახალი ნივთების, განსაკუთრებული გამოშვებების და ექსკლუზიური სიახლეების შესახებ.",
      },
      language
    ),
    failed: byLanguage(
      {
        EN: "Subscription could not be completed.",
        KA: "გამოწერა ვერ შესრულდა.",
      },
      language
    ),
    close: byLanguage({ EN: "Close newsletter", KA: "ნიუსლეთერის დახურვა" }, language),
    imageAlt: byLanguage({ EN: "Newsletter preview", KA: "ნიუსლეთერის ფოტო" }, language),
  };
  const resolvedPosts = posts ?? [];
  const [visibleCount, setVisibleCount] = useState(3);
  const [newsletterVisible, setNewsletterVisible] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterSuccess, setNewsletterSuccess] = useState<string | null>(null);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [instagramEmbeds, setInstagramEmbeds] = useState<InstagramEmbed[]>([]);
  const [headerTone, setHeaderTone] = useState<"light" | "dark">("light");
  const heroSectionRef = useRef<HTMLElement | null>(null);

  const visiblePosts = resolvedPosts.slice(0, visibleCount);
  const canShowMore = visibleCount < resolvedPosts.length;

  const processInstagramEmbeds = () => {
    if (typeof window === "undefined") {
      return;
    }

    const instagramWindow = window as Window & {
      instgrm?: {
        Embeds?: {
          process?: () => void;
        };
      };
    };
    instagramWindow.instgrm?.Embeds?.process?.();
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.sessionStorage.getItem(NEWSLETTER_DISMISSED_SESSION_KEY);
    if (dismissed !== "true") {
      const openTimer = window.setTimeout(() => {
        setNewsletterVisible(true);
      }, INITIAL_NEWSLETTER_POPUP_DELAY_MS);

      return () => {
        window.clearTimeout(openTimer);
      };
    }
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      !newsletterVisible
    ) {
      return;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      touchAction: body.style.touchAction,
    };
    const previousHtmlStyles = {
      overflow: documentElement.style.overflow,
      overscrollBehavior: documentElement.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.touchAction = "none";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyStyles.overflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.width = previousBodyStyles.width;
      body.style.touchAction = previousBodyStyles.touchAction;
      documentElement.style.overflow = previousHtmlStyles.overflow;
      documentElement.style.overscrollBehavior = previousHtmlStyles.overscrollBehavior;
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [newsletterVisible]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateHeaderTone = () => {
      const heroBottom = heroSectionRef.current?.getBoundingClientRect().bottom ?? Infinity;
      setHeaderTone(heroBottom <= HEADER_TONE_SWITCH_OFFSET_PX ? "dark" : "light");
    };

    updateHeaderTone();
    window.addEventListener("scroll", updateHeaderTone, { passive: true });
    window.addEventListener("resize", updateHeaderTone);

    return () => {
      window.removeEventListener("scroll", updateHeaderTone);
      window.removeEventListener("resize", updateHeaderTone);
    };
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const loadInstagramEmbeds = async () => {
      const embeds = await fetchInstagramEmbeds(abortController.signal);
      if (!abortController.signal.aborted) {
        setInstagramEmbeds(embeds);
      }
    };

    void loadInstagramEmbeds();

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (!instagramEmbeds.length || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const triggerInstagramRender = () => {
      processInstagramEmbeds();
    };

    const existingScript = document.querySelector(
      `script[src="${INSTAGRAM_EMBED_SCRIPT_URL}"]`,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      const instagramWindow = window as Window & {
        instgrm?: {
          Embeds?: {
            process?: () => void;
          };
        };
      };
      if (instagramWindow.instgrm?.Embeds?.process) {
        triggerInstagramRender();
        return;
      }

      existingScript.addEventListener("load", triggerInstagramRender);
      return () => {
        existingScript.removeEventListener("load", triggerInstagramRender);
      };
    }

    const script = document.createElement("script");
    script.src = INSTAGRAM_EMBED_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", triggerInstagramRender);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", triggerInstagramRender);
    };
  }, [instagramEmbeds]);

  if (brandLoading && !brand) {
    return <HomePageSkeleton />;
  }

  const closeNewsletter = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(NEWSLETTER_DISMISSED_SESSION_KEY, "true");
    }
    setNewsletterVisible(false);
    setNewsletterError(null);
  };

  const hideFooterSignupStrip = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(FOOTER_NEWSLETTER_HIDDEN_SESSION_KEY, "true");
      window.dispatchEvent(new Event("lilien-footer-newsletter-hide"));
    }
  };

  const handleNewsletterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = newsletterEmail.trim();

    if (!isValidNewsletterEmail(normalizedEmail)) {
      setNewsletterError(newsletterText.invalidEmail);
      setNewsletterSuccess(null);
      return;
    }

    if (newsletterSubmitting) {
      return;
    }

    setNewsletterError(null);
    setNewsletterSuccess(null);
    setNewsletterSubmitting(true);

    try {
      const result = await subscribeToNewsletter(normalizedEmail, newsletterText.failed);
      if (result.ok) {
        setNewsletterError(null);
        setNewsletterSuccess(newsletterSuccessText);
        setNewsletterEmail("");
        hideFooterSignupStrip();
        return;
      }

      setNewsletterSuccess(null);
      setNewsletterError(result.message);
    } finally {
      setNewsletterSubmitting(false);
    }
  };

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
    <div className="relative min-h-screen overflow-hidden bg-[#f6f1e8] text-slate-900">
      <SiteHeader headerTone={headerTone} />

      {newsletterVisible ? (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label={newsletterText.close}
            onClick={closeNewsletter}
            className="absolute inset-0 bg-[rgba(9,7,5,0.28)] backdrop-blur-[10px]"
          />
          <div className="absolute left-1/2 top-1/2 z-[121] w-[calc(100vw-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 px-1 sm:w-[calc(100vw-2rem)] sm:px-0">
            <section className="relative max-h-[calc(70svh+59px)] overflow-y-auto rounded-[1.6rem] border border-[#9a9389] bg-white shadow-[0_34px_90px_-40px_rgba(0,0,0,0.8)] sm:max-h-none sm:overflow-hidden sm:rounded-[2rem]">
              <button
                type="button"
                aria-label={newsletterText.close}
                onClick={closeNewsletter}
                className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition hover:text-white/80 sm:right-5 sm:top-5 sm:h-10 sm:w-10 sm:text-[#746a5f] sm:drop-shadow-none sm:hover:text-black"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                >
                  <path d="M5 5 19 19" />
                  <path d="M19 5 5 19" />
                </svg>
              </button>

              <div className="grid gap-[28px] p-3 sm:grid-cols-[0.95fr_1.05fr] sm:gap-8 sm:p-6 md:p-7">
                <div className="relative min-h-[272px] overflow-hidden rounded-[1.2rem] sm:min-h-[520px] sm:rounded-[1.6rem]">
                  <Image
                    src={newsletterPopupImageSrc}
                    alt={newsletterText.imageAlt}
                    fill
                    sizes="(min-width: 640px) 34vw, 100vw"
                    className="object-cover"
                  />
                </div>

                <div className="flex flex-col justify-center px-1 pb-1 pt-0 text-[#4b433c] sm:min-h-[520px] sm:px-1 sm:pb-1 sm:pr-10">
                  {newsletterSuccess ? (
                    <div className="flex min-h-[145px] items-center justify-center text-center sm:min-h-[520px]">
                      <SuccessMessageBlock
                        key={newsletterSuccess}
                        text={newsletterSuccess}
                        description={newsletterSuccessDescription}
                        className="max-w-md font-display text-xl leading-[1.35] text-[#171412] sm:text-[2rem]"
                        descriptionClassName="mt-3 max-w-md font-display text-[0.8rem] leading-[1.45] text-[#4b433c] sm:mt-5 sm:text-[1rem]"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="translate-y-0 font-display text-[1.08rem] leading-none tracking-[0.01em] text-[#171412] sm:translate-y-[55px] sm:text-[1.75rem]">
                        {newsletterText.title}
                      </p>
                      <div className="translate-y-1 sm:translate-y-16">
                        <h2 className="mt-2 font-display text-[1rem] leading-none tracking-[0.01em] text-[#7a7066] sm:mt-10 sm:text-[1.6rem]">
                          {newsletterText.heading}
                        </h2>
                        <p className="mt-2 max-w-md font-display text-[0.78rem] leading-[1.35] text-[#8a8177] sm:mt-6 sm:text-[0.96rem] sm:leading-6">
                          {newsletterText.description}
                        </p>
                      </div>

                      <form className="relative mt-3 sm:mt-14" onSubmit={handleNewsletterSubmit} noValidate>
                        <label className="mt-3 block sm:mt-16">
                          <span className="sr-only">{newsletterText.emailPlaceholder}</span>
                          <input
                            type="email"
                            value={newsletterEmail}
                            onChange={(event) => {
                              setNewsletterEmail(event.target.value);
                              if (newsletterError) {
                                setNewsletterError(null);
                              }
                              if (newsletterSuccess) {
                                setNewsletterSuccess(null);
                              }
                            }}
                            placeholder={newsletterText.emailPlaceholder}
                            className="w-full border-b border-[#d9d0c6] bg-transparent pb-1.5 font-display text-[0.92rem] tracking-[0.01em] text-[#4b433c] placeholder:text-[#8f867d] focus:border-[#8b8175] focus:outline-none sm:pb-3 sm:text-[1.08rem]"
                          />
                        </label>
                        <div className="mt-4 flex justify-center sm:mt-14">
                          <button
                            type="submit"
                            disabled={newsletterSubmitting}
                            className="min-w-[138px] rounded-full border border-[#8f8780] bg-white px-6 py-2 text-[0.92rem] text-[#39322d] shadow-[0_8px_24px_-18px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 sm:min-w-[170px] sm:px-8 sm:py-3 sm:text-[1.08rem]"
                          >
                            {newsletterText.signUp}
                          </button>
                        </div>

                        <div className="absolute right-0 top-[200px] hidden sm:block">
                          <Image
                            src={brand?.logo_url?.trim() || brand?.logo?.trim() || "/images/full.png"}
                            alt={`${brandName} logo`}
                            width={68}
                            height={68}
                            className="h-auto w-[68px] object-contain opacity-80"
                          />
                        </div>

                        {newsletterError ? (
                          <p className="mt-4 text-sm text-[#9f3a32]">{newsletterError}</p>
                        ) : null}
                      </form>

                      <p className="mt-auto pt-3 text-[9px] uppercase tracking-[0.04em] text-[#8b8178] sm:pt-6 sm:text-[11px]">
                        {newsletterText.privacyPrefix}{" "}
                        <Link
                          href="/policies/privacy-policy"
                          className="underline underline-offset-2"
                        >
                          {newsletterText.privacyLabel}
                        </Link>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <main className="relative bg-white">
        <h1 className="sr-only">{heroText.homeHeading}</h1>
        <section
          ref={heroSectionRef}
          className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#120d0a] opacity-0 animate-[fade-up_0.9s_ease-out_forwards]"
          style={{ animationDelay: "120ms" }}
        >
          <div className="relative h-[100svh] min-h-[100svh]">
            <Image
              src={collectionMobileHeroSrc}
              alt={`${brandName} ${collectionTitle}`}
              fill
              priority
              sizes="100vw"
              className="object-cover sm:hidden"
            />
            <Image
              src={collectionHeroSrc}
              alt={`${brandName} ${collectionTitle}`}
              fill
              priority
              sizes="100vw"
              className="hidden object-cover sm:block"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,3,1,0.55)_0%,rgba(10,8,5,0.24)_32%,rgba(10,7,4,0.58)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_48%)]" />
            <div className="pointer-events-none absolute left-1/2 top-[5.9rem] z-10 h-px w-[84vw] max-w-6xl -translate-x-1/2 bg-white/70 sm:top-[6.6rem]" />

            <div className="relative z-10 mx-auto box-border h-[100svh] w-full max-w-6xl px-6 pb-14 pt-32 text-center text-white sm:px-10 sm:pb-20 sm:pt-40">
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-[calc(44%+40px)] flex-col items-center px-6 sm:-translate-y-[calc(42%+40px)]">
                <h2 className="max-w-4xl text-3xl font-semibold leading-[0.98] sm:text-5xl md:text-[4.35rem]">
                  {collectionTitle}
                </h2>
                <Link
                  href={collectionViewMoreHref}
                  scroll={pathname !== "/market"}
                  className="mt-5 inline-flex border-b border-white/80 pb-1 text-sm uppercase tracking-[0.24em] text-white/92 transition hover:text-white"
                >
                  {collectionViewMoreLabel}
                </Link>
              </div>
              <div className="flex h-[calc(100svh-8rem)] items-end justify-center sm:h-[calc(100svh-10rem)]">
                <Link
                  href="/market"
                  className="mb-[20px] inline-flex items-center justify-center rounded-full border border-white/70 bg-transparent px-8 py-3 text-sm font-medium uppercase tracking-[0.24em] text-white shadow-[0_18px_42px_-24px_rgba(0,0,0,0.8)] transition hover:-translate-y-0.5 hover:bg-transparent"
                >
                  {collectionViewAllProductsLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-14 pt-8 sm:px-6 sm:pb-16">
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
          </div>

          <InstagramEmbedsSection embeds={instagramEmbeds} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
