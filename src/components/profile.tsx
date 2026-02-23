"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Footer from "./footer";
import SiteHeader from "./site-header";
import { writeAddresses } from "../lib/addresses";
import { clearLegacyAuthStorage, fetchWithAuthRetry } from "../lib/auth";
import { byLanguage, getLocalizedText, type Language } from "../lib/i18n";
import { useLanguage } from "./language-provider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type MenuItemId =
  | "account"
  | "orders"
  | "password"
  | "confirmEmail"
  | "addresses"
  | "logout";

type OrderListItem = {
  id: string;
  apiId: string | null;
  date: string;
  total: string;
  items: string;
  canViewDetails: boolean;
};

type OrderDetailsItem = {
  id: string;
  name: string;
  color: string;
  size: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  image: string;
};

type OrderDetails = {
  id: string;
  placedOn: string;
  status: string;
  items: OrderDetailsItem[];
  subtotal: string;
  shippingPrice: string;
  total: string;
  delivery: {
    name: string;
    phone: string;
    address: string;
  };
};

const fallbackOrders: OrderListItem[] = [
  { id: "#1", apiId: null, date: "01/20/2026", total: "456.39", items: "3", canViewDetails: false },
  {
    id: "#2311",
    apiId: null,
    date: "01/20/2026",
    total: "456.39",
    items: "3",
    canViewDetails: false,
  },
];

type AddressFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address1: string;
  address2: string;
  postalCode: string;
  name: string;
};

type Address = AddressFormState & {
  id: string;
  apiId?: string | null;
};

type AddressApiPayload = {
  address_name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type AddressPatchPayload = Partial<AddressApiPayload>;

type AccountFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
};

type ProfileApiAddress = {
  id?: unknown;
  address_name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  phone_number?: unknown;
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postal_code?: unknown;
  country?: unknown;
};

type ProfileMeResponse = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  active_status: boolean;
  phone_number: string;
  addresses: ProfileApiAddress[];
  order_history: unknown[];
};

const emptyAddressForm: AddressFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  country: "",
  state: "",
  city: "",
  address1: "",
  address2: "",
  postalCode: "",
  name: "",
};

const emptyAccountForm: AccountFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value : "";

const normalizeTrimmedString = (value: string) => value.trim();

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

const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) {
    return null;
  }

  try {
    return new URL(path, API_BASE_URL).toString();
  } catch {
    return null;
  }
};

const normalizeProfileResponse = (payload: unknown): ProfileMeResponse | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const addresses = Array.isArray(record.addresses)
    ? record.addresses.filter(
        (entry): entry is ProfileApiAddress => Boolean(entry && typeof entry === "object")
      )
    : [];
  const orderHistory = Array.isArray(record.order_history) ? record.order_history : [];

  return {
    id: typeof record.id === "number" ? record.id : 0,
    email: normalizeString(record.email),
    username: normalizeString(record.username),
    first_name: normalizeString(record.first_name),
    last_name: normalizeString(record.last_name),
    active_status: Boolean(record.active_status),
    phone_number: normalizeString(record.phone_number),
    addresses,
    order_history: orderHistory,
  };
};

const normalizeProfileAddressResponse = (payload: unknown): ProfileApiAddress | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload as ProfileApiAddress;
};

const mapProfileAddressToAddress = (address: ProfileApiAddress, index: number): Address => {
  const rawApiId =
    typeof address.id === "number" || typeof address.id === "string"
      ? String(address.id).trim()
      : "";
  const apiId = rawApiId || null;

  return {
    id: apiId ?? `local-fallback-${index + 1}`,
    apiId,
    name: normalizeString(address.address_name),
    firstName: normalizeString(address.first_name),
    lastName: normalizeString(address.last_name),
    phone: normalizeString(address.phone_number),
    country: normalizeString(address.country),
    state: normalizeString(address.state),
    city: normalizeString(address.city),
    address1: normalizeString(address.line1),
    address2: normalizeString(address.line2),
    postalCode: normalizeString(address.postal_code),
  };
};

const mapAddressToFormState = (address: Address): AddressFormState => ({
  firstName: address.firstName,
  lastName: address.lastName,
  phone: address.phone,
  country: address.country,
  state: address.state,
  city: address.city,
  address1: address.address1,
  address2: address.address2,
  postalCode: address.postalCode,
  name: address.name,
});

const normalizeAddressFormState = (form: AddressFormState): AddressFormState => ({
  firstName: normalizeTrimmedString(form.firstName),
  lastName: normalizeTrimmedString(form.lastName),
  phone: normalizeTrimmedString(form.phone),
  country: normalizeTrimmedString(form.country),
  state: normalizeTrimmedString(form.state),
  city: normalizeTrimmedString(form.city),
  address1: normalizeTrimmedString(form.address1),
  address2: normalizeTrimmedString(form.address2),
  postalCode: normalizeTrimmedString(form.postalCode),
  name: normalizeTrimmedString(form.name),
});

const resolveAddressApiId = (address: Address): string | null => {
  if (typeof address.apiId === "string" && address.apiId.trim()) {
    return address.apiId.trim();
  }

  const fallbackId = normalizeTrimmedString(address.id);
  if (!fallbackId || fallbackId.startsWith("local-") || /^api-\d+$/.test(fallbackId)) {
    return null;
  }

  return fallbackId;
};

const getChangedAddressPatchPayload = (
  current: AddressFormState,
  snapshot: AddressFormState
): AddressPatchPayload => {
  const next = normalizeAddressFormState(current);
  const baseline = normalizeAddressFormState(snapshot);
  const payload: AddressPatchPayload = {};

  if (next.name !== baseline.name) {
    payload.address_name = next.name;
  }
  if (next.firstName !== baseline.firstName) {
    payload.first_name = next.firstName;
  }
  if (next.lastName !== baseline.lastName) {
    payload.last_name = next.lastName;
  }
  if (next.phone !== baseline.phone) {
    payload.phone_number = next.phone;
  }
  if (next.address1 !== baseline.address1) {
    payload.line1 = next.address1;
  }
  if (next.address2 !== baseline.address2) {
    payload.line2 = next.address2;
  }
  if (next.city !== baseline.city) {
    payload.city = next.city;
  }
  if (next.state !== baseline.state) {
    payload.state = next.state;
  }
  if (next.postalCode !== baseline.postalCode) {
    payload.postal_code = next.postalCode;
  }
  if (next.country !== baseline.country) {
    payload.country = next.country;
  }

  return payload;
};

const mapAddressFormToApiPayload = (form: AddressFormState): AddressApiPayload => {
  const normalized = normalizeAddressFormState(form);

  return {
    address_name: normalized.name,
    first_name: normalized.firstName,
    last_name: normalized.lastName,
    phone_number: normalized.phone,
    line1: normalized.address1,
    line2: normalized.address2,
    city: normalized.city,
    state: normalized.state,
    postal_code: normalized.postalCode,
    country: normalized.country,
  };
};

const buildAddressApiUrl = (addressId: string) =>
  buildApiUrl(`/api/auth/addresses/${encodeURIComponent(addressId)}/`);

const mapProfileToAccountForm = (profile: ProfileMeResponse): AccountFormState => ({
  first_name: profile.first_name,
  last_name: profile.last_name,
  email: profile.email,
  phone_number: profile.phone_number,
});

const pickRecordValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
};

const normalizeOrderApiId = (value: string) => value.trim().replace(/^#/, "");

const normalizeDisplayValue = (value: unknown, fallback = "-") => {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
};

const formatOrderDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "-";

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return parsed.toLocaleDateString();
};

const mapOrderHistory = (payload: unknown[]): OrderListItem[] =>
  payload
    .map((entry, index): OrderListItem | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const rawApiIdCandidate = pickRecordValue(record, ["id", "order_id"]);
      const apiIdCandidate = normalizeOrderApiId(rawApiIdCandidate);
      const displayIdCandidate = pickRecordValue(record, ["number", "code"]);
      const dateCandidate = pickRecordValue(record, [
        "created_at",
        "ordered_at",
        "placed_at",
        "date",
      ]);
      const totalCandidate = pickRecordValue(record, [
        "total",
        "total_amount",
        "total_price",
        "amount",
      ]);
      const itemsCountCandidate = pickRecordValue(record, ["items_count", "item_count"]);
      const itemsFromArray =
        Array.isArray(record.items) && record.items.length >= 0
          ? String(record.items.length)
          : "";

      return {
        id: displayIdCandidate || rawApiIdCandidate || `#${index + 1}`,
        apiId: apiIdCandidate || null,
        date: dateCandidate ? formatOrderDate(dateCandidate) : "-",
        total: totalCandidate || "-",
        items: itemsCountCandidate || itemsFromArray || "-",
        canViewDetails: Boolean(apiIdCandidate),
      };
    })
    .filter((item): item is OrderListItem => item !== null);

const normalizeOrderDetailsResponse = (
  payload: unknown,
  language: Language
): OrderDetails | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const idCandidate = pickRecordValue(record, ["id", "order_id", "number", "code"]);
  if (!idCandidate) {
    return null;
  }

  const shippingAddressRecord =
    record.shipping_address && typeof record.shipping_address === "object"
      ? (record.shipping_address as Record<string, unknown>)
      : null;
  const firstName = shippingAddressRecord
    ? pickRecordValue(shippingAddressRecord, ["first_name"])
    : "";
  const lastName = shippingAddressRecord
    ? pickRecordValue(shippingAddressRecord, ["last_name"])
    : "";
  const addressName = shippingAddressRecord
    ? pickRecordValue(shippingAddressRecord, ["address_name", "name"])
    : "";
  const phone = shippingAddressRecord
    ? pickRecordValue(shippingAddressRecord, ["phone_number", "phone", "mobile"])
    : "";
  const line1 = shippingAddressRecord ? pickRecordValue(shippingAddressRecord, ["line1"]) : "";
  const line2 = shippingAddressRecord ? pickRecordValue(shippingAddressRecord, ["line2"]) : "";
  const city = shippingAddressRecord ? pickRecordValue(shippingAddressRecord, ["city"]) : "";
  const state = shippingAddressRecord ? pickRecordValue(shippingAddressRecord, ["state"]) : "";
  const postalCode = shippingAddressRecord
    ? pickRecordValue(shippingAddressRecord, ["postal_code"])
    : "";
  const country = shippingAddressRecord ? pickRecordValue(shippingAddressRecord, ["country"]) : "";
  const shippingZone = pickRecordValue(record, ["shipping_zone", "zone"]);

  const deliveryName = `${firstName} ${lastName}`.trim() || addressName || "-";
  const addressParts = [addressName, line1, line2, city, state, postalCode, shippingZone, country]
    .map((value) => value.trim())
    .filter((value) => Boolean(value));
  const deliveryAddress = addressParts.length ? addressParts.join(", ") : "-";

  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems
    .map((entry, index): OrderDetailsItem | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const itemRecord = entry as Record<string, unknown>;
      const itemId = pickRecordValue(itemRecord, ["id"]) || `${idCandidate}-${index + 1}`;
      const productRecord =
        itemRecord.product && typeof itemRecord.product === "object"
          ? (itemRecord.product as Record<string, unknown>)
          : null;
      const variantRecord =
        itemRecord.variant && typeof itemRecord.variant === "object"
          ? (itemRecord.variant as Record<string, unknown>)
          : null;
      const productName = productRecord ? productRecord.name : "";
      const fallbackName =
        (productRecord ? pickRecordValue(productRecord, ["slug"]) : "") || `Item ${index + 1}`;
      const image = productRecord
        ? pickRecordValue(productRecord, ["primary_image", "image"])
        : "";

      return {
        id: itemId,
        name: getLocalizedText(productName, language, fallbackName),
        color: variantRecord ? pickRecordValue(variantRecord, ["color"]) || "-" : "-",
        size: variantRecord ? pickRecordValue(variantRecord, ["size"]) || "-" : "-",
        quantity: normalizeDisplayValue(itemRecord.quantity),
        unitPrice: normalizeDisplayValue(itemRecord.unit_price),
        lineTotal: normalizeDisplayValue(itemRecord.line_total),
        image: image || "/images/marketpic1.png",
      };
    })
    .filter((item): item is OrderDetailsItem => item !== null);

  const createdAtCandidate = pickRecordValue(record, [
    "created_at",
    "ordered_at",
    "placed_at",
    "date",
  ]);

  return {
    id: idCandidate,
    placedOn: createdAtCandidate ? formatOrderDate(createdAtCandidate) : "-",
    status: pickRecordValue(record, ["status"]) || "-",
    items,
    subtotal: normalizeDisplayValue(record.subtotal),
    shippingPrice: normalizeDisplayValue(record.shipping_price),
    total: normalizeDisplayValue(record.total),
    delivery: {
      name: deliveryName,
      phone: phone || "-",
      address: deliveryAddress,
    },
  };
};

export default function Profile() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const [activeItem, setActiveItem] = useState<MenuItemId>(() =>
    searchParams?.get("tab") === "addresses" ? "addresses" : "account"
  );
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderDetails | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);
  const [addressSnapshot, setAddressSnapshot] = useState<AddressFormState | null>(null);
  const [addressDetailsLoading, setAddressDetailsLoading] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressDeleting, setAddressDeleting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedAddressIds, setSelectedAddressIds] = useState<Set<string>>(
    () => new Set()
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileMeResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormState>(emptyAccountForm);
  const [accountSnapshot, setAccountSnapshot] = useState<AccountFormState>(emptyAccountForm);
  const [accountEditable, setAccountEditable] = useState(false);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const handledEditRef = useRef<string | null>(null);
  const text = {
    myAccount: byLanguage({ EN: "My Account", KA: "ჩემი ანგარიში" }, language),
    orderHistory: byLanguage(
      { EN: "Order History", KA: "შეკვეთების ისტორია" },
      language
    ),
    addresses: byLanguage({ EN: "Addresses", KA: "მისამართები" }, language),
    changePassword: byLanguage(
      { EN: "Change Password", KA: "პაროლის შეცვლა" },
      language
    ),
    logOut: byLanguage({ EN: "Log Out", KA: "გასვლა" }, language),
    logoutQuestion: byLanguage(
      {
        EN: "Are you sure you want to log out?",
        KA: "დარწმუნებული ხარ, რომ გინდა გასვლა?",
      },
      language
    ),
    yes: byLanguage({ EN: "Yes", KA: "კი" }, language),
    no: byLanguage({ EN: "No", KA: "არა" }, language),
    backToOrders: byLanguage(
      { EN: "<< Back To Orders", KA: "<< შეკვეთებზე დაბრუნება" },
      language
    ),
    order: byLanguage({ EN: "Order", KA: "შეკვეთა" }, language),
    placedOn: byLanguage({ EN: "Placed On", KA: "განთავსების თარიღი" }, language),
    status: byLanguage({ EN: "Status", KA: "სტატუსი" }, language),
    items: byLanguage({ EN: "Items", KA: "ნივთები" }, language),
    colour: byLanguage({ EN: "Colour", KA: "ფერი" }, language),
    size: byLanguage({ EN: "Size", KA: "ზომა" }, language),
    quantity: byLanguage({ EN: "Quantity", KA: "რაოდენობა" }, language),
    unitPrice: byLanguage({ EN: "Unit Price", KA: "ერთეულის ფასი" }, language),
    lineTotal: byLanguage({ EN: "Line Total", KA: "ხაზის ჯამი" }, language),
    orderSummary: byLanguage({ EN: "Order Summary", KA: "შეკვეთის შეჯამება" }, language),
    subtotal: byLanguage({ EN: "Subtotal", KA: "შუალედური ჯამი" }, language),
    shipping: byLanguage({ EN: "Shipping", KA: "მიწოდება" }, language),
    deliveryDetails: byLanguage(
      { EN: "Delivery Details", KA: "მიწოდების დეტალები" },
      language
    ),
    orderHelp: byLanguage(
      {
        EN: "Have a Problem Or Question About Order?",
        KA: "შეკვეთასთან დაკავშირებით კითხვა ან პრობლემა გაქვს?",
      },
      language
    ),
    contactUs: byLanguage({ EN: "Contact Us", KA: "დაგვიკავშირდი" }, language),
    firstName: byLanguage({ EN: "First Name", KA: "სახელი" }, language),
    lastName: byLanguage({ EN: "Last Name", KA: "გვარი" }, language),
    email: byLanguage({ EN: "Email", KA: "ელფოსტა" }, language),
    phone: byLanguage({ EN: "Phone", KA: "ტელეფონი" }, language),
    update: byLanguage({ EN: "UPDATE", KA: "განახლება" }, language),
    addNewAddress: byLanguage(
      { EN: "Add New Address", KA: "მისამართის დამატება" },
      language
    ),
    deleteAddresses: byLanguage({ EN: "Delete addresses", KA: "მისამართების წაშლა" }, language),
    deleteSelected: byLanguage({ EN: "Delete Selected", KA: "არჩეულის წაშლა" }, language),
    addressesTitle: byLanguage({ EN: "ADDRESSES", KA: "მისამართები" }, language),
    details: byLanguage({ EN: "Details", KA: "დეტალები" }, language),
    noAddressAddedYet: byLanguage(
      { EN: "No Address Added Yet", KA: "მისამართი ჯერ დამატებული არ არის" },
      language
    ),
    phoneNumber: byLanguage({ EN: "Phone Number", KA: "ტელეფონის ნომერი" }, language),
    country: byLanguage({ EN: "Country", KA: "ქვეყანა" }, language),
    state: byLanguage({ EN: "State", KA: "რეგიონი" }, language),
    city: byLanguage({ EN: "City", KA: "ქალაქი" }, language),
    addressNo1: byLanguage({ EN: "Address No 1", KA: "მისამართი 1" }, language),
    addressNo2: byLanguage({ EN: "Address No 2", KA: "მისამართი 2" }, language),
    postalCode: byLanguage({ EN: "Postal Code", KA: "საფოსტო კოდი" }, language),
    name: byLanguage({ EN: "Name", KA: "სახელი" }, language),
    optional: byLanguage({ EN: "(optional)", KA: "(არასავალდებულო)" }, language),
    add: byLanguage({ EN: "ADD", KA: "დამატება" }, language),
    closeAddressForm: byLanguage(
      { EN: "Close address form", KA: "მისამართის ფორმის დახურვა" },
      language
    ),
    deleteAddress: byLanguage({ EN: "Delete address", KA: "მისამართის წაშლა" }, language),
    ordersTitle: byLanguage({ EN: "ORDERS", KA: "შეკვეთები" }, language),
    orderNumber: byLanguage({ EN: "Order Number", KA: "შეკვეთის ნომერი" }, language),
    date: byLanguage({ EN: "Date", KA: "თარიღი" }, language),
    total: byLanguage({ EN: "Total", KA: "ჯამი" }, language),
    changePasswordTitle: byLanguage({ EN: "Change password", KA: "პაროლის შეცვლა" }, language),
    enterNewPassword: byLanguage(
      { EN: "Enter New Password", KA: "შეიყვანე ახალი პაროლი" },
      language
    ),
    confirmPassword: byLanguage({ EN: "Confirm Password", KA: "დაადასტურე პაროლი" }, language),
    showPassword: byLanguage({ EN: "Show password", KA: "პაროლის ჩვენება" }, language),
    hidePassword: byLanguage({ EN: "Hide password", KA: "პაროლის დამალვა" }, language),
    submit: byLanguage({ EN: "Submit", KA: "გაგზავნა" }, language),
    submitting: byLanguage({ EN: "Submitting...", KA: "იგზავნება..." }, language),
    passwordFieldsRequired: byLanguage(
      { EN: "Please fill in both password fields.", KA: "გთხოვ შეავსე პაროლის ორივე ველი." },
      language
    ),
    passwordsDoNotMatch: byLanguage({ EN: "Passwords do not match.", KA: "პაროლები არ ემთხვევა." }, language),
    passwordChanged: byLanguage(
      { EN: "Password updated successfully.", KA: "პაროლი წარმატებით განახლდა." },
      language
    ),
    passwordChangeFailed: byLanguage(
      { EN: "Failed to change password.", KA: "პაროლის შეცვლა ვერ მოხერხდა." },
      language
    ),
    deleteAddressTitle: byLanguage({ EN: "Delete Address", KA: "მისამართის წაშლა" }, language),
    deleteAddressQuestion: byLanguage(
      {
        EN: "Are you sure you want to delete this address?",
        KA: "დარწმუნებული ხარ, რომ გინდა ამ მისამართის წაშლა?",
      },
      language
    ),
    cancel: byLanguage({ EN: "Cancel", KA: "გაუქმება" }, language),
    delete: byLanguage({ EN: "Delete", KA: "წაშლა" }, language),
    edit: byLanguage({ EN: "EDIT", KA: "ჩასწორება" }, language),
    cancelEdit: byLanguage({ EN: "CANCEL", KA: "გაუქმება" }, language),
    updating: byLanguage({ EN: "UPDATING...", KA: "მიმდინარეობს განახლება..." }, language),
    noChangesToUpdate: byLanguage(
      { EN: "No changes to update.", KA: "ცვლილება არ არის." },
      language
    ),
    profileUpdated: byLanguage(
      { EN: "Profile updated.", KA: "პროფილი განახლდა." },
      language
    ),
    profileUpdatedVerifyEmail: byLanguage(
      {
        EN: "Profile updated. Verify your new email to activate it.",
        KA: "პროფილი განახლდა. ახალი ელ.ფოსტის გასააქტიურებლად დაადასტურე.",
      },
      language
    ),
    missingApiBaseUrl: byLanguage(
      { EN: "Missing API base URL.", KA: "API მისამართი მითითებული არ არის." },
      language
    ),
    missingAccessToken: byLanguage(
      { EN: "You need to sign in first.", KA: "ჯერ უნდა შეხვიდე ანგარიშში." },
      language
    ),
    profileLoadFailed: byLanguage(
      { EN: "Failed to load profile.", KA: "პროფილის ჩატვირთვა ვერ მოხერხდა." },
      language
    ),
    profileUpdateFailed: byLanguage(
      { EN: "Failed to update profile.", KA: "პროფილის განახლება ვერ მოხერხდა." },
      language
    ),
    loadingProfile: byLanguage(
      { EN: "Loading profile...", KA: "პროფილი იტვირთება..." },
      language
    ),
    loadingOrderDetails: byLanguage(
      { EN: "Loading order details...", KA: "შეკვეთის დეტალები იტვირთება..." },
      language
    ),
    orderDetailsLoadFailed: byLanguage(
      { EN: "Failed to load order details.", KA: "შეკვეთის დეტალების ჩატვირთვა ვერ მოხერხდა." },
      language
    ),
    loadingAddressDetails: byLanguage(
      { EN: "Loading address details...", KA: "მისამართის დეტალები იტვირთება..." },
      language
    ),
    addressDetailsLoadFailed: byLanguage(
      { EN: "Failed to load address details.", KA: "მისამართის დეტალების ჩატვირთვა ვერ მოხერხდა." },
      language
    ),
    addressUpdateFailed: byLanguage(
      { EN: "Failed to update address.", KA: "მისამართის განახლება ვერ მოხერხდა." },
      language
    ),
    addressCreateFailed: byLanguage(
      { EN: "Failed to add address.", KA: "მისამართის დამატება ვერ მოხერხდა." },
      language
    ),
    addressDeleteFailed: byLanguage(
      { EN: "Failed to delete address.", KA: "მისამართის წაშლა ვერ მოხერხდა." },
      language
    ),
    deleting: byLanguage({ EN: "DELETING...", KA: "მიმდინარეობს წაშლა..." }, language),
    confirmEmailMenu: byLanguage(
      { EN: "Confirm Email", KA: "ელ.ფოსტის დადასტურება" },
      language
    ),
    confirmEmailTitle: byLanguage(
      { EN: "Confirm Email", KA: "ელ.ფოსტის დადასტურება" },
      language
    ),
    confirmEmailDescription: byLanguage(
      {
        EN: "Your account is inactive. Verify your email to activate it.",
        KA: "ანგარიში არააქტიურია. გააქტიურებისთვის დაადასტურე ელ.ფოსტა.",
      },
      language
    ),
    sendVerificationCode: byLanguage(
      { EN: "Send Verification Code", KA: "დადასტურების კოდის გაგზავნა" },
      language
    ),
    verifyEmailTitle: byLanguage({ EN: "Verify Email", KA: "ელ.ფოსტის დადასტურება" }, language),
    verifyEmailDescription: byLanguage(
      {
        EN: "Enter the verification code sent to this email address.",
        KA: "შეიყვანე ამ ელ.ფოსტაზე გამოგზავნილი დადასტურების კოდი.",
      },
      language
    ),
    codeLabel: byLanguage({ EN: "Verification code", KA: "დადასტურების კოდი" }, language),
    codePlaceholder: byLanguage({ EN: "123456", KA: "123456" }, language),
    back: byLanguage({ EN: "Back", KA: "უკან" }, language),
    confirm: byLanguage({ EN: "Confirm", KA: "დადასტურება" }, language),
    confirming: byLanguage({ EN: "Confirming...", KA: "მიმდინარეობს დადასტურება..." }, language),
    resendCode: byLanguage({ EN: "Resend code", KA: "კოდის თავიდან გაგზავნა" }, language),
    resendingCode: byLanguage({ EN: "Resending...", KA: "თავიდან იგზავნება..." }, language),
    sendingCode: byLanguage(
      { EN: "Sending verification code...", KA: "იგზავნება დადასტურების კოდი..." },
      language
    ),
    codeSentFallback: byLanguage(
      {
        EN: "If an account exists with this email, a verification code has been sent.",
        KA: "თუ ეს ელ.ფოსტა ანგარიშთან არის დაკავშირებული, დადასტურების კოდი გაიგზავნა.",
      },
      language
    ),
    verificationCodeRequired: byLanguage(
      {
        EN: "Please enter the verification code.",
        KA: "გთხოვ შეიყვანე დადასტურების კოდი.",
      },
      language
    ),
    invalidOrExpiredCode: byLanguage(
      { EN: "Wrong code or expired code.", KA: "კოდი არასწორია ან ვადა გაუვიდა." },
      language
    ),
    verificationRequestFailed: byLanguage(
      {
        EN: "Failed to send verification code.",
        KA: "დადასტურების კოდის გაგზავნა ვერ მოხერხდა.",
      },
      language
    ),
    verificationConfirmFailed: byLanguage(
      {
        EN: "Failed to verify email. Please try again.",
        KA: "ელ.ფოსტის დადასტურება ვერ მოხერხდა. სცადე თავიდან.",
      },
      language
    ),
    emailVerified: byLanguage(
      { EN: "Email verified.", KA: "ელ.ფოსტა დადასტურებულია." },
      language
    ),
    verificationSessionExpired: byLanguage(
      {
        EN: "Verification session expired. Please reopen verification.",
        KA: "დადასტურების სესია ამოიწურა. გთხოვ თავიდან გახსენი დადასტურება.",
      },
      language
    ),
  };
  const showConfirmEmailTab = profile?.active_status === false;
  const menuItems: Array<{ id: MenuItemId; label: string }> = [
    { id: "account", label: text.myAccount },
    { id: "orders", label: text.orderHistory },
    { id: "password", label: text.changePassword },
    ...(showConfirmEmailTab
      ? [{ id: "confirmEmail" as const, label: text.confirmEmailMenu }]
      : []),
    { id: "addresses", label: text.addresses },
    { id: "logout", label: text.logOut },
  ];
  const orders = profile ? mapOrderHistory(profile.order_history) : [];
  const visibleOrders = isLoggedIn ? (orders.length > 0 ? orders : fallbackOrders) : [];
  const showOrderDetails = activeItem === "orders" && selectedOrder !== null;
  const selectedOrderDisplayId = selectedOrderDetails?.id || selectedOrder?.id || "-";
  const selectedOrderPlacedOn = selectedOrderDetails?.placedOn || selectedOrder?.date || "-";
  const showAddressDetails = activeItem === "addresses" && showAddressForm;
  const hasAddresses = addresses.length > 0;
  const isEditingAddress = editingAddressId !== null;
  const isAddressBusy = addressDetailsLoading || addressSubmitting || addressDeleting;
  const activeMenuLabel =
    menuItems.find((item) => item.id === activeItem)?.label ?? text.myAccount;

  useEffect(() => {
    writeAddresses(addresses);
  }, [addresses]);

  useEffect(() => {
    if (activeItem === "confirmEmail" && !showConfirmEmailTab) {
      setActiveItem("account");
    }
  }, [activeItem, showConfirmEmailTab]);

  const applyProfileData = (nextProfile: ProfileMeResponse) => {
    setProfile(nextProfile);
    setIsLoggedIn(true);
    const nextAddresses = nextProfile.addresses.map(mapProfileAddressToAddress);
    setAddresses(nextAddresses);
    const nextAccountForm = mapProfileToAccountForm(nextProfile);
    setAccountForm(nextAccountForm);
    setAccountSnapshot(nextAccountForm);
    setAccountEditable(false);
  };

  const loadProfile = async () => {
    const primaryUrl = buildApiUrl("/api/me/");
    const fallbackUrl = buildApiUrl("/api/auth/me/");
    const meUrls = [primaryUrl, fallbackUrl].filter(
      (url, index, list): url is string => Boolean(url) && list.indexOf(url) === index
    );

    if (!meUrls.length) {
      setProfileError(text.missingApiBaseUrl);
      return null;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      let response: Response | null = null;
      let payload: unknown = null;

      for (let index = 0; index < meUrls.length; index += 1) {
        const url = meUrls[index];
        const isLast = index === meUrls.length - 1;

        try {
          const nextResponse = await fetchWithAuthRetry(url, {
            method: "GET",
            cache: "no-store",
          });
          if (!nextResponse) {
            if (isLast) {
              response = null;
              payload = null;
            }
            continue;
          }

          const nextPayload = await nextResponse.json().catch(() => null);

          if (nextResponse.ok) {
            response = nextResponse;
            payload = nextPayload;
            break;
          }

          if (nextResponse.status !== 404 || isLast) {
            response = nextResponse;
            payload = nextPayload;
            break;
          }
        } catch {
          if (isLast) {
            response = null;
            payload = null;
          }
        }
      }

      if (!response || !response.ok) {
        if (response?.status === 401 || response?.status === 403) {
          setIsLoggedIn(false);
          setProfileError(text.missingAccessToken);
          return null;
        }
        setProfileError(getApiMessage(payload, text.profileLoadFailed));
        return null;
      }

      const normalized = normalizeProfileResponse(payload);
      if (!normalized) {
        setProfileError(text.profileLoadFailed);
        return null;
      }

      applyProfileData(normalized);
      return normalized;
    } finally {
      setProfileLoading(false);
    }
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setSelectedOrderDetails(null);
    setOrderDetailsError(null);
    setOrderDetailsLoading(false);
  };

  const openOrderDetails = async (order: OrderListItem) => {
    if (!order.apiId) {
      return;
    }

    setSelectedOrder(order);
    setSelectedOrderDetails(null);
    setOrderDetailsError(null);

    const detailsUrl = buildApiUrl(`/api/orders/${encodeURIComponent(order.apiId)}/`);
    if (!detailsUrl) {
      setOrderDetailsError(text.missingApiBaseUrl);
      return;
    }

    try {
      setOrderDetailsLoading(true);
      const response = await fetchWithAuthRetry(detailsUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!response) {
        setOrderDetailsError(text.orderDetailsLoadFailed);
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setIsLoggedIn(false);
          setOrderDetailsError(text.missingAccessToken);
          return;
        }
        setOrderDetailsError(getApiMessage(payload, text.orderDetailsLoadFailed));
        return;
      }

      const normalized = normalizeOrderDetailsResponse(payload, language);
      if (!normalized) {
        setOrderDetailsError(text.orderDetailsLoadFailed);
        return;
      }

      setSelectedOrderDetails(normalized);
    } catch {
      setOrderDetailsError(text.orderDetailsLoadFailed);
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const requestVerificationCode = async (email: string, isResend = false) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setVerificationError(text.verificationSessionExpired);
      return;
    }

    const requestUrl = buildApiUrl("/api/auth/email/verify/request/");
    if (!requestUrl) {
      setVerificationError(text.missingApiBaseUrl);
      return;
    }

    setVerificationError(null);
    setVerificationMessage(text.sendingCode);
    if (isResend) {
      setResendingCode(true);
    } else {
      setRequestingCode(true);
    }

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setVerificationMessage(null);
        setVerificationError(getApiMessage(data, text.verificationRequestFailed));
        return;
      }

      const detail =
        data && typeof data === "object" && typeof (data as { detail?: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : text.codeSentFallback;
      setVerificationMessage(detail);
    } catch {
      setVerificationMessage(null);
      setVerificationError(text.verificationRequestFailed);
    } finally {
      if (isResend) {
        setResendingCode(false);
      } else {
        setRequestingCode(false);
      }
    }
  };

  const startEmailVerification = (email: string) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setAccountError(text.verificationSessionExpired);
      return;
    }

    setVerificationOpen(true);
    setVerificationEmail(normalizedEmail);
    setVerificationCode("");
    setVerificationError(null);
    setVerificationMessage(null);
    void requestVerificationCode(normalizedEmail);
  };

  const handleVerificationBack = () => {
    if (confirmingCode) {
      return;
    }
    setVerificationOpen(false);
    setVerificationCode("");
    setVerificationError(null);
    setVerificationMessage(null);
    setVerificationEmail("");
  };

  const handleConfirmVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerificationError(null);
    setVerificationMessage(null);

    const normalizedEmail = verificationEmail.trim();
    if (!normalizedEmail) {
      setVerificationError(text.verificationSessionExpired);
      return;
    }

    const normalizedCode = verificationCode.trim();
    if (!normalizedCode) {
      setVerificationError(text.verificationCodeRequired);
      return;
    }

    const confirmUrl = buildApiUrl("/api/auth/email/verify/confirm/");
    if (!confirmUrl) {
      setVerificationError(text.missingApiBaseUrl);
      return;
    }

    try {
      setConfirmingCode(true);
      const response = await fetch(confirmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          code: normalizedCode,
        }),
      });

      const verifyData = await response.json().catch(() => null);

      if (!response.ok) {
        setVerificationError(getApiMessage(verifyData, text.invalidOrExpiredCode));
        return;
      }

      setVerificationOpen(false);
      setVerificationCode("");
      setVerificationEmail("");
      setAccountSuccess(text.emailVerified);
      if (activeItem === "confirmEmail") {
        setActiveItem("account");
      }
      await loadProfile();
    } catch {
      setVerificationError(text.verificationConfirmFailed);
    } finally {
      setConfirmingCode(false);
    }
  };

  useEffect(() => {
    clearLegacyAuthStorage();
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccountFormChange =
    (field: keyof AccountFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setAccountForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const accountHasChanges =
    normalizeTrimmedString(accountForm.first_name) !==
      normalizeTrimmedString(accountSnapshot.first_name) ||
    normalizeTrimmedString(accountForm.last_name) !==
      normalizeTrimmedString(accountSnapshot.last_name) ||
    normalizeTrimmedString(accountForm.email).toLowerCase() !==
      normalizeTrimmedString(accountSnapshot.email).toLowerCase() ||
    normalizeTrimmedString(accountForm.phone_number) !==
      normalizeTrimmedString(accountSnapshot.phone_number);

  const toggleAccountEditMode = () => {
    if (accountEditable) {
      setAccountForm(accountSnapshot);
    }
    setAccountEditable((current) => !current);
    setAccountError(null);
    setAccountSuccess(null);
  };

  const handleAccountUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    if (!accountEditable) {
      return;
    }

    if (!accountHasChanges) {
      setAccountSuccess(text.noChangesToUpdate);
      return;
    }

    const patchUrl = buildApiUrl("/api/auth/me/");
    if (!patchUrl) {
      setAccountError(text.missingApiBaseUrl);
      return;
    }

    const body = {
      first_name: accountForm.first_name.trim(),
      last_name: accountForm.last_name.trim(),
      phone_number: accountForm.phone_number.trim(),
      email: accountForm.email.trim(),
    };

    try {
      setAccountSubmitting(true);
      const response = await fetchWithAuthRetry(patchUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response) {
        setAccountError(text.profileUpdateFailed);
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setIsLoggedIn(false);
          setAccountError(text.missingAccessToken);
          return;
        }
        setAccountError(getApiMessage(payload, text.profileUpdateFailed));
        return;
      }

      const normalized = normalizeProfileResponse(payload);
      if (!normalized) {
        setAccountError(text.profileUpdateFailed);
        return;
      }

      const emailChanged =
        normalizeTrimmedString(accountSnapshot.email).toLowerCase() !==
        normalizeTrimmedString(normalized.email).toLowerCase();

      applyProfileData(normalized);
      setAccountEditable(false);

      if (emailChanged) {
        setAccountSuccess(text.profileUpdatedVerifyEmail);
        startEmailVerification(normalized.email);
      } else {
        setAccountSuccess(text.profileUpdated);
      }
    } catch {
      setAccountError(text.profileUpdateFailed);
    } finally {
      setAccountSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      setPasswordError(text.passwordFieldsRequired);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(text.passwordsDoNotMatch);
      return;
    }

    const changePasswordUrl = buildApiUrl("/api/auth/password/change/");
    if (!changePasswordUrl) {
      setPasswordError(text.missingApiBaseUrl);
      return;
    }

    try {
      setPasswordSubmitting(true);
      const response = await fetchWithAuthRetry(changePasswordUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_password: newPassword,
          new_password2: confirmNewPassword,
        }),
      });

      if (!response) {
        setPasswordError(text.passwordChangeFailed);
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setIsLoggedIn(false);
          setPasswordError(text.missingAccessToken);
          return;
        }
        setPasswordError(getApiMessage(payload, text.passwordChangeFailed));
        return;
      }

      const detail =
        payload && typeof payload === "object" && typeof (payload as { detail?: unknown }).detail === "string"
          ? (payload as { detail: string }).detail
          : text.passwordChanged;

      setPasswordSuccess(detail);
      setNewPassword("");
      setConfirmNewPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch {
      setPasswordError(text.passwordChangeFailed);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleAddressChange =
    (field: keyof AddressFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setAddressError(null);
      setAddressSuccess(null);
      setAddressForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleAddAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddressError(null);
    setAddressSuccess(null);

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (editingAddressId) {
      const currentAddress =
        addresses.find((address) => address.id === editingAddressId) ?? null;
      const apiId = currentAddress ? resolveAddressApiId(currentAddress) : null;

      if (!apiId) {
        setAddresses((prev) =>
          prev.map((address) =>
            address.id === editingAddressId ? { ...address, ...addressForm } : address
          )
        );
        setShowAddressForm(false);
        setEditingAddressId(null);
        setAddressSnapshot(null);
        setAddressForm(emptyAddressForm);
        return;
      }

      const patchUrl = buildAddressApiUrl(apiId);
      if (!patchUrl) {
        setAddressError(text.missingApiBaseUrl);
        return;
      }

      const snapshot = addressSnapshot ?? (currentAddress ? mapAddressToFormState(currentAddress) : null);
      if (!snapshot) {
        setAddressError(text.addressUpdateFailed);
        return;
      }

      const patchBody = getChangedAddressPatchPayload(addressForm, snapshot);
      if (!Object.keys(patchBody).length) {
        setAddressSuccess(text.noChangesToUpdate);
        return;
      }

      try {
        setAddressSubmitting(true);
        const response = await fetchWithAuthRetry(patchUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patchBody),
        });

        if (!response) {
          setAddressError(text.addressUpdateFailed);
          return;
        }

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setIsLoggedIn(false);
            setAddressError(text.missingAccessToken);
            return;
          }
          setAddressError(getApiMessage(payload, text.addressUpdateFailed));
          return;
        }

        const normalizedPayload = normalizeProfileAddressResponse(payload);
        if (normalizedPayload) {
          const serverAddress = mapProfileAddressToAddress(normalizedPayload, 0);
          const nextAddress: Address = {
            ...serverAddress,
            id: editingAddressId,
            apiId: serverAddress.apiId ?? apiId,
          };

          setAddresses((prev) =>
            prev.map((address) =>
              address.id === editingAddressId ? { ...address, ...nextAddress } : address
            )
          );
        } else {
          const normalizedForm = normalizeAddressFormState(addressForm);
          setAddresses((prev) =>
            prev.map((address) =>
              address.id === editingAddressId ? { ...address, ...normalizedForm, apiId } : address
            )
          );
        }
      } catch {
        setAddressError(text.addressUpdateFailed);
        return;
      } finally {
        setAddressSubmitting(false);
      }
    } else {
      const createUrl = buildApiUrl("/api/auth/addresses/");
      if (!createUrl) {
        setAddressError(text.missingApiBaseUrl);
        return;
      }

      const createBody = mapAddressFormToApiPayload(addressForm);

      try {
        setAddressSubmitting(true);
        const response = await fetchWithAuthRetry(createUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createBody),
        });

        if (!response) {
          setAddressError(text.addressCreateFailed);
          return;
        }

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setIsLoggedIn(false);
            setAddressError(text.missingAccessToken);
            return;
          }
          setAddressError(getApiMessage(payload, text.addressCreateFailed));
          return;
        }

        const normalizedPayload = normalizeProfileAddressResponse(payload);
        if (!normalizedPayload) {
          setAddressError(text.addressCreateFailed);
          return;
        }

        const serverAddress = mapProfileAddressToAddress(normalizedPayload, addresses.length);
        const apiId = resolveAddressApiId(serverAddress);
        const newAddress: Address = {
          ...serverAddress,
          id: apiId ?? `local-${Date.now()}`,
          apiId,
        };

        setAddresses((prev) => [...prev, newAddress]);
      } catch {
        setAddressError(text.addressCreateFailed);
        return;
      } finally {
        setAddressSubmitting(false);
      }
    }

    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressSnapshot(null);
    setAddressForm(emptyAddressForm);
  };

  const openNewAddressForm = () => {
    setEditingAddressId(null);
    setAddressSnapshot(null);
    setAddressError(null);
    setAddressSuccess(null);
    setAddressForm(emptyAddressForm);
    setShowAddressForm(true);
  };

  async function openEditAddressForm(address: Address) {
    const initialForm = mapAddressToFormState(address);
    setEditingAddressId(address.id);
    setAddressForm(initialForm);
    setAddressSnapshot(initialForm);
    setAddressError(null);
    setAddressSuccess(null);
    setShowAddressForm(true);

    const apiId = resolveAddressApiId(address);
    if (!apiId) {
      return;
    }

    const detailsUrl = buildAddressApiUrl(apiId);
    if (!detailsUrl) {
      setAddressError(text.missingApiBaseUrl);
      return;
    }

    try {
      setAddressDetailsLoading(true);
      const response = await fetchWithAuthRetry(detailsUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!response) {
        setAddressError(text.addressDetailsLoadFailed);
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setIsLoggedIn(false);
          setAddressError(text.missingAccessToken);
          return;
        }
        setAddressError(getApiMessage(payload, text.addressDetailsLoadFailed));
        return;
      }

      const normalizedPayload = normalizeProfileAddressResponse(payload);
      if (!normalizedPayload) {
        setAddressError(text.addressDetailsLoadFailed);
        return;
      }

      const serverAddress = mapProfileAddressToAddress(normalizedPayload, 0);
      const nextAddress: Address = {
        ...serverAddress,
        id: address.id,
        apiId: serverAddress.apiId ?? apiId,
      };
      const nextForm = mapAddressToFormState(nextAddress);

      setAddresses((prev) => {
        const index = prev.findIndex((item) => item.id === address.id);
        if (index === -1) {
          return [...prev, nextAddress];
        }
        const next = [...prev];
        next[index] = { ...next[index], ...nextAddress };
        return next;
      });
      setAddressForm(nextForm);
      setAddressSnapshot(nextForm);
    } catch {
      setAddressError(text.addressDetailsLoadFailed);
    } finally {
      setAddressDetailsLoading(false);
    }
  }

  useEffect(() => {
    if (!searchParams) return;
    const editId = searchParams.get("edit");

    if (!editId || handledEditRef.current === editId) {
      return;
    }

    const address = addresses.find((item) => item.id === editId);
    if (address) {
      queueMicrotask(() => {
        void openEditAddressForm(address);
        handledEditRef.current = editId;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, addresses]);

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressSnapshot(null);
    setAddressForm(emptyAddressForm);
    setAddressError(null);
    setAddressSuccess(null);
    setAddressDetailsLoading(false);
    setAddressSubmitting(false);
    setAddressDeleting(false);
  };

  const handleLogout = async () => {
    if (logoutSubmitting) return;

    setLogoutSubmitting(true);

    try {
      await fetch("/api/auth/logout/", {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      // Best effort logout request; continue with local logout flow.
    }

    clearLegacyAuthStorage();

    closeOrderDetails();
    closeAddressForm();
    setMobileMenuOpen(false);
    setIsLoggedIn(false);
    setProfile(null);
    setAddresses([]);
    setProfileError(null);
    setAccountError(null);
    setAccountSuccess(null);
    setAccountEditable(false);
    setAccountForm(emptyAccountForm);
    setAccountSnapshot(emptyAccountForm);
    setVerificationOpen(false);
    setVerificationEmail("");
    setVerificationCode("");
    setActiveItem("logout");
    setConfirmLogoutOpen(false);
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordError(null);
    setPasswordSuccess(null);
    setLogoutSubmitting(false);

    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  };

  const openLogoutConfirmation = () => {
    if (!isLoggedIn) return;
    setConfirmLogoutOpen(true);
  };

  const handleMenuSelect = (id: MenuItemId) => {
    setActiveItem(id);
    setConfirmLogoutOpen(false);
    if (id !== "orders") {
      closeOrderDetails();
    }
    if (id !== "addresses") {
      closeAddressForm();
    }
  };

  const toggleDeleteMode = () => {
    setDeleteMode((current) => {
      if (current) {
        setSelectedAddressIds(new Set());
      }
      return !current;
    });
  };

  const toggleAddressSelection = (id: string) => {
    setSelectedAddressIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!selectedAddressIds.size || addressDeleting) return;

    setAddressError(null);
    setAddressSuccess(null);

    const selectedItems = addresses.filter((address) => selectedAddressIds.has(address.id));
    if (!selectedItems.length) {
      setSelectedAddressIds(new Set());
      setDeleteMode(false);
      return;
    }

    const remoteItems = selectedItems
      .map((address) => ({
        id: address.id,
        apiId: resolveAddressApiId(address),
      }))
      .filter((item): item is { id: string; apiId: string } => Boolean(item.apiId));

    const removableIds = new Set<string>();
    for (const address of selectedItems) {
      if (!resolveAddressApiId(address)) {
        removableIds.add(address.id);
      }
    }

    let firstFailureMessage: string | null = null;

    try {
      setAddressDeleting(true);

      for (const item of remoteItems) {
        const deleteUrl = buildAddressApiUrl(item.apiId);
        if (!deleteUrl) {
          firstFailureMessage = firstFailureMessage ?? text.missingApiBaseUrl;
          continue;
        }

        try {
          const response = await fetchWithAuthRetry(deleteUrl, {
            method: "DELETE",
          });

          if (!response) {
            firstFailureMessage = firstFailureMessage ?? text.addressDeleteFailed;
            continue;
          }

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            if (response.status === 401 || response.status === 403) {
              setIsLoggedIn(false);
              firstFailureMessage = firstFailureMessage ?? text.missingAccessToken;
              continue;
            }
            firstFailureMessage =
              firstFailureMessage ?? getApiMessage(payload, text.addressDeleteFailed);
            continue;
          }

          removableIds.add(item.id);
        } catch {
          firstFailureMessage = firstFailureMessage ?? text.addressDeleteFailed;
        }
      }
    } finally {
      setAddressDeleting(false);
    }

    if (!removableIds.size) {
      if (firstFailureMessage) {
        setAddressError(firstFailureMessage);
      }
      return;
    }

    setAddresses((prev) => prev.filter((address) => !removableIds.has(address.id)));

    if (removableIds.size === selectedItems.length) {
      setSelectedAddressIds(new Set());
      setDeleteMode(false);
      return;
    }

    const failedIds = new Set(selectedItems.map((item) => item.id).filter((id) => !removableIds.has(id)));
    setSelectedAddressIds(failedIds);
    setAddressError(firstFailureMessage ?? text.addressDeleteFailed);
  };

  const handleDeleteCurrentAddress = async () => {
    if (!editingAddressId) return;

    setAddressError(null);
    setAddressSuccess(null);

    const currentAddress =
      addresses.find((address) => address.id === editingAddressId) ?? null;
    const apiId = currentAddress ? resolveAddressApiId(currentAddress) : null;

    if (apiId) {
      const deleteUrl = buildAddressApiUrl(apiId);
      if (!deleteUrl) {
        setAddressError(text.missingApiBaseUrl);
        return;
      }

      try {
        setAddressDeleting(true);
        const response = await fetchWithAuthRetry(deleteUrl, {
          method: "DELETE",
        });

        if (!response) {
          setAddressError(text.addressDeleteFailed);
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          if (response.status === 401 || response.status === 403) {
            setIsLoggedIn(false);
            setAddressError(text.missingAccessToken);
            return;
          }
          setAddressError(getApiMessage(payload, text.addressDeleteFailed));
          return;
        }
      } catch {
        setAddressError(text.addressDeleteFailed);
        return;
      } finally {
        setAddressDeleting(false);
      }
    }

    setAddresses((prev) => prev.filter((address) => address.id !== editingAddressId));
    setConfirmDeleteOpen(false);
    closeAddressForm();
    setActiveItem("addresses");
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo isFixed={false} />

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pt-6 sm:px-6 sm:pt-6">
        <div className="h-px w-full bg-black/20" />

        <div
          className={`relative flex items-center justify-center pb-16 sm:pb-20 ${
            showAddressDetails ? "mt-2 sm:mt-2" : "mt-8 sm:mt-16"
          }`}
        >
          {showOrderDetails ? (
            <div
              className="relative mx-auto w-full max-w-[360px] rounded-2xl border border-slate-200 bg-white px-6 py-5 text-[10px] text-slate-600 shadow-sm lg:max-w-[620px] lg:rounded-none lg:border-0 lg:bg-transparent lg:bg-[url('/images/prof-div2.png')] lg:bg-contain lg:bg-center lg:bg-no-repeat lg:px-14 lg:py-6 lg:text-[11px] lg:shadow-none lg:aspect-[833/927]"
            >
              <div className="flex flex-col gap-4 text-[9px] uppercase tracking-[0.16em] text-slate-600 sm:flex-row sm:items-start sm:justify-between sm:text-[10px] sm:tracking-[0.2em]">
                <button
                  type="button"
                  onClick={() => {
                    closeOrderDetails();
                    setActiveItem("orders");
                  }}
                  className="text-slate-600 transition-colors hover:text-slate-900"
                >
                  {text.backToOrders}
                </button>

                <div className="flex flex-col items-center gap-2 text-center sm:flex-1">
                  <div className="flex items-center gap-2 text-xs font-medium tracking-[0.28em] text-slate-700 sm:text-sm sm:tracking-[0.35em]">
                    {/* <span className="h-2 w-2 rounded-full border border-slate-500" /> */}
                    <span>
                      {text.order}: {selectedOrderDisplayId}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
                      {text.placedOn}: {selectedOrderPlacedOn}
                    </span>
                    <span className="text-[9px] tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
                      {text.status}: {selectedOrderDetails?.status || "-"}
                    </span>
                  </div>
                </div>

                <span className="hidden w-[110px] sm:block" />
              </div>

              {orderDetailsLoading ? (
                <div className="mt-8 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-center text-[10px] uppercase tracking-[0.2em] text-slate-600">
                  {text.loadingOrderDetails}
                </div>
              ) : orderDetailsError ? (
                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[10px] uppercase tracking-[0.2em] text-red-600">
                  {orderDetailsError}
                </div>
              ) : selectedOrderDetails ? (
                <>
                  <div className="mt-4 h-px w-full bg-slate-200 sm:mt-6" />

                  <div className="mt-6 uppercase tracking-[0.2em] text-slate-500">
                    {text.items}:
                  </div>

                  <div className="mt-4 space-y-4">
                    {selectedOrderDetails.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 border-b border-slate-200 pb-4 last:border-b-0 sm:flex-row sm:items-start sm:gap-4"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 shrink-0 object-cover sm:h-16 sm:w-16"
                        />
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1 text-[10px] text-slate-600 sm:text-[11px]">
                            <div className="text-[10px] font-medium text-slate-700 sm:text-[11px]">
                              {item.name}
                            </div>
                            <div>
                              {text.colour}: {item.color}
                            </div>
                            <div>
                              {text.size}: {item.size}
                            </div>
                            <div>
                              {text.quantity}: {item.quantity}
                            </div>
                            <div>
                              {text.unitPrice}: {item.unitPrice}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-600 sm:text-[11px]">
                            {text.lineTotal}: {item.lineTotal}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 h-px w-full bg-slate-200 sm:mt-6" />

                  <div className="mt-4 uppercase tracking-[0.2em] text-slate-500">
                    {text.orderSummary}
                  </div>
                  <div className="mt-3 space-y-2 text-[10px] text-slate-500 sm:text-[11px]">
                    <div className="flex items-center justify-between">
                      <span>{text.subtotal}</span>
                      <span>{selectedOrderDetails.subtotal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{text.shipping}</span>
                      <span>{selectedOrderDetails.shippingPrice}</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>{text.total}</span>
                      <span>{selectedOrderDetails.total}</span>
                    </div>
                  </div>

                  <div className="mt-4 h-px w-full bg-slate-200 sm:mt-6" />

                  <div className="mt-4 uppercase tracking-[0.2em] text-slate-500">
                    {text.deliveryDetails}
                  </div>
                  <div className="mt-3 space-y-2 text-[10px] text-slate-600 sm:text-[11px]">
                    <div className="flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M4 16c1.4-2.6 4.1-4 6-4s4.6 1.4 6 4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>{selectedOrderDetails.delivery.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M5 6c0-2 1.8-3 4-3h2c2.2 0 4 1 4 3v8c0 1.7-1.5 3-3.5 3h-3C6.5 17 5 15.7 5 14V6Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M8 6h4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>{selectedOrderDetails.delivery.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M10 17s5-5.2 5-9a5 5 0 0 0-10 0c0 3.8 5 9 5 9Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <circle
                          cx="10"
                          cy="8"
                          r="2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                      </svg>
                      <span>{selectedOrderDetails.delivery.address}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[10px] uppercase tracking-[0.2em] text-red-600">
                  {text.orderDetailsLoadFailed}
                </div>
              )}

              <div className="mt-6 h-px w-full bg-slate-200" />

              <div className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-slate-700">
                {text.orderHelp}
                <div className="mt-2 text-[11px] font-medium underline">
                  <Link href="/contactus" className="hover:text-slate-900">
                    {text.contactUs}
                  </Link>
                </div>
              </div>
            </div>
          ) : showAddressDetails ? (
            <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-sm lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:bg-[url('/images/prof-div3.png')] lg:bg-contain lg:bg-center lg:bg-no-repeat lg:aspect-[883/871]">
              <div className="flex h-full w-full flex-col items-stretch px-5 py-6 sm:px-8 lg:grid lg:grid-cols-[275px_1px_minmax(0,1fr)] lg:items-start lg:px-12 lg:py-6">
                <div className="mt-4 flex w-full justify-center lg:mt-10 lg:h-full lg:w-[260px] lg:ml-[15px]">
                  <div className="flex w-full max-w-[240px] flex-col items-center gap-4">
                    <div className="w-full lg:hidden">
                      <div
                        className="relative"
                        tabIndex={0}
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                            setMobileMenuOpen(false);
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setMobileMenuOpen((open) => !open)}
                          className="flex w-full items-center justify-center gap-3 rounded-full border border-black/15 bg-[#F3F0E6] px-5 py-3 text-[11px] uppercase tracking-[0.28em] text-slate-800 shadow-[0_12px_22px_-14px_rgba(0,0,0,0.35)] transition focus:border-black/40 focus:bg-white focus:outline-none"
                          aria-haspopup="listbox"
                          aria-expanded={mobileMenuOpen}
                        >
                          <span>{activeMenuLabel}</span>
                          <svg
                            aria-hidden="true"
                            className={`h-3 w-3 text-slate-500 transition ${
                              mobileMenuOpen ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <path
                              d="M5 7l5 5 5-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <div
                          className={`absolute left-0 right-0 top-full z-20 mt-3 rounded-2xl border border-black/10 bg-white/95 p-2 text-[11px] uppercase tracking-[0.26em] text-slate-700 shadow-[0_18px_30px_-20px_rgba(0,0,0,0.45)] backdrop-blur transition ${
                            mobileMenuOpen
                              ? "pointer-events-auto translate-y-0 opacity-100"
                              : "pointer-events-none -translate-y-2 opacity-0"
                          }`}
                          role="listbox"
                        >
                          {menuItems.map((item) => {
                            const isActive = item.id === activeItem;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  handleMenuSelect(item.id);
                                  setMobileMenuOpen(false);
                                }}
                                className={`w-full rounded-xl px-4 py-2 text-center transition ${
                                  isActive
                                    ? "bg-black/10 text-slate-900"
                                    : "hover:bg-black/5 hover:text-slate-900"
                                }`}
                                role="option"
                                aria-selected={isActive}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="hidden w-full max-w-[220px] flex-col items-center space-y-3 lg:flex sm:space-y-5">
                      {menuItems.map((item) => {
                        const isActive = activeItem === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleMenuSelect(item.id)}
                            className={`flex w-full flex-col items-center text-base transition-colors sm:text-lg ${
                              isActive
                                ? "font-medium text-slate-900"
                                : "font-light text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <span>{item.label}</span>
                            <span
                              className={`mt-2 h-px w-24 bg-slate-900 transition-opacity duration-200 sm:w-36 ${
                                isActive ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-6 h-px w-full bg-slate-900/70 lg:mt-8 lg:h-[50%] lg:w-px" />

                <div className="mt-4 flex h-auto flex-1 flex-col pl-0 pr-0 text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:pl-6 sm:pr-4 sm:text-[11px] sm:tracking-[0.2em] sm:max-w-[520px] lg:mt-6 lg:h-[calc(100%-80px)] lg:max-w-[560px]">
                  <div className="flex flex-col gap-4 text-[9px] uppercase tracking-[0.16em] text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:text-[10px] sm:tracking-[0.2em]">
                    <button
                      type="button"
                      onClick={() => {
                        closeAddressForm();
                        setActiveItem("addresses");
                      }}
                      className="text-xl font-light leading-none text-slate-600 transition-colors hover:text-slate-900"
                      aria-label={text.closeAddressForm}
                    >
                      X
                    </button>
                    <div className="flex-1 text-center text-xs font-semibold tracking-[0.32em] text-slate-700 sm:text-sm sm:tracking-[0.4em]">
                      {text.addressesTitle}
                    </div>
                    <span className="w-6" />
                  </div>

                  <form
                    onSubmit={(event) => {
                      void handleAddAddress(event);
                    }}
                    className="mt-3 space-y-6 text-[9px] uppercase tracking-[0.16em] text-slate-500 sm:mt-4 sm:space-y-6 sm:text-[10px] sm:tracking-[0.2em]"
                  >
                    {addressDetailsLoading ? (
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-center text-[10px] uppercase tracking-[0.2em] text-slate-600">
                        {text.loadingAddressDetails}
                      </div>
                    ) : null}
                    {addressError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-red-600">
                        {addressError}
                      </div>
                    ) : null}
                    {addressSuccess ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                        {addressSuccess}
                      </div>
                    ) : null}

                    <fieldset disabled={isAddressBusy} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-6">
                      <label className="space-y-3">
                        <span>
                          {text.firstName} <span className="text-red-500">*</span>
                        </span>
                        <input
                          required
                          type="text"
                          placeholder="JANE"
                          value={addressForm.firstName}
                          onChange={handleAddressChange("firstName")}
                          className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                        />
                      </label>
                      <label className="space-y-3">
                        <span>
                          {text.lastName} <span className="text-red-500">*</span>
                        </span>
                        <input
                          required
                          type="text"
                          placeholder="DOE"
                          value={addressForm.lastName}
                          onChange={handleAddressChange("lastName")}
                          className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                        />
                      </label>
                    </div>

                    <label className="space-y-2">
                      <span>
                        {text.phoneNumber} <span className="text-red-500">*</span>
                      </span>
                    <input
                      required
                      type="tel"
                      placeholder="NUMBER"
                      value={addressForm.phone}
                      onChange={handleAddressChange("phone")}
                      className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                    />
                    </label>

                    <label className="space-y-2">
                      <span>{text.country}</span>
                  <input
                    type="text"
                    placeholder="GEORIGA"
                    value={addressForm.country}
                    onChange={handleAddressChange("country")}
                    className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                  />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.state} <span className="text-red-500">*</span>
                      </span>
                  <input
                    required
                    type="text"
                    placeholder="ZNAKVA"
                    value={addressForm.state}
                    onChange={handleAddressChange("state")}
                    className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none "
                  />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.city} <span className="text-red-500">*</span>
                      </span>
                  <input
                    required
                    type="text"
                    placeholder="TBILISI"
                    value={addressForm.city}
                    onChange={handleAddressChange("city")}
                    className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                  />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.addressNo1} <span className="text-red-500">*</span>
                      </span>
                  <input
                    required
                    type="text"
                    placeholder="TBILISI"
                    value={addressForm.address1}
                    onChange={handleAddressChange("address1")}
                    className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                  />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.addressNo2}{" "}
                        <span className="text-slate-400">{text.optional}</span>
                      </span>
                  <input
                    type="text"
                    placeholder="TBILISI"
                    value={addressForm.address2}
                    onChange={handleAddressChange("address2")}
                    className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                  />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.postalCode} <span className="text-red-500">*</span>
                      </span>
                  <input
                    required
                    type="text"
                    placeholder="1234"
                    value={addressForm.postalCode}
                    onChange={handleAddressChange("postalCode")}
                    className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                  />
                    </label>

                    <label className="space-y-2">
                      <span>
                        {text.name} <span className="text-slate-400">{text.optional}</span>
                      </span>
                  <input
                    type="text"
                    placeholder="HOME"
                    value={addressForm.name}
                    onChange={handleAddressChange("name")}
                    className="mb-[10px] w-full border border-slate-300 bg-transparent px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-600 shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none"
                  />
                    </label>

                    <div className="mt-4 flex justify-center">
                      <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <button
                          type="submit"
                          disabled={isAddressBusy}
                          className="w-full max-w-none bg-black py-2.5 text-xs font-semibold tracking-[0.35em] text-white shadow-[0_10px_20px_-12px_rgba(0,0,0,0.7)] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[220px]"
                        >
                          {addressSubmitting
                            ? text.updating
                            : isEditingAddress
                              ? text.update
                              : text.add}
                        </button>
                        {isEditingAddress ? (
                          <button
                            type="button"
                            aria-label={text.deleteAddress}
                            disabled={isAddressBusy}
                            onClick={() => setConfirmDeleteOpen(true)}
                            className="flex h-9 w-9 items-center justify-center border border-slate-300 text-slate-600 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M6 6l1 14h10l1-14" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>
                    </fieldset>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-sm lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:bg-[url('/images/prof-div.png')] lg:bg-contain lg:bg-center lg:bg-no-repeat lg:aspect-[883/483]"
            >
              <div className="flex h-full w-full flex-col items-stretch px-5 py-8 sm:px-8 lg:grid lg:grid-cols-[275px_1px_minmax(0,1fr)] lg:items-start lg:px-12 lg:py-10">
                <div className="mt-4 flex w-full justify-center lg:mt-10 lg:h-full lg:w-[260px] lg:ml-[15px]">
                  <div className="flex w-full max-w-[240px] flex-col items-center gap-4">
                    <div className="w-full lg:hidden">
                      <div
                        className="relative"
                        tabIndex={0}
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                            setMobileMenuOpen(false);
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setMobileMenuOpen((open) => !open)}
                          className="flex w-full items-center justify-center gap-3 rounded-full border border-black/15 bg-[#F3F0E6] px-5 py-3 text-[11px] uppercase tracking-[0.28em] text-slate-800 shadow-[0_12px_22px_-14px_rgba(0,0,0,0.35)] transition focus:border-black/40 focus:bg-white focus:outline-none"
                          aria-haspopup="listbox"
                          aria-expanded={mobileMenuOpen}
                        >
                          <span>{activeMenuLabel}</span>
                          <svg
                            aria-hidden="true"
                            className={`h-3 w-3 text-slate-500 transition ${
                              mobileMenuOpen ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <path
                              d="M5 7l5 5 5-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <div
                          className={`absolute left-0 right-0 top-full z-20 mt-3 rounded-2xl border border-black/10 bg-white/95 p-2 text-[11px] uppercase tracking-[0.26em] text-slate-700 shadow-[0_18px_30px_-20px_rgba(0,0,0,0.45)] backdrop-blur transition ${
                            mobileMenuOpen
                              ? "pointer-events-auto translate-y-0 opacity-100"
                              : "pointer-events-none -translate-y-2 opacity-0"
                          }`}
                          role="listbox"
                        >
                          {menuItems.map((item) => {
                            const isActive = item.id === activeItem;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  handleMenuSelect(item.id);
                                  setMobileMenuOpen(false);
                                }}
                                className={`w-full rounded-xl px-4 py-2 text-center transition ${
                                  isActive
                                    ? "bg-black/10 text-slate-900"
                                    : "hover:bg-black/5 hover:text-slate-900"
                                }`}
                                role="option"
                                aria-selected={isActive}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="hidden w-full max-w-[220px] flex-col items-center space-y-3 lg:flex sm:space-y-5">
                      {menuItems.map((item) => {
                        const isActive = activeItem === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleMenuSelect(item.id)}
                            className={`flex w-full flex-col items-center text-base transition-colors sm:text-lg ${
                              isActive
                                ? "font-medium text-slate-900"
                                : "font-light text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <span>{item.label}</span>
                            <span
                              className={`mt-2 h-px w-24 bg-slate-900 transition-opacity duration-200 sm:w-36 ${
                                isActive ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="relative mt-6 h-px w-full bg-slate-900/70 lg:mt-10 lg:h-[calc(100%-80px)] lg:w-px" />

                {activeItem === "account" ? (
                  <div className="mt-6 flex h-auto flex-1 flex-col pl-0 pr-0 text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:pl-6 sm:pr-4 sm:text-[11px] sm:tracking-[0.2em] lg:mt-10 lg:h-[calc(100%-80px)]">
                    {profileLoading ? (
                      <div className="mb-4 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-600">
                        {text.loadingProfile}
                      </div>
                    ) : null}
                    {profileError ? (
                      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-red-600">
                        {profileError}
                      </div>
                    ) : null}

                    <form
                      onSubmit={handleAccountUpdate}
                      className="flex flex-1 flex-col justify-center gap-5 sm:gap-6"
                    >
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-10">
                        <label className="space-y-2">
                          <span>{text.firstName}</span>
                          <input
                            type="text"
                            placeholder="JANE"
                            value={accountForm.first_name}
                            onChange={handleAccountFormChange("first_name")}
                            readOnly={!accountEditable || accountSubmitting}
                            className={`w-full border border-slate-300 px-4 py-2 text-sm tracking-[0.08em] shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none ${
                              accountEditable
                                ? "bg-transparent text-slate-700"
                                : "bg-slate-100/50 text-slate-500"
                            }`}
                          />
                        </label>
                        <label className="space-y-2">
                          <span>{text.lastName}</span>
                          <input
                            type="text"
                            placeholder="DOE"
                            value={accountForm.last_name}
                            onChange={handleAccountFormChange("last_name")}
                            readOnly={!accountEditable || accountSubmitting}
                            className={`w-full border border-slate-300 px-4 py-2 text-sm tracking-[0.08em] shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none ${
                              accountEditable
                                ? "bg-transparent text-slate-700"
                                : "bg-slate-100/50 text-slate-500"
                            }`}
                          />
                        </label>
                      </div>

                      <label className="space-y-2">
                        <span>{text.email}</span>
                        <input
                          type="email"
                          placeholder="testmail@gmail.com"
                          value={accountForm.email}
                          onChange={handleAccountFormChange("email")}
                          readOnly={!accountEditable || accountSubmitting}
                          className={`w-full border border-slate-300 px-4 py-2 text-sm shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none ${
                            accountEditable
                              ? "bg-transparent text-slate-700"
                              : "bg-slate-100/50 text-slate-500"
                          }`}
                        />
                      </label>

                      <label className="space-y-2">
                        <span>{text.phone}</span>
                        <input
                          type="tel"
                          placeholder="+995 123 123 123"
                          value={accountForm.phone_number}
                          onChange={handleAccountFormChange("phone_number")}
                          readOnly={!accountEditable || accountSubmitting}
                          className={`w-full border border-slate-300 px-4 py-2 text-sm shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none ${
                            accountEditable
                              ? "bg-transparent text-slate-700"
                              : "bg-slate-100/50 text-slate-500"
                          }`}
                        />
                      </label>

                      <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
                        <button
                          type="button"
                          onClick={toggleAccountEditMode}
                          disabled={accountSubmitting || profileLoading}
                          className="w-full max-w-none border border-black py-3 text-xs font-semibold tracking-[0.3em] text-slate-900 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[200px]"
                        >
                          {accountEditable ? text.cancelEdit : text.edit}
                        </button>
                        <button
                          type="submit"
                          disabled={!accountEditable || accountSubmitting || profileLoading}
                          className="w-full max-w-none bg-black py-3 text-xs font-semibold tracking-[0.35em] text-white shadow-[0_10px_20px_-12px_rgba(0,0,0,0.7)] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[320px]"
                        >
                          {accountSubmitting ? text.updating : text.update}
                        </button>
                      </div>

                      {accountError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-red-600">
                          {accountError}
                        </div>
                      ) : null}
                      {accountSuccess ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                          {accountSuccess}
                        </div>
                      ) : null}
                    </form>
                  </div>
                ) : activeItem === "addresses" ? (
                  <div className="relative mt-6 flex h-auto flex-1 flex-col pl-0 pr-0 text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:pl-6 sm:pr-8 sm:text-[11px] sm:tracking-[0.2em] lg:mt-10 lg:h-[calc(100%-80px)]">
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:absolute sm:right-6 sm:top-0 sm:flex-nowrap">
                      {!deleteMode ? (
                        <button
                          type="button"
                          onClick={openNewAddressForm}
                          className="w-full max-w-[220px] border border-slate-400 px-3 py-1 text-[8px] uppercase tracking-[0.2em] text-slate-600 transition-colors hover:text-slate-900 sm:w-auto sm:text-[9px]"
                        >
                          {text.addNewAddress}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={text.deleteAddresses}
                        disabled={addressDeleting}
                        onClick={toggleDeleteMode}
                        className={`flex h-7 w-7 items-center justify-center border border-slate-300 text-slate-600 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${
                          deleteMode ? "bg-black/5" : ""
                        }`}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M6 6l1 14h10l1-14" />
                        </svg>
                      </button>
                      {deleteMode ? (
                        <button
                          type="button"
                          disabled={addressDeleting}
                          onClick={() => {
                            void handleDeleteSelected();
                          }}
                          className="w-full max-w-[200px] border border-slate-400 px-3 py-1 text-[8px] uppercase tracking-[0.2em] text-slate-600 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:text-[9px]"
                        >
                          {addressDeleting ? text.deleting : text.deleteSelected}
                        </button>
                      ) : null}
                    </div>

                    <div className="pt-4 text-center text-xs font-semibold tracking-[0.32em] text-slate-700 sm:pt-2 sm:text-sm sm:tracking-[0.4em]">
                      {text.addressesTitle}
                    </div>
                    {addressError ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-red-600">
                        {addressError}
                      </div>
                    ) : null}
                    {addressSuccess ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                        {addressSuccess}
                      </div>
                    ) : null}

                    {hasAddresses ? (
                      <div className="mt-6 space-y-4 text-[9px] normal-case tracking-[0.05em] text-slate-700">
                        {addresses.map((address) => {
                          const label = address.name.trim();
                          const fullName = `${address.firstName} ${address.lastName}`.trim();
                          const showLabel = Boolean(label);
                          const addressLine = address.address2
                            ? `${address.address1} ${address.address2}`
                            : address.address1;
                          const cityCountry = address.country
                            ? `${address.city},${address.country}`
                            : address.city;

                          return (
                            <div
                              key={address.id}
                              className={`flex flex-col gap-2 border border-slate-300 px-2 py-2 sm:grid sm:items-center sm:gap-3 sm:overflow-hidden sm:pr-2 ${
                                deleteMode
                                  ? "sm:grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]"
                                  : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]"
                              }`}
                            >
                              {deleteMode ? (
                                <label className="flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3 accent-slate-700"
                                    disabled={addressDeleting}
                                    checked={selectedAddressIds.has(address.id)}
                                    onChange={() => toggleAddressSelection(address.id)}
                                  />
                                </label>
                              ) : null}
                              <span
                                className={`min-w-0 text-[9px] text-slate-600 sm:truncate ${
                                  showLabel ? "" : "opacity-0"
                                }`}
                                aria-hidden={!showLabel}
                              >
                                {showLabel ? label : "—"}
                              </span>
                              <span className="min-w-0 text-[9px] text-slate-600 sm:truncate">
                                {fullName}
                              </span>
                              <span className="min-w-0 text-[9px] text-slate-600 sm:truncate">
                                {addressLine}
                              </span>
                              <span className="min-w-0 text-[9px] text-slate-600 sm:truncate">
                                {cityCountry}
                              </span>
                              <span className="min-w-0 text-[9px] text-slate-600 sm:truncate">
                                {address.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  void openEditAddressForm(address);
                                }}
                                className="flex items-center gap-2 border border-slate-300 px-2.5 py-0.5 text-[8px] uppercase tracking-[0.18em] text-slate-700 transition-colors hover:text-slate-900 self-start sm:justify-self-end sm:shrink-0"
                              >
                                {text.details}
                                <svg
                                  aria-hidden="true"
                                  className="h-3 w-3"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                >
                                  <path
                                    d="M5 7l5 5 5-5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center text-[10px] tracking-[0.25em] text-slate-600">
                        {text.noAddressAddedYet}
                      </div>
                    )}
                  </div>
                ) : activeItem === "orders" ? (
                  <div className="mt-6 flex h-auto flex-1 flex-col gap-4 pl-0 pr-0 sm:gap-6 sm:pl-6 sm:pr-4 lg:mt-10 lg:h-[calc(100%-80px)]">
                    <div className="flex justify-center pt-2 text-xs font-semibold tracking-[0.32em] text-slate-700 sm:text-sm sm:tracking-[0.4em]">
                      {text.ordersTitle}
                    </div>

                    <div className="space-y-4 text-[10px] text-slate-700 sm:text-[11px]">
                      {visibleOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-col gap-3 border border-slate-300 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                        >
                          <div className="flex flex-wrap items-center gap-2 sm:gap-8">
                            <span>
                              {text.orderNumber}: {order.id}
                            </span>
                            <span>
                              {text.date}: {order.date}
                            </span>
                            <span>
                              {text.total}: {order.total}
                            </span>
                            <span>
                              {text.items}: {order.items}
                            </span>
                          </div>
                          {order.canViewDetails ? (
                            <button
                              type="button"
                              onClick={() => {
                                void openOrderDetails(order);
                              }}
                              className="flex items-center gap-2 self-start text-[9px] uppercase tracking-[0.2em] text-slate-700 sm:self-auto sm:text-[10px]"
                            >
                              {text.details}
                              <svg
                                aria-hidden="true"
                                className="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="none"
                              >
                                <path
                                  d="M5 7l5 5 5-5"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 sm:text-[10px]">
                              {text.details}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeItem === "password" ? (
                  <div className="mt-6 flex h-auto flex-1 flex-col pl-0 pr-0 text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:pl-6 sm:pr-4 sm:text-[11px] sm:tracking-[0.2em] lg:mt-10 lg:h-[calc(100%-80px)]">
                    <div className="pt-4 text-center text-xs font-semibold tracking-[0.32em] text-slate-700 sm:pt-2 sm:text-sm sm:tracking-[0.4em]">
                      {text.changePasswordTitle}
                    </div>

                    <form
                      className="mx-auto mt-10 w-full max-w-[450px] space-y-6 px-6 text-center"
                      onSubmit={handlePasswordUpdate}
                    >
                      <label className="block space-y-5 text-left">
                        <span className="block text-[10px] uppercase tracking-[0.28em] text-[#6B6B6B]">
                          {text.enterNewPassword}
                        </span>
                        <div className="flex w-full items-center gap-3 border-b border-black pb-2">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="********"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            className="w-full bg-transparent text-[10px] normal-case tracking-[0.28em] text-slate-700 outline-none placeholder:text-[#6B6B6B]"
                          />
                          <button
                            type="button"
                            aria-label={showNewPassword ? text.hidePassword : text.showPassword}
                            onClick={() => setShowNewPassword((current) => !current)}
                            className="text-slate-500 transition hover:text-slate-900"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
                              <circle cx="12" cy="12" r="3" />
                              <path d="M3 3l18 18" />
                            </svg>
                          </button>
                        </div>
                      </label>

                      <label className="block space-y-5 text-left">
                        <span className="block text-[10px] uppercase tracking-[0.28em] text-[#6B6B6B]">
                          {text.confirmPassword}
                        </span>
                        <div className="flex w-full items-center gap-3 border-b border-black pb-2">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="********"
                            autoComplete="new-password"
                            value={confirmNewPassword}
                            onChange={(event) => setConfirmNewPassword(event.target.value)}
                            className="w-full bg-transparent text-[10px] normal-case tracking-[0.28em] text-slate-700 outline-none placeholder:text-[#6B6B6B]"
                          />
                          <button
                            type="button"
                            aria-label={showConfirmPassword ? text.hidePassword : text.showPassword}
                            onClick={() => setShowConfirmPassword((current) => !current)}
                            className="text-slate-500 transition hover:text-slate-900"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
                              <circle cx="12" cy="12" r="3" />
                              <path d="M3 3l18 18" />
                            </svg>
                          </button>
                        </div>
                      </label>

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={passwordSubmitting}
                          className="w-full max-w-[320px] bg-black py-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_10px_20px_-12px_rgba(0,0,0,0.7)] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {passwordSubmitting ? text.submitting : text.submit}
                        </button>
                      </div>

                      {passwordError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-red-600">
                          {passwordError}
                        </div>
                      ) : null}
                      {passwordSuccess ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-emerald-700">
                          {passwordSuccess}
                        </div>
                      ) : null}
                    </form>
                  </div>

                ) : activeItem === "confirmEmail" ? (
                  <div className="mt-6 flex h-auto flex-1 flex-col items-center justify-center gap-6 px-2 pl-0 pr-0 text-center text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:px-6 sm:pl-6 sm:pr-4 sm:text-[11px] sm:tracking-[0.2em] lg:mt-10 lg:h-[calc(100%-80px)]">
                    <div className="max-w-md space-y-3">
                      <p className="text-xs font-semibold tracking-[0.32em] text-slate-700 sm:text-sm sm:tracking-[0.4em]">
                        {text.confirmEmailTitle}
                      </p>
                      <p className="normal-case tracking-[0.08em] text-slate-600">
                        {text.confirmEmailDescription}
                      </p>
                      <p className="normal-case text-slate-700">{accountForm.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEmailVerification(accountForm.email)}
                      disabled={requestingCode || resendingCode || confirmingCode}
                      className="w-full max-w-[320px] bg-black py-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_10px_20px_-12px_rgba(0,0,0,0.7)] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {text.sendVerificationCode}
                    </button>
                  </div>
                ) : activeItem === "logout" ? (
                  isLoggedIn ? (
                    <div className="relative mt-6 flex h-auto flex-1 flex-col items-center justify-center gap-4 pl-0 pr-0 text-[10px] uppercase tracking-[0.2em] text-slate-600 sm:pl-6 sm:pr-4 sm:text-[11px] lg:mt-10 lg:h-[calc(100%-80px)]">
                      <button
                        type="button"
                        onClick={openLogoutConfirmation}
                        className="w-full max-w-[260px] rounded-full bg-black px-6 py-3 text-[12px] font-semibold tracking-[0.3em] text-white shadow-[0_14px_30px_-20px_rgba(0,0,0,0.9)] transition-colors hover:bg-slate-800"
                      >
                        {text.logOut}
                      </button>
                    </div>
                  ) : (
                    <div
                      className="mt-6 flex h-auto flex-1 pl-0 pr-0 sm:pl-6 sm:pr-4 lg:mt-10 lg:h-[calc(100%-80px)]"
                      aria-hidden="true"
                    />
                  )
                ) : (
                  <div className="mt-6 flex h-auto flex-1 pl-0 pr-0 sm:pl-6 sm:pr-4 lg:mt-10 lg:h-[calc(100%-80px)]" />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer variant="light" />

      {verificationOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={text.verifyEmailTitle}
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.35)]">
            <div className="h-2 w-full bg-gradient-to-r from-slate-900 via-slate-600 to-slate-300" />
            <div className="p-6 sm:p-8">
              <button
                type="button"
                onClick={handleVerificationBack}
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500 transition hover:text-slate-900"
              >
                <span aria-hidden="true">←</span>
                {text.back}
              </button>

              <p className="mt-5 text-xs uppercase tracking-[0.32em] text-slate-500">
                {text.verifyEmailTitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {text.verifyEmailDescription}
              </p>
              <div className="mt-4 rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {verificationEmail}
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleConfirmVerification}>
                <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                  {text.codeLabel}
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder={text.codePlaceholder}
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    required
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm tracking-[0.3em] text-slate-900 outline-none transition focus:border-black/40"
                  />
                </label>

                <button
                  type="submit"
                  disabled={confirmingCode}
                  className="w-full rounded-2xl bg-black px-4 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {confirmingCode ? text.confirming : text.confirm}
                </button>
              </form>

              <button
                type="button"
                onClick={() => void requestVerificationCode(verificationEmail, true)}
                disabled={requestingCode || resendingCode || confirmingCode}
                className="mt-3 w-full rounded-2xl border border-black/15 px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-slate-700 transition hover:border-black/30 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendingCode ? text.resendingCode : text.resendCode}
              </button>

              {verificationError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-red-600">
                  {verificationError}
                </div>
              ) : null}
              {verificationMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-emerald-700">
                  {verificationMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label={text.cancel}
            onClick={() => {
              if (addressDeleting) return;
              setConfirmDeleteOpen(false);
            }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-xs rounded-2xl border border-black/10 bg-white p-5 text-center text-slate-800 shadow-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {text.deleteAddressTitle}
            </p>
            <p className="mt-3 text-sm text-slate-700">
              {text.deleteAddressQuestion}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={addressDeleting}
                className="rounded-full border border-slate-300 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-600 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {text.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteCurrentAddress();
                }}
                disabled={addressDeleting}
                className="rounded-full bg-black px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addressDeleting ? text.deleting : text.delete}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmLogoutOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close logout confirmation"
            onClick={() => {
              if (logoutSubmitting) return;
              setConfirmLogoutOpen(false);
            }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-xs rounded-2xl border border-black/10 bg-white p-5 text-center text-slate-800 shadow-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {text.logOut}
            </p>
            <p className="mt-3 text-sm text-slate-700">{text.logoutQuestion}</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogoutOpen(false)}
                disabled={logoutSubmitting}
                className="rounded-full border border-slate-300 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-600 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {text.no}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutSubmitting}
                className="rounded-full bg-black px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {logoutSubmitting ? text.submitting : text.yes}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
