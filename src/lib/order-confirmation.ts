export type OrderConfirmationSnapshot = {
  orderId: string
}

const STORAGE_KEY = "lilien-order-confirmation"

export const normalizeOrderId = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value !== "string") {
    return ""
  }

  return value.trim().replace(/^#/, "")
}

const extractOrderId = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ""
  }

  const record = value as Record<string, unknown>
  return (
    normalizeOrderId(record.orderId) ||
    normalizeOrderId(record.order_id) ||
    normalizeOrderId(record.checkoutId) ||
    normalizeOrderId(record.checkout_id) ||
    normalizeOrderId(record.id) ||
    normalizeOrderId(record.orderNumber) ||
    normalizeOrderId(record.order_number)
  )
}

const safeParse = (value: string | null): OrderConfirmationSnapshot | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    const orderId = extractOrderId(parsed)
    if (!orderId) return null

    return { orderId }
  } catch {
    return null
  }
}

export const parseOrderConfirmation = (value: string | null) => safeParse(value)

export const readOrderConfirmationValue = () => {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(STORAGE_KEY)
}

export const readOrderConfirmation = () => {
  return parseOrderConfirmation(readOrderConfirmationValue())
}

export const writeOrderConfirmation = (snapshot: OrderConfirmationSnapshot) => {
  if (!snapshot.orderId.trim()) return
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ orderId: normalizeOrderId(snapshot.orderId) }),
  )
}
