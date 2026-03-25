import type { CartItem } from "./cart"

export type OrderConfirmationSnapshot = {
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
  checkoutId?: string
  checkoutResponse?: unknown
  paymentResponse?: unknown
}

const STORAGE_KEY = "lilien-order-confirmation"

const safeParse = (value: string | null): OrderConfirmationSnapshot | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null
    }
    return parsed as OrderConfirmationSnapshot
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
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}
