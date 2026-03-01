import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ProductPageSkeleton } from "../../../components/page-skeletons";
import ProductDetail from "../../../components/product-detail";
import type { Product } from "../../../data/products";
import { toLocalizedText } from "../../../lib/i18n";
import type { ApiProductDetail } from "../../../types/catalog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const getImageUrl = (value: { image?: unknown; image_url?: unknown }) => {
  if (typeof value.image_url === "string" && value.image_url.trim()) {
    return value.image_url;
  }
  if (typeof value.image === "string" && value.image.trim()) {
    return value.image;
  }
  return undefined;
};

const mapApiProduct = (item: ApiProductDetail): Product => {
  const sortedImages = [...(item.images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const imageList = sortedImages
    .map((image) => getImageUrl(image))
    .filter((image): image is string => typeof image === "string" && !!image);
  const primaryImageRecord = sortedImages.find((image) => image.is_primary);
  const primaryImage =
    (primaryImageRecord ? getImageUrl(primaryImageRecord) : undefined) ??
    imageList[0] ??
    "/images/dress.png";
  const secondaryImage =
    imageList.find((image) => image !== primaryImage) ?? primaryImage;
  const detailImages = imageList.length ? imageList : [primaryImage];
  const price =
    toNumber(item.min_price) ??
    toNumber(item.price) ??
    toNumber(item.max_price) ??
    0;
  const nameLocalized = toLocalizedText(item.name, item.slug);
  const descriptionLocalized = toLocalizedText(item.description, "");
  const careLocalized = toLocalizedText(item.care, "");
  const materialLocalized = toLocalizedText(item.material, "");
  const variants = (item.variants ?? [])
    .map((variant) => ({
      id: variant.id,
      size: typeof variant.size === "string" ? variant.size.trim() : "",
      color: typeof variant.color === "string" ? variant.color.trim() : "",
      hexColor:
        typeof variant.hex_color === "string" && variant.hex_color.trim()
          ? variant.hex_color
          : "#000000",
      price: toNumber(variant.price) ?? price,
      stockQty:
        typeof variant.stock_qty === "number" && Number.isFinite(variant.stock_qty)
          ? Math.max(0, Math.floor(variant.stock_qty))
          : 0,
      allowOrder: variant.allow_order === true,
    }))
    .filter((variant) => variant.size);

  return {
    id: String(item.id),
    name: nameLocalized.EN,
    nameLocalized,
    price,
    primaryImage,
    secondaryImage,
    createdAt: item.created_at ?? new Date().toISOString(),
    detailImages,
    description: descriptionLocalized.EN,
    descriptionLocalized,
    care: careLocalized.EN,
    careLocalized,
    material: materialLocalized.EN,
    materialLocalized,
    variants,
  };
};

const fetchApiProduct = async (slug: string): Promise<Product | null> => {
  if (!API_BASE_URL) {
    return null;
  }

  try {
    const productUrl = new URL(
      `/api/products/${encodeURIComponent(slug)}/`,
      API_BASE_URL
    );
    const response = await fetch(productUrl.toString(), { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const product = (await response.json()) as ApiProductDetail;
    return mapApiProduct(product);
  } catch {
    return null;
  }
};

type MarketProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MarketProductPage({
  params,
}: MarketProductPageProps) {
  const { id: slug } = await params;
  if (!API_BASE_URL) {
    notFound();
  }

  const apiProduct = await fetchApiProduct(slug);

  if (!apiProduct) {
    notFound();
  }

  return (
    <Suspense fallback={<ProductPageSkeleton />}>
      <ProductDetail product={apiProduct} />
    </Suspense>
  );
}
