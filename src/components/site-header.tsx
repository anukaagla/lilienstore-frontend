"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { clearLegacyAuthStorage, fetchAuthSession } from "../lib/auth";
import { byLanguage, getLocalizedText } from "../lib/i18n";
import type { Category } from "../types/catalog";
import { useBrandState } from "./brand-provider";
import { SkeletonBlock } from "./page-skeletons";
import { useLanguage } from "./language-provider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type SiteHeaderProps = {
  showFullLogo?: boolean;
  onSearchClick?: () => void;
  searchHref?: string;
  isFixed?: boolean;
  categories?: Category[];
  loginOpenRequest?: number;
  onLoginSuccess?: () => void;
};

type CategoryApiRecord = {
  slug?: unknown;
  name?: unknown;
  children?: unknown;
};

const normalizeCategoryName = (
  name: unknown,
  fallback: string
): Category["name"] => {
  if (name && typeof name === "object") {
    const localized = name as { KA?: unknown; EN?: unknown };
    const ka =
      typeof localized.KA === "string" && localized.KA.trim()
        ? localized.KA
        : fallback;
    const en =
      typeof localized.EN === "string" && localized.EN.trim()
        ? localized.EN
        : ka || fallback;
    return {
      KA: ka || en || fallback,
      EN: en || ka || fallback,
    };
  }
  if (typeof name === "string" && name.trim()) {
    return { KA: name, EN: name };
  }
  return { KA: fallback, EN: fallback };
};

const mapCategory = (entry: unknown): Category | null => {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as CategoryApiRecord;
  if (typeof record.slug !== "string" || !record.slug.trim()) {
    return null;
  }

  const fallbackName = record.slug.trim();
  const mapped: Category = {
    slug: record.slug.trim(),
    name: normalizeCategoryName(record.name, fallbackName),
  };

  if (Array.isArray(record.children)) {
    const children = record.children
      .map(mapCategory)
      .filter((item): item is Category => item !== null);
    mapped.children = children;
  }

  return mapped;
};

const normalizeCategories = (payload: unknown): Category[] => {
  const candidates: unknown[] = [
    payload,
    (payload as { results?: unknown })?.results,
    (payload as { items?: unknown })?.items,
    (payload as { categories?: unknown })?.categories,
    (payload as { data?: unknown })?.data,
  ];

  const sourceCandidate = candidates.find(
    (value): value is unknown[] => Array.isArray(value) && value.length > 0
  );
  const source: unknown[] = sourceCandidate ?? (Array.isArray(payload) ? payload : []);

  return source
    .map(mapCategory)
    .filter((item): item is Category => item !== null);
};

const getApiMessage = (payload: unknown, fallback: string) => {
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
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
        );
        if (firstText) {
          return `${field}: ${firstText}`;
        }
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  return fallback;
};

export default function SiteHeader({
  showFullLogo = false,
  onSearchClick,
  searchHref = "/market?search=1",
  isFixed = true,
  categories,
  loginOpenRequest,
  onLoginSuccess,
}: SiteHeaderProps) {
  const { language, toggleLanguage } = useLanguage();
  const { brand, isLoading: brandLoading } = useBrandState();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandName = getLocalizedText(brand?.brand_name, language, "Lilien");
  const brandLogoSrc = brand?.logo_url?.trim() || brand?.logo?.trim() || "/images/full.png";
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategorySlug, setActiveCategorySlug] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authView, setAuthView] = useState<"signIn" | "forgotPassword">("signIn");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [passwordResetRequestSubmitting, setPasswordResetRequestSubmitting] = useState(false);
  const [passwordResetRequestError, setPasswordResetRequestError] = useState<string | null>(null);
  const [passwordResetRequestSuccess, setPasswordResetRequestSuccess] = useState<string | null>(null);
  const [fetchedCategories, setFetchedCategories] = useState<Category[]>([]);
  const [portalReady, setPortalReady] = useState(false);
  const languageSwitchLabel = language === "EN" ? "GE" : "ENG";
  const searchClassName =
    "relative pb-1 transition hover:text-slate-900 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-slate-400";
  const text = {
    search: byLanguage({ EN: "Search", KA: "ძებნა" }, language),
    profile: byLanguage({ EN: "Profile", KA: "პროფილი" }, language),
    logIn: byLanguage({ EN: "Log In", KA: "შესვლა" }, language),
    shoppingBag: byLanguage({ EN: "Shopping Bag", KA: "კალათა" }, language),
    help: byLanguage({ EN: "Help", KA: "დახმარება" }, language),
    shop: byLanguage({ EN: "Shop", KA: "პროდუქცია" }, language),
    comingSoon: byLanguage({ EN: "Coming soon", KA: "მალე დაემატება" }, language),
    blog: byLanguage({ EN: "Blog", KA: "ბლოგი" }, language),
    aboutUs: byLanguage({ EN: "About Us", KA: "ჩვენს შესახებ" }, language),
    contactUs: byLanguage({ EN: "Contact Us", KA: "კონტაქტი" }, language),
    closeLogin: byLanguage({ EN: "Close login", KA: "შესვლის დახურვა" }, language),
    welcomeBack: byLanguage({ EN: "Welcome back", KA: "კეთილი დაბრუნება" }, language),
    email: byLanguage({ EN: "Email", KA: "ელ.ფოსტა" }, language),
    emailPlaceholder: byLanguage(
      { EN: "e.g. nino@example.com", KA: "მაგ. nino@example.com" },
      language
    ),
    password: byLanguage({ EN: "Password", KA: "პაროლი" }, language),
    passwordPlaceholder: byLanguage(
      { EN: "Enter your password", KA: "შეიყვანე შენი პაროლი" },
      language
    ),
    forgotPassword: byLanguage(
      { EN: "Forgot your password?", KA: "დაგავიწყდა პაროლი?" },
      language
    ),
    resetPassword: byLanguage(
      { EN: "Reset your password", KA: "პაროლის აღდგენა" },
      language
    ),
    sendResetLink: byLanguage(
      { EN: "Send password reset link", KA: "პაროლის აღდგენის ბმულის გაგზავნა" },
      language
    ),
    sendingResetLink: byLanguage(
      { EN: "Sending...", KA: "იგზავნება..." },
      language
    ),
    passwordResetEmailSent: byLanguage(
      {
        EN: "Email was sent successfully.",
        KA: "ელ.ფოსტა წარმატებით გაიგზავნა.",
      },
      language
    ),
    signingIn: byLanguage({ EN: "Signing in...", KA: "მიმდინარეობს შესვლა..." }, language),
    signIn: byLanguage({ EN: "Sign In", KA: "შესვლა" }, language),
    noAccount: byLanguage(
      { EN: "Don't have an account?", KA: "ანგარიში არ გაქვს?" },
      language
    ),
    register: byLanguage({ EN: "Register", KA: "რეგისტრაცია" }, language),
    missingApiBaseUrl: byLanguage(
      { EN: "Missing API base URL.", KA: "API მისამართი მითითებული არ არის." },
      language
    ),
    loginFailed: byLanguage(
      { EN: "Login failed.", KA: "შესვლა ვერ შესრულდა." },
      language
    ),
    loginFailedRetry: byLanguage(
      { EN: "Login failed. Please try again.", KA: "შესვლა ვერ შესრულდა. სცადე თავიდან." },
      language
    ),
    passwordResetRequestFailed: byLanguage(
      {
        EN: "Failed to send password reset email.",
        KA: "პაროლის აღდგენის ელ.ფოსტის გაგზავნა ვერ მოხერხდა.",
      },
      language
    ),
    passwordResetRequestFailedRetry: byLanguage(
      {
        EN: "Failed to send password reset email. Please try again.",
        KA: "პაროლის აღდგენის ელ.ფოსტის გაგზავნა ვერ მოხერხდა. სცადე თავიდან.",
      },
      language
    ),
  };
  const shouldFetchCategories = !categories?.length;
  const resolvedCategories = useMemo(
    () => (categories?.length ? categories : fetchedCategories),
    [categories, fetchedCategories]
  );
  const activeCategory =
    resolvedCategories.find((item) => item.slug === activeCategorySlug) ??
    resolvedCategories[0];

  const getCategoryHref = (slug: string) => {
    const params =
      pathname === "/market"
        ? new URLSearchParams(searchParams?.toString())
        : new URLSearchParams();

    params.set("category", slug);
    params.delete("search");

    const query = params.toString();
    return query ? `/market?${query}` : "/market";
  };

  useEffect(() => {
    if (!shouldFetchCategories || !API_BASE_URL) {
      return;
    }

    let cancelled = false;

    const loadCategories = async () => {
      try {
        const url = new URL("/api/categories/", API_BASE_URL);
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) return;

        const payload = await response.json();
        if (cancelled) return;

        const normalized = normalizeCategories(payload);
        if (normalized.length) {
          setFetchedCategories(normalized);
        }
      } catch {
        // Keep fallback categories on error.
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [shouldFetchCategories]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    setActiveCategorySlug((current) => {
      if (!resolvedCategories.length) {
        return "";
      }
      const exists = resolvedCategories.some((item) => item.slug === current);
      return exists ? current : resolvedCategories[0].slug;
    });
  }, [menuOpen, resolvedCategories]);

  useEffect(() => {
    clearLegacyAuthStorage();

    let cancelled = false;

    const loadSession = async () => {
      const session = await fetchAuthSession();
      if (cancelled) return;
      setLoggedIn(Boolean(session?.authenticated));
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!loginOpenRequest) {
      return;
    }
    setMenuOpen(false);
    setAuthView("signIn");
    setLoginError(null);
    setPasswordResetRequestError(null);
    setPasswordResetRequestSuccess(null);
    setLoginOpen(true);
  }, [loginOpenRequest]);

  const forgotPasswordViewOpen = authView === "forgotPassword";
  const signInDisabled = !email.trim() || !password.trim();
  const canSubmit = !signInDisabled && !loginSubmitting;
  const passwordResetDisabled = !email.trim() || passwordResetRequestSubmitting;

  const headerPositionClass = isFixed
    ? "fixed inset-x-0 top-6"
    : "relative w-full mt-6";

  const closeLoginModal = () => {
    setLoginOpen(false);
    setAuthView("signIn");
    setPassword("");
    setLoginError(null);
    setPasswordResetRequestError(null);
    setPasswordResetRequestSuccess(null);
  };

  const openForgotPasswordView = () => {
    setAuthView("forgotPassword");
    setPassword("");
    setLoginError(null);
    setPasswordResetRequestError(null);
    setPasswordResetRequestSuccess(null);
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (signInDisabled) {
      return;
    }
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const normalizedEmail = email.trim();
    setLoginError(null);

    try {
      setLoginSubmitting(true);
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setLoginError(getApiMessage(data, text.loginFailed));
        return;
      }
      setLoggedIn(true);
      closeLoginModal();
      setEmail("");
      setPassword("");
      onLoginSuccess?.();
    } catch {
      setLoginError(text.loginFailedRetry);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordResetDisabled) {
      return;
    }
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const normalizedEmail = email.trim();
    setPasswordResetRequestError(null);
    setPasswordResetRequestSuccess(null);

    try {
      setPasswordResetRequestSubmitting(true);
      const response = await fetch("/api/auth/password/reset/request/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);
      if (response.status !== 200) {
        setPasswordResetRequestError(
          getApiMessage(payload, text.passwordResetRequestFailed)
        );
        return;
      }

      setPasswordResetRequestSuccess(text.passwordResetEmailSent);
    } catch {
      setPasswordResetRequestError(text.passwordResetRequestFailedRetry);
    } finally {
      setPasswordResetRequestSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`${headerPositionClass} z-50 flex items-center justify-between gap-4 px-4 sm:px-6`}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={byLanguage({ EN: "Toggle menu", KA: "მენიუს გახსნა" }, language)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center text-slate-900 transition hover:opacity-70"
          >
            {menuOpen ? (
              <span className="text-2xl font-light leading-none">X</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="h-0.5 w-6 bg-slate-900" />
                <span className="h-0.5 w-6 bg-slate-900" />
                <span className="h-0.5 w-6 bg-slate-900" />
              </div>
            )}
          </button>
          {showFullLogo && !menuOpen ? (
            brandLoading ? (
              <SkeletonBlock className="h-12 w-32 rounded-2xl sm:h-14 sm:w-40 md:h-16 md:w-44" />
            ) : (
              <Link
                href="/"
                aria-label={byLanguage(
                  {
                    EN: `Go to ${brandName} blog`,
                    KA: `${brandName}-ის ბლოგზე გადასვლა`,
                  },
                  language
                )}
              >
                <Image
                  src={brandLogoSrc}
                  alt={`${brandName} full logo`}
                  width={240}
                  height={96}
                  sizes="240px"
                  className="h-12 w-auto sm:h-14 md:h-16"
                />
              </Link>
            )
          ) : null}
        </div>

        <div
          className={`flex min-h-[48px] flex-1 flex-wrap items-center justify-end gap-x-6 gap-y-2 text-[10px] uppercase leading-none tracking-[0.16em] text-slate-500 sm:gap-x-8 sm:text-[11px] sm:tracking-[0.2em] md:gap-x-10 md:text-[13px] md:tracking-[0.22em] ${
            menuOpen ? "opacity-0 pointer-events-none" : ""
          }`}
        >
          <div className="flex items-center gap-x-6">
            <button
              type="button"
              onClick={toggleLanguage}
              className="transition hover:text-slate-900"
              aria-label={byLanguage(
                {
                  EN: "Switch language to Georgian",
                  KA: "Switch language to English",
                },
                language
              )}
            >
              {languageSwitchLabel}
            </button>
            {onSearchClick ? (
              <button
                type="button"
                onClick={onSearchClick}
                className={searchClassName}
              >
                {text.search}
              </button>
            ) : (
              <Link href={searchHref} className={searchClassName}>
                {text.search}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-x-6">
            {loggedIn ? (
              <Link
                href="/profile"
                className="flex items-center gap-2 transition hover:text-slate-900"
                aria-label={text.profile}
              >
                <span className="hidden sm:inline">{text.profile}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21a8 8 0 1 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
            ) : (
              <button
                type="button"
                className="flex items-center gap-2 transition hover:text-slate-900"
                onClick={() => {
                  setAuthView("signIn");
                  setLoginError(null);
                  setPasswordResetRequestError(null);
                  setPasswordResetRequestSuccess(null);
                  setLoginOpen(true);
                }}
                aria-label={text.logIn}
              >
                <span className="hidden sm:inline">{text.logIn}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21a8 8 0 1 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            )}
            <Link
              href="/shopping-bag"
              className="flex items-center gap-2 transition hover:text-slate-900"
              aria-label={text.shoppingBag}
            >
              <span className="hidden sm:inline">{text.shoppingBag}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 sm:hidden"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8h12l-1.2 12H7.2L6 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            </Link>
            <Link href="/contactus" className="transition hover:text-slate-900">
              {text.help}
            </Link>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-30 bg-black/10 backdrop-blur-sm transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="site-menu"
        className={`fixed left-0 top-0 z-40 flex h-screen w-[300px] flex-col border-r border-black/20 bg-[#E6E3DA]/95 pb-4 pt-6 shadow-xl backdrop-blur transition-all duration-300 sm:w-[340px] ${
          menuOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-4 opacity-0"
        }`}
      >
        <div className="mt-10 flex-1 px-6 text-slate-700">
          <div className="space-y-2 text-center text-[12px] uppercase tracking-[0.26em]">
            <div className="mx-auto flex w-fit items-center gap-2 border-b border-slate-500 pb-1">
              <span>{text.shop}</span>
            </div>
            <div className="flex items-center justify-center gap-5 text-[10px] tracking-[0.22em] text-slate-500">
              {resolvedCategories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setActiveCategorySlug(category.slug)}
                  className={`transition hover:text-slate-700 ${
                    activeCategory?.slug === category.slug
                      ? "text-slate-700"
                      : ""
                  }`}
                >
                  {getLocalizedText(category.name, language, category.slug)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-1.5 text-center text-base font-light text-slate-700">
            {(activeCategory?.children ?? []).length ? (
              activeCategory?.children?.map((child) => (
                <Link
                  key={child.slug}
                  href={getCategoryHref(child.slug)}
                  scroll={pathname !== "/market"}
                  onClick={() => setMenuOpen(false)}
                  className="block transition hover:text-slate-900"
                >
                  {getLocalizedText(child.name, language, child.slug)}
                </Link>
              ))
            ) : (
              <div className="mt-2 text-center text-[10px] uppercase tracking-[0.28em] text-slate-500">
                {text.comingSoon}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2.5 border-t border-black/20 pt-4 text-[12px] uppercase tracking-[0.24em] text-slate-600">
            <Link
              href="/"
              className="block border-b border-black/20 pb-3 text-center transition hover:text-slate-800"
            >
              {text.blog}
            </Link>
            <Link
              href="/aboutus"
              className="block border-b border-black/20 pb-3 text-center transition hover:text-slate-800"
            >
              {text.aboutUs}
            </Link>
            <Link
              href="/contactus"
              className="block border-b border-black/20 pb-3 text-center transition hover:text-slate-800"
            >
              {text.contactUs}
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between px-6 text-slate-500">
          <Image
            src={brandLogoSrc}
            alt={`${brandName} logo`}
            width={160}
            height={64}
            sizes="160px"
            className="h-8 w-auto"
          />
          {loggedIn ? (
            <Link
              href="/profile"
              aria-label={text.profile}
              className="transition hover:text-slate-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              aria-label={text.logIn}
              onClick={() => {
                setMenuOpen(false);
                setAuthView("signIn");
                setLoginError(null);
                setPasswordResetRequestError(null);
                setPasswordResetRequestSuccess(null);
                setLoginOpen(true);
              }}
              className="transition hover:text-slate-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          )}
        </div>
      </aside>

      {portalReady
        ? createPortal(
            <div
              className={`fixed inset-0 z-[140] flex items-center justify-center px-4 transition ${
                loginOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!loginOpen}
            >
              <button
                type="button"
                aria-label={text.closeLogin}
                onClick={closeLoginModal}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              />
              <div className="relative w-full max-w-sm rounded-3xl border border-black/10 bg-white/95 p-6 text-slate-900 shadow-2xl backdrop-blur">
                <button
                  type="button"
                  aria-label={text.closeLogin}
                  onClick={closeLoginModal}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-slate-600 transition hover:text-slate-900"
                >
                  X
                </button>
                <div className="flex flex-col items-center gap-3 text-center">
                  <Image
                    src={brandLogoSrc}
                    alt={`${brandName} logo`}
                    width={320}
                    height={128}
                    sizes="320px"
                    className="h-20 w-auto"
                  />
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {forgotPasswordViewOpen ? text.resetPassword : text.welcomeBack}
                  </p>
                </div>
                {forgotPasswordViewOpen ? (
                  <form className="mt-6 space-y-4" onSubmit={handlePasswordResetRequest}>
                    <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                      {text.email}
                      <input
                        type="email"
                        required
                        placeholder={text.emailPlaceholder}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={passwordResetDisabled}
                      className="w-full rounded-2xl bg-black px-4 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {passwordResetRequestSubmitting
                        ? text.sendingResetLink
                        : text.sendResetLink}
                    </button>
                    {passwordResetRequestError ? (
                      <div className="text-[11px] uppercase tracking-[0.22em] text-red-500">
                        {passwordResetRequestError}
                      </div>
                    ) : null}
                    {passwordResetRequestSuccess ? (
                      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-600">
                        {passwordResetRequestSuccess}
                      </div>
                    ) : null}
                  </form>
                ) : (
                  <>
                    <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                      <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                        {text.email}
                        <input
                          type="email"
                          required
                          placeholder={text.emailPlaceholder}
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                        />
                      </label>
                      <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                        {text.password}
                        <input
                          type="password"
                          required
                          placeholder={text.passwordPlaceholder}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={openForgotPasswordView}
                        className="text-left text-[10px] uppercase tracking-[0.28em] text-slate-500 transition hover:text-slate-700"
                      >
                        {text.forgotPassword}
                      </button>
                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full rounded-2xl bg-black px-4 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loginSubmitting ? text.signingIn : text.signIn}
                      </button>
                      {loginError ? (
                        <div className="text-[11px] uppercase tracking-[0.22em] text-red-500">
                          {loginError}
                        </div>
                      ) : null}
                    </form>
                    <div className="mt-4 text-center text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      {text.noAccount}{" "}
                      <Link href="/register" className="text-slate-900 underline">
                        {text.register}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
