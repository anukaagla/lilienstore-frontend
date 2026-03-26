import type { CartItem } from "./cart"
import { getLocalizedText, type Language } from "./i18n"
import { toAbsoluteMediaUrl } from "./media"
import { normalizeOrderId } from "./order-confirmation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

const ORDER_ID_QUERY_KEYS = ["order_id", "orderId", "id", "checkout_id", "checkoutId"]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""))
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const pickRecordText = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ""
}

const pickRecordNumber = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const parsed = parseNumber(record[key])
    if (parsed !== null) {
      return parsed
    }
  }

  return null
}

const getOrderRecordCandidates = (payload: unknown) => {
  if (!isRecord(payload)) {
    return []
  }

  const dataRecord = isRecord(payload.data) ? payload.data : null
  const orderRecord = isRecord(payload.order) ? payload.order : null
  const resultRecord = isRecord(payload.result) ? payload.result : null
  const dataOrderRecord =
    dataRecord && isRecord(dataRecord.order) ? dataRecord.order : null
  const resultOrderRecord =
    resultRecord && isRecord(resultRecord.order) ? resultRecord.order : null

  return [
    payload,
    orderRecord,
    dataRecord,
    dataOrderRecord,
    resultRecord,
    resultOrderRecord,
  ].filter((candidate): candidate is Record<string, unknown> => candidate !== null)
}

const pickOrderRecord = (payload: unknown) => {
  const candidates = getOrderRecordCandidates(payload)

  for (const candidate of candidates) {
    const orderId = normalizeOrderId(
      pickRecordText(candidate, ["id", "order_id", "number", "code"]),
    )
    if (orderId) {
      return candidate
    }
  }

  return candidates[0] ?? null
}

const formatOrderNumber = (value: string, orderId: string) => {
  const normalized = value.trim()
  if (!normalized) {
    return `#${orderId}`
  }

  return normalized.startsWith("#") ? normalized : `#${normalized}`
}

const normalizeQuantity = (value: unknown) => {
  const parsed = parseNumber(value)
  if (parsed === null || !Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(0, Math.trunc(parsed))
}

export type OrderDetailsSummary = {
  orderId: string
  orderNumber: string
  status: string
  subtotal: number
  shippingFee: number
  total: number
  itemCount: number
  items: CartItem[]
  customerName: string
  phone: string
  deliveryAddress: string
  addressLabel: string
  paymentMethod: string
  estimatedDelivery: string
  email: string
  placedAt: string
}

export const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) {
    return null
  }

  try {
    return new URL(path, API_BASE_URL).toString()
  } catch {
    return null
  }
}

export const getApiMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === "string" && payload.trim()) {
    return payload
  }

  if (!isRecord(payload)) {
    return fallback
  }

  const detail = payload.detail
  if (typeof detail === "string" && detail.trim()) {
    return detail
  }

  const parts = Object.entries(payload)
    .map(([field, value]) => {
      if (typeof value === "string" && value.trim()) {
        return `${field}: ${value}`
      }

      if (Array.isArray(value)) {
        const firstText = value.find(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
        )
        if (firstText) {
          return `${field}: ${firstText}`
        }
      }

      return null
    })
    .filter((value): value is string => Boolean(value))

  if (parts.length > 0) {
    return parts.join(" | ")
  }

  return fallback
}

export const pickOrderIdFromSearchParams = (
  searchParams: { get: (name: string) => string | null } | null | undefined,
) => {
  if (!searchParams) {
    return ""
  }

  for (const key of ORDER_ID_QUERY_KEYS) {
    const value = normalizeOrderId(searchParams.get(key))
    if (value) {
      return value
    }
  }

  return ""
}

export const normalizeOrderDetailsSummary = (
  payload: unknown,
  language: Language,
): OrderDetailsSummary | null => {
  const record = pickOrderRecord(payload)
  if (!record) {
    return null
  }

  const orderId = normalizeOrderId(
    pickRecordText(record, ["id", "order_id", "number", "code"]),
  )
  if (!orderId) {
    return null
  }

  const shippingAddressRecord = isRecord(record.shipping_address)
    ? record.shipping_address
    : null
  const firstName = shippingAddressRecord
    ? pickRecordText(shippingAddressRecord, ["first_name"])
    : ""
  const lastName = shippingAddressRecord
    ? pickRecordText(shippingAddressRecord, ["last_name"])
    : ""
  const addressLabel = shippingAddressRecord
    ? pickRecordText(shippingAddressRecord, ["address_name", "name"])
    : ""
  const phone = shippingAddressRecord
    ? pickRecordText(shippingAddressRecord, ["phone_number", "phone", "mobile"])
    : ""
  const line1 = shippingAddressRecord
    ? pickRecordText(shippingAddressRecord, ["line1", "address1"])
    : ""
  const line2 = shippingAddressRecord
    ? pickRecordText(shippingAddressRecord, ["line2", "address2"])
    : ""
  const city = shippingAddressRecord ? pickRecordText(shippingAddressRecord, ["city"]) : ""
  const state = shippingAddressRecord ? pickRecordText(shippingAddressRecord, ["state"]) : ""
  const postalCode = shippingAddressRecord
    ? pickRecordText(shippingAddressRecord, ["postal_code", "zip", "zipcode"])
    : ""
  const country = shippingAddressRecord
    ? pickRecordText(shippingAddressRecord, ["country"])
    : ""
  const shippingZone = pickRecordText(record, ["shipping_zone", "zone"])

  const deliveryAddressParts = [
    addressLabel,
    line1,
    line2,
    city,
    state,
    postalCode,
    shippingZone,
    country,
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  const deliveryAddress = deliveryAddressParts.join(", ")

  const rawItems = Array.isArray(record.items) ? record.items : []
  const items = rawItems
    .map((entry, index): CartItem | null => {
      if (!isRecord(entry)) {
        return null
      }

      const productRecord = isRecord(entry.product) ? entry.product : null
      const variantRecord = isRecord(entry.variant) ? entry.variant : null
      const itemId =
        normalizeOrderId(pickRecordText(entry, ["id"])) || `${orderId}-${index + 1}`
      const productId =
        normalizeOrderId(productRecord ? pickRecordText(productRecord, ["id"]) : "") ||
        (productRecord ? pickRecordText(productRecord, ["slug"]) : "") ||
        itemId
      const fallbackName =
        (productRecord ? pickRecordText(productRecord, ["slug"]) : "") ||
        `Item ${index + 1}`
      const name = getLocalizedText(
        productRecord ? productRecord.name : null,
        language,
        fallbackName,
      )
      const quantity = normalizeQuantity(entry.quantity)
      const lineTotal = pickRecordNumber(entry, ["line_total", "total", "amount"])
      const unitPrice =
        pickRecordNumber(entry, ["unit_price", "price"]) ??
        (lineTotal !== null && quantity > 0 ? lineTotal / quantity : 0)
      const size =
        (variantRecord ? pickRecordText(variantRecord, ["size"]) : "").trim() || "-"
      const color = (variantRecord ? pickRecordText(variantRecord, ["color"]) : "").trim()
      const image =
        toAbsoluteMediaUrl(
          productRecord ? pickRecordText(productRecord, ["primary_image", "image"]) : "",
        ) || "/images/dress.png"

      return {
        id: itemId,
        productId,
        name,
        price: unitPrice,
        size,
        color: color || undefined,
        quantity,
        image,
      }
    })
    .filter((item): item is CartItem => item !== null)

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  return {
    orderId,
    orderNumber: formatOrderNumber(
      pickRecordText(record, [
        "order_number",
        "orderNumber",
        "number",
        "reference",
        "order_reference",
        "id",
      ]),
      orderId,
    ),
    status: pickRecordText(record, ["status"]) || "-",
    subtotal: pickRecordNumber(record, ["subtotal", "subtotal_amount"]) ?? 0,
    shippingFee:
      pickRecordNumber(record, ["shipping_price", "shipping", "shipping_fee"]) ?? 0,
    total: pickRecordNumber(record, ["total", "total_amount", "amount"]) ?? 0,
    itemCount,
    items,
    customerName: `${firstName} ${lastName}`.trim() || addressLabel || "Customer",
    phone: phone || "-",
    deliveryAddress: deliveryAddress || "-",
    addressLabel,
    paymentMethod:
      pickRecordText(record, ["payment_method", "paymentMethod", "provider", "gateway"]) ||
      "UniPay",
    estimatedDelivery:
      pickRecordText(record, [
        "estimated_delivery",
        "estimated_delivery_date",
        "delivery_estimate",
        "eta",
      ]) || "",
    email: pickRecordText(record, ["email", "customer_email", "customerEmail"]),
    placedAt: pickRecordText(record, ["created_at", "ordered_at", "placed_at", "date"]),
  }
}
