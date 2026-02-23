"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import type { Product } from "../data/products";
import { addToCart, readCart, subscribeToCart } from "../lib/cart";
import { addCartItem } from "../lib/cart-api";
import { byLanguage, getLocalizedText } from "../lib/i18n";
import Footer from "./footer";
import { useLanguage } from "./language-provider";
import SiteHeader from "./site-header";

type ProductDetailProps = {
  product: Product;
};

const defaultSizeOrder = ["XS", "S", "M", "L", "XL"];

const normalizeHexColor = (value: string) => {
  const hexColor = value.trim();
  if (/^#(?:[A-Fa-f0-9]{3}){1,2}$/.test(hexColor)) {
    return hexColor;
  }
  return "#000000";
};

export default function ProductDetail({ product }: ProductDetailProps) {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const gallery = useMemo(() => {
    if (product.detailImages?.length) {
      return product.detailImages.filter(Boolean);
    }
    return [product.primaryImage, product.secondaryImage].filter(Boolean);
  }, [product.detailImages, product.primaryImage, product.secondaryImage]);
  const defaultMainImage = product.primaryImage || gallery[0] || "";
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const colorOptions = useMemo(() => {
    const deduped = new Map<string, { name: string; hexColor: string }>();
    variants.forEach((variant) => {
      const colorName = variant.color.trim() || variant.hexColor;
      const hexColor = normalizeHexColor(variant.hexColor);
      const key = hexColor.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, {
          name: colorName,
          hexColor,
        });
      }
    });
    return Array.from(deduped.values());
  }, [variants]);

  const [mainImage, setMainImage] = useState(defaultMainImage);
  const [selectedColor, setSelectedColor] = useState(
    () => colorOptions[0]?.hexColor ?? ""
  );
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeOpen, setSizeOpen] = useState(false);
  const [sizeWarning, setSizeWarning] = useState(false);
  const cartCount = useSyncExternalStore(
    (onStoreChange) => subscribeToCart(() => onStoreChange()),
    () => readCart().reduce((sum, item) => sum + item.quantity, 0),
    () => 0
  );
  const [addedNotice, setAddedNotice] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilitySize, setAvailabilitySize] = useState<string | null>(null);
  const [availabilityResults, setAvailabilityResults] = useState<
    Array<{ size: string; inStock: boolean }>
  >([]);
  const hasVariantData = variants.length > 0;
  const resolvedSelectedColor = colorOptions.some(
    (option) => option.hexColor === selectedColor
  )
    ? selectedColor
    : colorOptions[0]?.hexColor ?? "";
  const filteredVariants = useMemo(() => {
    if (!hasVariantData) {
      return [];
    }
    if (!colorOptions.length || !resolvedSelectedColor) {
      return variants;
    }
    return variants.filter(
      (variant) =>
        normalizeHexColor(variant.hexColor).toLowerCase() ===
        resolvedSelectedColor.toLowerCase()
    );
  }, [colorOptions.length, hasVariantData, resolvedSelectedColor, variants]);
  const stockBySize = useMemo(() => {
    const stock = new Map<string, number>();
    filteredVariants.forEach((variant) => {
      const size = variant.size.trim();
      if (!size) {
        return;
      }
      stock.set(size, (stock.get(size) ?? 0) + Math.max(0, variant.stockQty));
    });
    return stock;
  }, [filteredVariants]);
  const sizeOptions = useMemo(() => {
    if (!hasVariantData) {
      return defaultSizeOrder.map((size) => ({
        size,
        available: true,
      }));
    }
    const orderedSizes = [...defaultSizeOrder];
    variants.forEach((variant) => {
      const size = variant.size.trim();
      if (size && !orderedSizes.includes(size)) {
        orderedSizes.push(size);
      }
    });
    return orderedSizes.map((size) => ({
      size,
      available: (stockBySize.get(size) ?? 0) > 0,
    }));
  }, [hasVariantData, stockBySize, variants]);
  const resolvedSelectedSize = sizeOptions.some(
    (option) => option.size === selectedSize && option.available
  )
    ? selectedSize
    : "";
  const hasAvailableSize = sizeOptions.some((option) => option.available);
  const selectedVariant = useMemo(() => {
    if (!hasVariantData || !resolvedSelectedSize) {
      return null;
    }
    const matches = filteredVariants.filter(
      (variant) => variant.size === resolvedSelectedSize
    );
    if (!matches.length) {
      return null;
    }
    return matches.find((variant) => variant.stockQty > 0) ?? matches[0];
  }, [filteredVariants, hasVariantData, resolvedSelectedSize]);
  const displayPrice = selectedVariant?.price ?? product.price;
  const thumbnails = useMemo(() => {
    const base = [
      product.primaryImage,
      ...gallery.filter((image) => image !== product.primaryImage),
    ].filter(Boolean) as string[];
    return base.slice(0, 5);
  }, [gallery, product.primaryImage]);
  const productIdParam = searchParams?.get("pid");
  const apiProductId = productIdParam
    ? Number(productIdParam)
    : Number(product.id);
  const displayName = getLocalizedText(
    product.nameLocalized,
    language,
    product.name
  );
  const displayDescription = getLocalizedText(
    product.descriptionLocalized,
    language,
    product.description
  );
  const displayCare = getLocalizedText(
    product.careLocalized,
    language,
    product.care ?? ""
  );
  const displayMaterial = getLocalizedText(
    product.materialLocalized,
    language,
    product.material ?? ""
  );
  const text = {
    viewImage: byLanguage({ EN: "View image", KA: "ფოტოს ნახვა" }, language),
    mainView: byLanguage({ EN: "main view", KA: "მთავარი ხედი" }, language),
    selectColor: byLanguage({ EN: "Select color", KA: "ფერის არჩევა" }, language),
    selectSize: byLanguage({ EN: "Select size", KA: "ზომის არჩევა" }, language),
    addToCart: byLanguage({ EN: "Add to cart", KA: "კალათაში დამატება" }, language),
    addedToShoppingBag: byLanguage(
      { EN: "Added to shopping bag", KA: "კალათაში დაემატა" },
      language
    ),
    chooseSize: byLanguage({ EN: "Please choose a size", KA: "გთხოვთ აირჩიოთ ზომა" }, language),
    checkInStore: byLanguage(
      { EN: "Check in-store availability", KA: "მაღაზიაში ხელმისაწვდომობის შემოწმება" },
      language
    ),
    shipping: byLanguage({ EN: "Shipping", KA: "მიწოდება" }, language),
    careAndComposition: byLanguage(
      { EN: "Care & Composition", KA: "მოვლა და შემადგენლობა" },
      language
    ),
    inStoreAvailability: byLanguage(
      { EN: "In-store availability", KA: "მაღაზიაში ხელმისაწვდომობა" },
      language
    ),
    closeSidebar: byLanguage({ EN: "Close sidebar", KA: "გვერდითი პანელის დახურვა" }, language),
    chooseSizes: byLanguage(
      {
        EN: "Choose one or more sizes to check their availability in stores",
        KA: "აირჩიე ერთი ან რამდენიმე ზომა და შეამოწმე ხელმისაწვდომობა მაღაზიებში",
      },
      language
    ),
    whatSize: byLanguage(
      { EN: "What size are you looking for?", KA: "რომელ ზომას ეძებ?" },
      language
    ),
    checkAvailability: byLanguage(
      { EN: "Check availability", KA: "ხელმისაწვდომობის შემოწმება" },
      language
    ),
    inStock: byLanguage({ EN: "In stock", KA: "მარაგშია" }, language),
    outOfStock: byLanguage({ EN: "Out of stock", KA: "არ არის მარაგში" }, language),
    care: byLanguage({ EN: "Care", KA: "მოვლა" }, language),
    material: byLanguage({ EN: "Material", KA: "მასალა" }, language),
    size: byLanguage({ EN: "size", KA: "ზომა" }, language),
    shoppingBag: byLanguage({ EN: "Shopping bag", KA: "კალათა" }, language),
  };

  const resolvedMainImage = gallery.includes(mainImage)
    ? mainImage
    : defaultMainImage;
  const resolvedAvailabilitySize =
    availabilitySize &&
    sizeOptions.some(
      (option) => option.size === availabilitySize && option.available
    )
      ? availabilitySize
      : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo />
      <main className="mx-auto flex-1 w-full max-w-6xl px-5 pb-24 pt-28">
        <div className="h-px w-full bg-black" />
        <section className="mt-10 grid gap-10 lg:grid-cols-[96px_minmax(0,1fr)_320px] xl:grid-cols-[110px_minmax(0,1fr)_360px]">
          <div className="order-2 flex flex-wrap items-start justify-center gap-4 self-start lg:order-1 lg:flex-col lg:items-start">
            {thumbnails.map((image, index) => {
              const thumbClass = `marketpic${index + 1}`;

              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={`${text.viewImage} ${index + 1}`}
                  onClick={() => setMainImage(image)}
                  className="h-20 w-16 overflow-hidden border border-black/15 transition hover:border-black/50 lg:h-24 lg:w-20"
                >
                  <img
                    src={image}
                    alt={`${displayName} thumbnail ${index + 1}`}
                    className={`${thumbClass} h-full w-full object-cover`}
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 lg:aspect-auto lg:h-[68vh] lg:max-h-[68vh]">
              <img
                src={resolvedMainImage}
                alt={`${displayName} ${text.mainView}`}
                className="marketpic h-full w-full object-cover"
              />
            </div>
          </div>

          <aside className="order-3 flex flex-col gap-4 text-xs uppercase tracking-[0.2em] text-slate-500 lg:order-3 lg:min-h-[68vh] lg:justify-start">
            <div className="space-y-5 pt-6">
              <div className="space-y-2">
                <p className="text-slate-900">{displayName}</p>
                <p>{displayPrice} GEL</p>
              </div>
              <div className="h-px w-full bg-black/20" />

              <div className="space-y-5 pt-16">
                {colorOptions.length ? (
                  <div className="flex items-center gap-3">
                    {colorOptions.map((colorOption) => (
                      <button
                        key={`${colorOption.name}-${colorOption.hexColor}`}
                        type="button"
                        aria-label={`${text.selectColor} ${colorOption.name}`}
                        onClick={() => {
                          setSelectedColor(colorOption.hexColor);
                          setSelectedSize("");
                          setSizeWarning(false);
                          setAvailabilitySize(null);
                          setAvailabilityResults([]);
                        }}
                        className={`h-3.5 w-3.5 border shadow-sm transition ${
                          resolvedSelectedColor === colorOption.hexColor
                            ? "border-black ring-1 ring-black/30"
                            : "border-black/20 hover:border-black/50"
                        }`}
                        style={{ backgroundColor: colorOption.hexColor }}
                      />
                    ))}
                  </div>
                ) : null}

                <div
                  className="relative w-full"
                  tabIndex={0}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setSizeOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={sizeOpen}
                    aria-label={text.selectSize}
                    onClick={() => {
                      if (!hasAvailableSize) {
                        return;
                      }
                      setSizeOpen((open) => !open);
                    }}
                    className="flex w-full items-center justify-between rounded-full border border-black/15 bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-600 shadow-[0_8px_18px_-14px_rgba(0,0,0,0.45)] transition focus:border-black focus:bg-white focus:outline-none focus:ring-1 focus:ring-black/40"
                  >
                    <span>
                      {resolvedSelectedSize || (hasAvailableSize ? text.selectSize : text.outOfStock)}
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 12 8"
                      className={`h-2.5 w-2.5 text-slate-500 transition ${
                        sizeOpen ? "rotate-180" : ""
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
                    className={`absolute left-0 right-0 top-full z-20 mt-3 rounded-2xl border border-black/10 bg-white/95 p-2 text-[10px] uppercase tracking-[0.22em] text-slate-600 shadow-[0_18px_30px_-20px_rgba(0,0,0,0.55)] backdrop-blur transition ${
                      sizeOpen
                        ? "pointer-events-auto translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-2 opacity-0"
                    }`}
                    role="listbox"
                  >
                    {sizeOptions.map((option) => (
                      <button
                        key={option.size}
                        type="button"
                        role="option"
                        aria-selected={resolvedSelectedSize === option.size}
                        aria-disabled={!option.available}
                        disabled={!option.available}
                        onClick={() => {
                          if (!option.available) {
                            return;
                          }
                          setSelectedSize(option.size);
                          setSizeOpen(false);
                          setSizeWarning(false);
                        }}
                        className={`w-full rounded-xl px-3 py-2 text-left transition ${
                          option.available
                            ? "hover:bg-black/5 hover:text-black"
                            : "cursor-not-allowed opacity-35"
                        } ${
                          resolvedSelectedSize === option.size
                            ? "bg-black/10 text-black"
                            : ""
                        }`}
                      >
                        {option.size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-2.5 sm:px-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!resolvedSelectedSize) {
                        setSizeWarning(true);
                        return;
                      }
                      if (hasVariantData && !selectedVariant) {
                        setSizeWarning(true);
                        return;
                      }
                      setSizeWarning(false);
                      const fallbackAdd = () => {
                        addToCart({
                          productId: product.id,
                          name: displayName,
                          price: displayPrice,
                          size: resolvedSelectedSize,
                          image: product.primaryImage,
                          quantity: 1,
                        });
                        setAddedNotice(true);
                        window.setTimeout(() => setAddedNotice(false), 1600);
                      };

                      const variantId = selectedVariant?.id;
                      const hasValidVariantId = Number.isFinite(variantId);

                      if (Number.isFinite(apiProductId) && hasValidVariantId) {
                        addCartItem(apiProductId, Number(variantId), 1)
                          .then((snapshot) => {
                            if (snapshot) {
                              setAddedNotice(true);
                              window.setTimeout(
                                () => setAddedNotice(false),
                                1600
                              );
                              return;
                            }
                            fallbackAdd();
                          })
                          .catch(() => {
                            fallbackAdd();
                          });
                      } else {
                        fallbackAdd();
                      }
                    }}
                    className="w-full bg-black py-3 text-[10px] uppercase tracking-[0.32em] text-white transition hover:-translate-y-0.5"
                  >
                    {text.addToCart}
                  </button>
                </div>
                {addedNotice ? (
                  <div className="pt-2 text-center text-[10px] uppercase tracking-[0.24em] text-emerald-600">
                    {text.addedToShoppingBag}
                  </div>
                ) : null}
                {sizeWarning ? (
                  <div className="pt-2 text-center text-[10px] uppercase tracking-[0.24em] text-red-500">
                    {text.chooseSize}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] normal-case leading-6 tracking-normal text-slate-600">
                {displayDescription}
              </p>

              <div className="space-y-2 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                <button
                  type="button"
                  onClick={() => setAvailabilityOpen(true)}
                  className="block text-left transition hover:text-slate-700"
                >
                  {text.checkInStore}
                </button>
                {displayCare ? (
                  <p className="normal-case tracking-normal text-slate-600">
                    <span className="uppercase tracking-[0.22em] text-slate-400">
                      {text.care}:
                    </span>{" "}
                    {displayCare}
                  </p>
                ) : null}
                {displayMaterial ? (
                  <p className="normal-case tracking-normal text-slate-600">
                    <span className="uppercase tracking-[0.22em] text-slate-400">
                      {text.material}:
                    </span>{" "}
                    {displayMaterial}
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </section>
      </main>

      <div
        className={`fixed inset-0 z-50 bg-black/15 backdrop-blur-sm transition-opacity duration-300 ${
          availabilityOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!availabilityOpen}
        onClick={() => setAvailabilityOpen(false)}
      />

      <aside
        aria-label={text.inStoreAvailability}
        className={`fixed right-0 top-0 z-60 flex h-screen w-[300px] flex-col border-l border-black/10 bg-white shadow-xl transition-all duration-300 sm:w-[400px] ${
          availabilityOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-4 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setAvailabilityOpen(false)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-slate-600 transition hover:text-slate-900"
          aria-label={text.closeSidebar}
        >
          X
        </button>
        <div className="flex-1 px-5 py-6 text-sm text-slate-600">
          <p className="pointer-events-none absolute left-1/2 top-[20%] -translate-x-1/2 -translate-y-1/2 text-center text-[11px] uppercase tracking-[0.32em] text-black">
            {text.checkInStore}
          </p>
          <div className="absolute left-1/2 top-[27%] w-[80%] -translate-x-1/2 text-left text-[10px] text-[#6B6B6B]">
            <p>{text.chooseSizes}</p>
            <p className="mt-4">{text.whatSize}</p>
          </div>
          <div className="absolute left-1/2 top-[36%] w-[88%] -translate-x-1/2">
            <div className="flex flex-nowrap justify-center gap-3">
              {sizeOptions.map((option) => {
                const isActive = resolvedAvailabilitySize === option.size;
                return (
                  <button
                    key={`availability-${option.size}`}
                    type="button"
                    disabled={!option.available}
                    aria-disabled={!option.available}
                    onClick={() => {
                      if (!option.available) {
                        return;
                      }
                      setAvailabilitySize((current) =>
                        current === option.size ? null : option.size
                      );
                      setAvailabilityResults([]);
                    }}
                    className={`h-11 w-20 border text-[11px] uppercase tracking-[0.3em] transition ${
                      !option.available
                        ? "cursor-not-allowed border-black/10 bg-slate-100 text-slate-300"
                        : isActive
                        ? "border-black bg-black text-white"
                        : "border-black/25 bg-white text-[#6B6B6B] hover:border-black/40"
                    }`}
                  >
                    {option.size}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="absolute left-1/2 top-[48%] w-[88%] -translate-x-1/2">
            <button
              type="button"
              onClick={() => {
                if (!resolvedAvailabilitySize) {
                  setAvailabilityResults([]);
                  return;
                }
                setAvailabilityResults([
                  {
                    size: resolvedAvailabilitySize,
                    inStock: hasVariantData
                      ? (stockBySize.get(resolvedAvailabilitySize) ?? 0) > 0
                      : true,
                  },
                ]);
              }}
              className="w-full border border-black/20 bg-white py-3 text-[10px] uppercase tracking-[0.3em] text-slate-600 transition hover:border-black/40 hover:text-slate-900"
            >
              {text.checkAvailability}
            </button>
            {availabilityResults.length ? (
              <div className="mt-4 space-y-2 text-[10px] uppercase tracking-[0.28em]">
                {availabilityResults.map((result) => (
                  <div
                    key={`availability-${result.size}`}
                    className={`flex items-center justify-center gap-2 ${
                      result.inStock ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {result.inStock ? (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 8l3 3 7-7" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 4l8 8" />
                        <path d="M12 4l-8 8" />
                      </svg>
                    )}
                    <span>
                      {result.inStock ? text.inStock : text.outOfStock} - {text.size}{" "}
                      {result.size}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {/* Sidebar content goes here */}
        </div>
      </aside>
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
