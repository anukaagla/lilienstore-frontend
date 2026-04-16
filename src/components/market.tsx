"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { readCart, subscribeToCart } from "../lib/cart";
import { byLanguage, getLocalizedText } from "../lib/i18n";
import { toAbsoluteMediaUrl } from "../lib/media";
import type { ApiProductListItem, Category } from "../types/catalog";
import Breadcrumbs from "./breadcrumbs";
import Footer from "./footer";
import { useLanguage } from "./language-provider";
import SiteHeader from "./site-header";

type MarketProductCard = {
  slug: string;
  name: string;
  price: number;
  primaryImage: string;
  secondaryImage: string;
  createdAt: string;
};

type MarketProps = {
  products?: ApiProductListItem[];
  categories?: Category[];
  basePath?: string;
  pageLabel?: {
    EN: string;
    KA: string;
  };
  emptyStateLabel?: {
    EN: string;
    KA: string;
  };
};

const findCategoryName = (
  categories: Category[],
  slug: string,
  language: "KA" | "EN"
): string | null => {
  for (const category of categories) {
    if (category.slug === slug) {
      return category.name[language];
    }
    if (category.children?.length) {
      const nested = findCategoryName(category.children, slug, language);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

const humanizeSlug = (value: string) =>
  value
    .trim()
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const mapApiProduct = (
  item: ApiProductListItem,
  language: "KA" | "EN"
): MarketProductCard => {
  const sortedImages = [...(item.images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const imageUrls = sortedImages
    .map((image) => toAbsoluteMediaUrl(image.image_url ?? image.image))
    .filter((image) => Boolean(image));
  const primaryImageRecord = sortedImages.find((image) => image.is_primary);
  const primaryImage =
    toAbsoluteMediaUrl(primaryImageRecord?.image_url ?? primaryImageRecord?.image) ||
    imageUrls[0] ||
    "/images/dress.png";
  const secondaryImage =
    imageUrls.find((image) => image !== primaryImage) ?? primaryImage;

  return {
    slug: item.slug,
    name: getLocalizedText(item.name, language, item.slug),
    price: item.min_price,
    primaryImage,
    secondaryImage,
    createdAt: item.created_at,
  };
};

export default function Market({
  products: apiProducts,
  categories,
  basePath = "/market",
  pageLabel,
  emptyStateLabel,
}: MarketProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"4x2" | "6x2">("4x2");
  const [sort, setSort] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(
    () => searchParams?.get("search") === "1",
  );
  const [searchValue, setSearchValue] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const text = {
    searchPlaceholder: byLanguage(
      {
        EN: "e.g. satin dress",
        KA: "მაგ. ატლასის კაბა",
      },
      language
    ),
    searchAria: byLanguage(
      {
        EN: "Search products",
        KA: "პროდუქტების ძებნა",
      },
      language
    ),
    sortBy: byLanguage({ EN: "Sort by", KA: "დალაგება" }, language),
    save: byLanguage({ EN: "Save", KA: "შენახვა" }, language),
    view: byLanguage({ EN: "View", KA: "განლაგება" }, language),
    smallGrid: byLanguage({ EN: "Grid view small", KA: "პატარა ბადე" }, language),
    largeGrid: byLanguage({ EN: "Grid view large", KA: "დიდი ბადე" }, language),
    priceLowToHigh: byLanguage(
      { EN: "Price: low to high", KA: "ფასი: დაბლიდან მაღლა" },
      language
    ),
    priceHighToLow: byLanguage(
      { EN: "Price: high to low", KA: "ფასი: მაღლიდან დაბლა" },
      language
    ),
    shop: byLanguage({ EN: "Shop", KA: "პროდუქცია" }, language),
    newest: byLanguage({ EN: "Newest", KA: "უახლესი" }, language),
    noProducts: byLanguage(
      {
        EN: "No products available right now.",
        KA: "პროდუქტები ამ ეტაპზე არ არის ხელმისაწვდომი.",
      },
      language
    ),
    home: byLanguage({ EN: "Home", KA: "მთავარი" }, language),
    shoppingBag: byLanguage({ EN: "Shopping bag", KA: "კალათა" }, language),
  };

  const normalizeSort = (value: string | null) => {
    if (!value) return "";
    if (value === "price-asc") return "price_asc";
    if (value === "price-desc") return "price_desc";
    return value;
  };

  const currentSort = normalizeSort(searchParams?.get("sort"));
  const currentQuery = searchParams?.get("q") ?? "";
  const currentCategory = searchParams?.get("category")?.trim() ?? "";
  const cardImageSizes =
    view === "6x2"
      ? "(min-width: 1024px) 16vw, (min-width: 640px) 28vw, 44vw"
      : "(min-width: 1024px) 24vw, (min-width: 640px) 28vw, 44vw";

  useEffect(() => {
    setSort(currentSort);
  }, [currentSort]);

  useEffect(() => {
    setSearchValue(currentQuery);
  }, [currentQuery]);

  const updateQuery = (updates: { q?: string; sort?: string }) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (updates.q !== undefined) {
      if (updates.q) {
        params.set("q", updates.q);
      } else {
        params.delete("q");
      }
    }
    if (updates.sort !== undefined) {
      if (updates.sort) {
        params.set("sort", updates.sort);
      } else {
        params.delete("sort");
      }
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const resolvedProducts = useMemo<MarketProductCard[]>(
    () => (apiProducts ?? []).map((item) => mapApiProduct(item, language)),
    [apiProducts, language]
  );
  const resolvedCategories = useMemo(() => categories ?? [], [categories]);
  const basePageLabel = pageLabel
    ? byLanguage(pageLabel, language)
    : text.shop;
  const emptyStateText = emptyStateLabel
    ? byLanguage(emptyStateLabel, language)
    : text.noProducts;
  const selectedCategoryLabel = useMemo(() => {
    if (!currentCategory) {
      return null;
    }

    return (
      findCategoryName(resolvedCategories, currentCategory, language) ||
      humanizeSlug(currentCategory) ||
      null
    );
  }, [currentCategory, language, resolvedCategories]);
  const pageHeading = selectedCategoryLabel
    ? `${selectedCategoryLabel} ${basePageLabel}`
    : basePageLabel;

  const sortedProducts = (() => {
    if (!sort) return resolvedProducts;
    const items = [...resolvedProducts];
    if (sort === "price_asc") {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      items.sort((a, b) => b.price - a.price);
    } else if (sort === "newest") {
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return items;
  })();

  useEffect(() => {
    const getCount = () =>
      readCart().reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(getCount());
    const unsubscribe = subscribeToCart(() => {
      setCartCount(getCount());
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader
        showFullLogo
        onSearchClick={() => setSearchOpen((open) => !open)}
        categories={categories}
        catalogBasePath={basePath}
      />
      <main className="mx-auto flex-1 w-full max-w-6xl px-5 pb-24 pt-28">
        <h1 className="sr-only">{pageHeading}</h1>
        <Breadcrumbs
          className="mb-5 mt-1"
          items={[
            { label: text.home, href: "/" },
            { label: basePageLabel, href: basePath },
            ...(selectedCategoryLabel ? [{ label: selectedCategoryLabel }] : []),
          ]}
        />
        <div className="h-px w-full bg-black" />
        {searchOpen ? (
          <div className="mt-6 flex w-full justify-center">
            <input
              type="search"
              placeholder={text.searchPlaceholder}
              aria-label={text.searchAria}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  updateQuery({ q: searchValue.trim() });
                }
              }}
              className="w-full max-w-xl border-b border-slate-400 bg-transparent pb-2 text-center text-xs uppercase tracking-[0.22em] text-slate-600 placeholder:text-slate-400 focus:border-black focus:outline-none"
            />
          </div>
        ) : null}
        <div className="mt-8 flex w-full items-center justify-end gap-10 text-xs uppercase tracking-[0.2em] text-slate-500">
          <div className="relative z-20">
            <button
              type="button"
              onClick={() => setSortOpen((open) => !open)}
              className="flex items-center gap-2 border-b border-slate-400 pb-1 uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-black"
            >
              <span>{text.sortBy}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 12 8"
                className={`h-2.5 w-2.5 transition-transform ${
                  sortOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 1l5 5 5-5" />
              </svg>
            </button>
            <div
              className={`absolute right-0 top-full z-30 mt-3 w-52 rounded-xl border border-black/10 bg-white/95 p-2 text-[11px] uppercase tracking-[0.2em] text-slate-600 shadow-lg backdrop-blur transition ${
                sortOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-2 opacity-0"
              }`}
            >
              {[
                { value: "price_asc", label: text.priceLowToHigh },
                { value: "price_desc", label: text.priceHighToLow },
                { value: "newest", label: text.newest },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={sort === option.value}
                  onClick={() => setSort(option.value)}
                  className={`w-full rounded-lg px-3 py-2 text-left transition hover:bg-black/5 hover:text-black ${
                    sort === option.value
                      ? "bg-black/10 text-black"
                      : ""
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  updateQuery({ sort });
                  setSortOpen(false);
                }}
                className="mt-2 w-full rounded-lg bg-black px-3 py-2 text-center text-[10px] uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5"
              >
                {text.save}
              </button>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="transition-colors hover:text-black">{text.view}</span>
            <button
              type="button"
              aria-label={text.smallGrid}
              aria-pressed={view === "4x2"}
              onClick={() => setView("4x2")}
              className={`grid grid-cols-4 gap-[3px] transition-colors ${
                view === "4x2"
                  ? "text-black"
                  : "text-slate-400 hover:text-black"
              }`}
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={`view-a-${index}`}
                  className="h-1 w-1 rounded-full bg-current"
                />
              ))}
            </button>
            <button
              type="button"
              aria-label={text.largeGrid}
              aria-pressed={view === "6x2"}
              onClick={() => setView("6x2")}
              className={`grid grid-cols-6 gap-[3px] transition-colors ${
                view === "6x2"
                  ? "text-black"
                  : "text-slate-400 hover:text-black"
              }`}
            >
              {Array.from({ length: 12 }).map((_, index) => (
                <span
                  key={`view-b-${index}`}
                  className="h-1 w-1 rounded-full bg-current"
                />
              ))}
            </button>
          </div>
        </div>
        <section className="mt-10">
          {sortedProducts.length > 0 ? (
            <div
              className={`grid gap-6 sm:gap-7 ${
                view === "6x2"
                  ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              }`}
            >
              {sortedProducts.map((product) => {
                const productHref = `/market/${product.slug}`;
                return (
                  <Link
                    key={product.slug}
                    href={productHref}
                    className="group block"
                  >
                    <article>
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <Image
                          src={product.primaryImage}
                          alt={product.name}
                          fill
                          sizes={cardImageSizes}
                          className="object-contain transition-opacity duration-500 group-hover:opacity-0"
                        />
                        <Image
                          src={product.secondaryImage}
                          alt=""
                          fill
                          sizes={cardImageSizes}
                          aria-hidden="true"
                          className="object-contain opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        />
                      </div>
                      <div className="mt-3 space-y-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <p className="text-slate-900">{product.name}</p>
                        <p>{product.price} GEL</p>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center border border-dashed border-slate-300 px-6 text-center text-xs uppercase tracking-[0.26em] text-slate-500">
              {emptyStateText}
            </div>
          )}
        </section>
      </main>
      <Link
        href="/shopping-bag"
        aria-label={text.shoppingBag}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white/90 shadow-lg backdrop-blur transition hover:-translate-y-0.5"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 text-slate-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8h12l-1.2 12H7.2L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        {cartCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold text-white">
            {cartCount}
          </span>
        ) : null}
      </Link>
      <Footer />
    </div>
  );
}
