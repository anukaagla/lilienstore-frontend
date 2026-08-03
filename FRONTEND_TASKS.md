# ფრონტის სამუშაო მითითებები — API_CHANGES.md-ის მიხედვით

> ბაზა: `API_CHANGES.md` (ბექენდის დოკუმენტი) + ამ რეპოს რეალური კოდი.
> ყველა ფაილი/ხაზი ქვემოთ ამ პროექტის ნამდვილი ადგილებია.

---

## 🛑 0. ბლოკერი — ჯერ ეს უნდა გადაწყდეს, თორემ ვალუტა არასწორად იმუშავებს

**პრობლემა:** დოკი ამბობს „ფრონტს არაფრის გაგზავნა არ სჭირდება — ბექენდი ვიზიტორის IP-ს ხედავს
(`CF-IPCountry`)". ეს მართალია **მხოლოდ მაშინ, როცა API-ს ბრაუზერი პირდაპირ იძახებს.**

ამ პროექტში კი **არცერთი ფასის შემცველი მოთხოვნა ბრაუზერიდან პირდაპირ არ მიდის.** ორი გზა არსებობს
და ორივე Next.js-ის სერვერზე გადის:

**ა) სერვერული კომპონენტები (SSR)** — Cloudflare-ს დაინახავს ჰოსტინგის სერვერის IP-ს:

| ფაილი | რას იძახებს |
|---|---|
| [src/lib/catalog-api.ts:143](src/lib/catalog-api.ts:143), [:166](src/lib/catalog-api.ts:166), [:191](src/lib/catalog-api.ts:191) | `/api/categories/`, `/api/products/`, `/api/products/<slug>/` |
| [src/lib/brand.ts:245](src/lib/brand.ts:245) | `/api/brand/` |
| [src/app/page.tsx:50](src/app/page.tsx:50), [src/app/market/page.tsx:138](src/app/market/page.tsx:138), [src/app/market/[id]/page.tsx:107](src/app/market/[id]/page.tsx:107), [src/app/new-collection/page.tsx](src/app/new-collection/page.tsx), [src/app/sitemap.ts:76](src/app/sitemap.ts:76) | ზემოთ ჩამოთვლილებს |

**ბ) `/api/proxy/...` route handler** — [src/lib/auth.ts:23-62](src/lib/auth.ts:23) `fetchWithAuthRetry`-ს
**ყველა** გამოძახებას (მათ შორის აბსოლუტურ `https://api.lilienstore.com/...` URL-ებს) გადაწერს
`/api/proxy/...`-ზე, ანუ ისევ ჩვენს სერვერზე:

| ფაილი | რას იძახებს |
|---|---|
| [src/lib/cart-api.ts:113](src/lib/cart-api.ts:113) | `/api/cart/` და `/api/cart/items/` |
| [src/components/checkout.tsx:648](src/components/checkout.tsx:648) | `/api/shipping/settings/` |
| [src/components/checkout.tsx:806](src/components/checkout.tsx:806), [:856](src/components/checkout.tsx:856) | `/api/orders/checkout/`, `/api/orders/<id>/pay/unipay/` |
| [src/components/payment-success.tsx:144](src/components/payment-success.tsx:144), [src/components/profile.tsx](src/components/profile.tsx) | `/api/orders/<id>/` |

**შედეგი:** თუ Next-ის სერვერი აშშ-შია — **ყველა ვიზიტორი, ქართველების ჩათვლით, USD-ს დაინახავს**
(და პროდუქტები, რომლებსაც დოლარის ფასი არ აქვთ, საერთოდ გაქრება). თუ საქართველოშია — **ყველა
GEL-ს დაინახავს**, უცხოელების ჩათვლით. `/api/orders/checkout/`-ის შემთხვევაში კი შეკვეთა
**არასწორ ვალუტაში ჩაიწერება** — ეს უკვე ფულის ბაგია, არა კოსმეტიკური.

### გადაწყვეტის ვარიანტები (ბექენდთან შესათანხმებელი)

1. **რეკომენდებული — ბექენდმა მიიღოს გადმოგზავნილი ქვეყანა.**
   Next-ის სერვერი შემომავალი მოთხოვნიდან წაიკითხავს `CF-IPCountry`-ს
   (`headers()` სერვერულ კომპონენტში, `request.headers` proxy route-ში) და ბექენდს გადასცემს
   ცალკე ჰედერით (მაგ. `X-Visitor-Country`), საერთო საიდუმლოთი დაცულს.
   ⚠️ `CF-IPCountry`-ს პირდაპირ გადაცემა **არ გამოდგება** — `api.lilienstore.com`-ის წინ მდგარი
   Cloudflare ამ ჰედერს თავიდან გადააწერს ჩვენი სერვერის IP-ის მიხედვით.
   ეს მოითხოვს ბექენდის ცვლილებას; SSR და SEO უცვლელი რჩება.

2. **ფასების ჩატვირთვა ბრაუზერიდან.** პროდუქტების/კალათის/შიპინგის მოთხოვნები client-side-ზე
   გადავიტანოთ და პირდაპირ `api.lilienstore.com`-ს მივმართოთ (proxy-ს გვერდის ავლით).
   ბექენდი უცვლელი რჩება, მაგრამ იკარგება SSR-ული ფასები, JSON-LD-ის `price`/`priceCurrency`
   ცარიელი ხდება და საჭიროა loading state-ები.

3. **ბექენდმა მიიღოს `?country=` / `?currency=` პარამეტრი** — უმარტივესი, მაგრამ დოკის ჩანაწერს
   („გადამრთველი არ არსებობს") ეწინააღმდეგება, რადგან პარამეტრი ხელით შეიცვლება.

**ვიდრე ეს არ გადაწყდება, ქვემოთ ჩამოთვლილი 2–6 პუნქტების გაკეთება აზრი აქვს (კოდი მზად უნდა
იყოს), მაგრამ რეალურად სწორ ვალუტას ვერ აჩვენებს.**

### თანმდევი ორი წვრილმანი

- **SEO რისკი:** [src/app/sitemap.ts](src/app/sitemap.ts) sitemap-ს სერვერიდან აგებს. თუ სერვერს
  Cloudflare უცხოელად ჩათვლის, დოლარის ფასის არმქონე პროდუქტები sitemap-იდან ამოვარდება და
  Googlebot-საც 404 დახვდება. ვარიანტ 1-ის შემდეგ: sitemap-ისთვის ქვეყანა ყოველთვის `GE` გადაეცეს.
- **429-ის რისკი:** ყველა მოთხოვნა ერთი სერვერის IP-იდან მიდის → 120/წთ ლიმიტი მთელი საიტისთვისაა
  საერთო, არა თითო ვიზიტორზე. ვარიანტ 1-ის შემთხვევაში ბექენდმა throttling-ის გასაღები
  გადმოგზავნილ IP-ზე უნდა დააფუძნოს, თორემ პიკზე მთელი საიტი ჩავარდება.

---

## 1. 🔴 API base URL → `https://api.lilienstore.com`

**რას ვცვლით:** [.env.local](.env.local) — ამჟამად `onrender.com`-ია, ანუ Cloudflare-ს გვერდს
უვლის და ვალუტა ყოველთვის `GEL` იქნება.

```
NEXT_PUBLIC_API_BASE_URL=https://api.lilienstore.com
API_BASE_URL=https://api.lilienstore.com
NEXT_PUBLIC_SITE_URL=https://lilienstore.com
```

დამატებით:

- [.env.example](.env.example) — კომენტარში მიეთითოს, რომ პროდაქშენში მხოლოდ
  `https://api.lilienstore.com` ივარგებს და `*.onrender.com` აკრძალულია.
- [scripts/validate-env.mjs](scripts/validate-env.mjs) — `mode === "production"` ბლოკში
  (~117-131 ხაზები) დაემატოს **error** (არა warning): თუ `NEXT_PUBLIC_API_BASE_URL` ან
  `API_BASE_URL` `onrender.com`-ით მთავრდება → `process.exit(1)`. ეს ერთადერთი გარანტიაა, რომ
  შემთხვევით ისევ არ დაიდიპლოოს.
- ჰოსტინგის (Vercel/Render) env ცვლადებიც განახლდეს — `.env.local` git-ში არ არის და
  პროდაქშენს არ ეხება.
- [next.config.ts:20-36](next.config.ts:20) — `remotePatterns` `API_BASE_URL`-იდან იგება, ანუ
  ავტომატურად გასწორდება. თუ სურათები კვლავ `*.onrender.com`-იდან ან R2-იდან მოდის, დარწმუნდი,
  რომ შესაბამისი pattern რჩება (`**.r2.dev` უკვე არის).

---

## 2. 🔴 ფასის ჩვენება `currency`-ის მიხედვით

ამჟამად ვალუტა 6 ადგილას ხელითაა ჩაწერილი როგორც `GEL` — არცერთი მათგანი დინამიური არაა.

### 2.1 ჯერ საერთო helper

ახალი ფაილი `src/lib/currency.ts`:

```ts
export type CurrencyCode = "GEL" | "USD";

const SYMBOLS: Record<CurrencyCode, string> = { GEL: "₾", USD: "$" };

export const DEFAULT_CURRENCY: CurrencyCode = "GEL";

export const normalizeCurrency = (value: unknown): CurrencyCode => {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return code === "USD" ? "USD" : DEFAULT_CURRENCY;
};

export const getCurrencySymbol = (value: unknown) => SYMBOLS[normalizeCurrency(value)];

// ერთადერთი ფუნქცია, რომლითაც ფასი უნდა დაიბეჭდოს მთელ საიტზე
export const formatMoney = (
  value: number | string | null | undefined,
  currency: unknown,
  { decimals = 2 }: { decimals?: number } = {},
) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "";
  return `${amount.toFixed(decimals)} ${getCurrencySymbol(currency)}`;
};
```

> `normalizeCurrency`-ს fallback განზრახ `GEL`-ია — დოკის მიხედვით „ვერ დადგინდა → GEL".
> სიმბოლოს პოზიცია (`100 ₾` vs `$35`) დიზაინის გადასაწყვეტია; თუ USD-ზე პრეფიქსი გინდა,
> `formatMoney`-ში ერთ ადგილას შეიცვლება — სწორედ ამიტომაა ერთი helper.

### 2.2 ტიპებში `currency`-ის დამატება

[src/types/catalog.ts](src/types/catalog.ts):

- `ApiProductListItem` (19-36 ხაზები) → დაემატოს `currency?: string | null;`
- `ApiProductDetail.variants[]` (90-98 ხაზები) → დაემატოს `currency?: string | null;`
- `ApiProductDetail.currency` (60 ხაზი) — უკვე არსებობს ✅

[src/data/products.ts](src/data/products.ts):

- `Product.currency` (16 ხაზი) — არსებობს, მაგრამ `currency?: string` → გახდეს `CurrencyCode`
- `ProductVariant` (40-48 ხაზები) → დაემატოს `currency: CurrencyCode;`

[src/lib/cart.ts:1-11](src/lib/cart.ts:1) `CartItem` → დაემატოს `currency: CurrencyCode;`
**აუცილებელია**, რადგან კალათა localStorage-შია და VPN-ის/ქვეყნის შეცვლისას ძველი ფასები
სხვა ვალუტისა იქნება. `readCart()`-ში ჯობია გაფილტვრა/ნორმალიზება: თუ დამახსოვრებული
`currency` ≠ სერვერიდან მოსულ ვალუტას, ფასები სერვერის პასუხიდან გადაიწეროს.

### 2.3 mapper-ები

[src/lib/catalog-api.ts:290-293](src/lib/catalog-api.ts:290) — `currency` უკვე იკითხება
detail-ისთვის ✅. საჭიროა:

- ვარიანტების map-ში (264-280 ხაზები) დაემატოს
  `currency: normalizeCurrency(variant.currency ?? item.currency)`
- `min_price`-ის fallback (255-259) უცვლელი რჩება, უბრალოდ გახსოვდეს: `min_price` **რიცხვია**,
  `variant.price` კი **სტრიქონი** — `toNumber()` ორივეს ამუშავებს ✅
- **`price_usd`-ს არსად ეძებო** — ბექენდი აღარ აბრუნებს

[src/lib/cart-api.ts](src/lib/cart-api.ts):

- `ApiCartItem` (13-34) → `currency: string;`
- `ApiCart` (36-46) → `currency: string;`
- `mapCartItems` (60-72) → თითო item-ს დაემატოს
  `currency: normalizeCurrency(item.currency ?? cart.currency)`

[src/lib/order-details.ts](src/lib/order-details.ts):

- `OrderDetailsSummary` (111-128) → `currency: CurrencyCode;`
- `normalizeOrderDetailsSummary`-ის return-ში (311-347) →
  `currency: normalizeCurrency(record.currency)`
- item-ების map-ში (261-307) → `currency: normalizeCurrency(entry.currency ?? record.currency)`

[src/components/checkout.tsx](src/components/checkout.tsx):

- `ShippingSettings` (65-70) → `currency: CurrencyCode;`
- `normalizeShippingSettingsResponse` (226-237) → `currency: normalizeCurrency(payload.currency)`

### 2.4 ყველა ადგილი, სადაც `GEL` ხელით წერია — ჩასანაცვლებელია

| ფაილი:ხაზი | ამჟამად | უნდა გახდეს |
|---|---|---|
| [src/components/market.tsx:427](src/components/market.tsx:427) | `{product.price} GEL` | `{formatMoney(product.price, product.currency)}` |
| [src/components/product-detail.tsx:389](src/components/product-detail.tsx:389) | `{displayPrice} GEL` | `{formatMoney(displayPrice, selectedVariant?.currency ?? product.currency)}` |
| [src/components/shopping-bag.tsx:29](src/components/shopping-bag.tsx:29) | `formatPrice = v => \`${v.toFixed(2)} GEL\`` | წაიშალოს, `formatMoney`-ით ჩანაცვლდეს (404, 407, 479, 483, 487 ხაზები) |
| [src/components/checkout.tsx:90](src/components/checkout.tsx:90) | იგივე | იგივე (1165, 1173, 1177, 1181 ხაზები) |
| [src/components/payment-success.tsx:29](src/components/payment-success.tsx:29) | იგივე | იგივე (439, 462, 466, 470 ხაზები) |
| [src/components/show-room.tsx:174](src/components/show-room.tsx:174) | `formatSalePrice` | `formatMoney(v, currency, { decimals: 0 })` |

დამატებით:

- [src/components/market.tsx:17-24](src/components/market.tsx:17) `MarketProductCard`-ს დაემატოს
  `currency`, `mapApiProduct`-ში (69-95) — `currency: normalizeCurrency(item.currency)`.
- [src/components/profile.tsx:523](src/components/profile.tsx:523), [:542-544](src/components/profile.tsx:542) —
  შეკვეთის ისტორიაში ფასები **საერთოდ უვალუტოდ** იბეჭდება (`normalizeDisplayValue` მხოლოდ
  სტრიქონად აქცევს). დაემატოს შეკვეთის `currency` და 2089/2112 ხაზებზე სიმბოლოც გამოჩნდეს.
  ⚠️ აქ **შეკვეთის საკუთარი** `currency` უნდა გამოიყენო, არა მიმდინარე — ძველი შეკვეთა იმ
  ვალუტაშია, რომელშიც განთავსდა.
- [src/components/shopping-bag.tsx](src/components/shopping-bag.tsx) და
  [src/components/checkout.tsx:680-701](src/components/checkout.tsx:680) — `subtotal`/`total`
  ლოკალურად ითვლება item-ების ფასებიდან. სასურველია სერვერის `subtotal`/`estimated_total`
  გამოვიყენოთ, სულ მცირე მაშინ, როცა `/api/cart/` პასუხი გვაქვს — ასე ვალუტების არევა გამოირიცხება.
- [src/app/market/[id]/page.tsx:160](src/app/market/[id]/page.tsx:160) — JSON-LD-ის
  `priceCurrency: product.currency || "GEL"` უკვე სწორია ✅ (ოღონდ იხ. პუნქტი 0 — SSR-ის გამო
  სერვერის ვალუტას აჩვენებს).

### 2.5 `show-room.tsx`-ის ფეიკური ფასდაკლებები

[src/components/show-room.tsx:90](src/components/show-room.tsx:90) `HOME_SALE_DISCOUNTS = [50, 40, 35, 25]`
— ეს ფასდაკლებები ფრონტზეა გამოგონილი და `min_price`-ს ამრავლებს. ჯერ ერთი, ეს ისედაც არასწორია
(მომხმარებელს არარსებულ ფასდაკლებას ვაჩვენებთ), მეორეც — ვალუტის შეცვლისას სრულიად აზრს კარგავს.
**რეკომენდაცია:** ეს ბლოკი ჩანაცვლდეს ახალი `/api/sections/`-ით (იხ. პუნქტი 5), ან
`FALLBACK_SALE_CARDS`-თან ერთად საერთოდ ამოღებულ იქნას.

---

## 3. 🟠 `/api/products/<slug>/` → 404-ის ლამაზი დამუშავება

**კარგი ამბავი:** [src/app/market/[id]/page.tsx:109-111](src/app/market/[id]/page.tsx:109) უკვე
იძახებს `notFound()`-ს, [src/lib/catalog-api.ts:197-199](src/lib/catalog-api.ts:197) კი
`!response.ok`-ზე `null`-ს აბრუნებს. ლოგიკა მუშაობს ✅

**ცუდი ამბავი:** რეპოში **არცერთი `not-found.tsx` არ არსებობს** → მომხმარებელს Next.js-ის
სტანდარტული, გაუფორმებელი „404 — This page could not be found" დახვდება.

**გასაკეთებელი:**

1. შეიქმნას `src/app/market/[id]/not-found.tsx` — საიტის დიზაინში, `SiteHeader` + `Footer`-ით,
   ორენოვანი ტექსტით:
   - KA: „პროდუქტი ვერ მოიძებნა" + „შესაძლოა ეს ნივთი ამჟამად მიუწვდომელია თქვენს რეგიონში."
   - EN: "Product not found" + "This item may not be available in your region right now."
   - ღილაკი → `/market`
2. სასურველია `src/app/not-found.tsx`-იც (გლობალური 404).
3. `generateMetadata` (57-66 ხაზები) `noindexRobots`-ს უკვე აბრუნებს ✅ — არ შეცვალო.
4. **მნიშვნელოვანი:** ეს აღარაა შეცდომა — ეს ნორმალური სცენარია. არ დაწერო „შეცდომა მოხდა" ან
   „სცადეთ თავიდან"; ტექსტი უნდა იყოს ნეიტრალური.

---

## 4. 🟠 checkout-ის ახალი 400 შეცდომა

**ამჟამად:** [src/components/checkout.tsx:822-830](src/components/checkout.tsx:822) `!response.ok`-ზე
`getApiMessage(payload, ...)`-ს იძახებს, რომელიც [:200-217](src/components/checkout.tsx:200)
`non_field_errors`-ს `"non_field_errors: Variant 7 has no USD price and cannot be ordered..."`
სახით დაბეჭდავს — ინგლისურად, ველის სახელით, მომხმარებლისთვის გაუგებრად.

**გასაკეთებელი:** `handlePlaceOrder`-ში, `getApiMessage`-მდე, დაემატოს ცალკე შემოწმება:

```ts
// checkout.tsx — handlePlaceOrder, ~823 ხაზი
if (!response.ok) {
  if (response.status === 401 || response.status === 403) {
    setOrderError(text.missingAccessToken);
    return;
  }

  if (response.status === 400 && hasUnavailableVariantError(payload)) {
    setOrderError(text.variantUnavailable);
    return;
  }

  setOrderError(getApiMessage(payload, text.placeOrderFailed));
  return;
}
```

`hasUnavailableVariantError` — `non_field_errors` მასივში მოძებნოს `"has no USD price"`
(case-insensitive). ტექსტის მატჩინგი მყიფეა, ამიტომ **სთხოვე ბექენდს სტაბილური `code`**
(მაგ. `{"code": "variant_currency_unavailable", "variant_ids": [7]}`) — მაშინ სტრიქონზე დამოკიდებულება
გაქრება. სანამ ეს არ იქნება, სტრიქონული შემოწმება fallback-ად დარჩეს.

`text` ობიექტში დაემატოს:

- KA: „კალათაში არის პროდუქტი, რომელიც ამჟამად თქვენს რეგიონში მიუწვდომელია. გთხოვთ, წაშალოთ
  კალათიდან და სცადოთ თავიდან."
- EN: "Your bag contains an item that is currently unavailable in your region. Please remove it and try again."

**დამატებით (რეკომენდებული):** თუ ბექენდი `variant_ids`-ს დააბრუნებს, ეს item-ები კალათაში
ვიზუალურად მოინიშნოს (გაფერმკრთალება + „მიუწვდომელია" ბეიჯი + „წაშლა" ღილაკი) —
[src/components/shopping-bag.tsx](src/components/shopping-bag.tsx)-ში და checkout-ის summary-ში.
ამის გარეშე მომხმარებელმა არ იცის, **რომელი** ნივთი წაშალოს.

---

## 5. 🟡 `GET /api/sections/` — ახალი ენდფოინთი მთავარ გვერდზე

**გასაკეთებელი:**

1. **ტიპი** — `src/types/catalog.ts`-ში:

```ts
export type ApiHomeSection = {
  id: number;
  title: { KA: string; EN: string };
  category: { slug: string; name: { KA: string; EN: string } };
  products: ApiProductListItem[];
  updated_at: string;
};
```

2. **fetcher** — `src/lib/catalog-api.ts`-ში, `fetchCatalogProductsCached`-ის სტილში:
   `cache()`-ში გახვეული, `fetchJson`-ით, `cache: "no-store"`-ით, `API_BASE_URL`-ის შემოწმებით.
   ცარიელ მასივზე/შეცდომაზე → `undefined`, რომ გვერდი არ ჩავარდეს.

3. **გამოძახება** — [src/app/page.tsx:48-52](src/app/page.tsx:48) `ShowRoomContent`-ში,
   `fetchBlogPosts`/`fetchCatalogProducts`-ის გვერდით. ⚠️ ამჟამად ეს ორი **თანმიმდევრობით**
   იძახება (`await` ერთმანეთის მიყოლებით) — გამოიყენე `Promise.all`, მესამე მოთხოვნა რომ
   დამატებით არ შეანელოს გვერდი.

4. **რენდერი** — [src/components/show-room.tsx](src/components/show-room.tsx)-ში ახალი სექცია:
   - სათაური: `getLocalizedText(section.title, language)`
   - პროდუქტების ბადე: იგივე კარტის მარკაპი, რაც [src/components/market.tsx:399-432](src/components/market.tsx:399)
   - ღილაკის ბმული: **`/market?category=<slug>`, არა `/shop?category=<slug>`** — ამ პროექტში
     კატალოგის როუტი `/market`-ია. გამოიყენე არსებული helper-ი:
     `buildCategoryHref({ slug: section.category.slug })` —
     [src/lib/catalog-routing.ts:12](src/lib/catalog-routing.ts:12) (default `catalogBasePath` უკვე `/market`)
   - **მაქსიმუმ 2 სექცია** — მაინც დაადე `.slice(0, 2)`, ბექენდის გარანტიაზე არ დაეყრდნო
   - ფასები — `formatMoney(product.min_price, product.currency)` (პუნქტი 2)
   - ცარიელი `products`-ის ან ცარიელი პასუხის შემთხვევაში სექცია საერთოდ არ დაირენდეროს

5. **ავტორიზაცია არ სჭირდება** → `fetchWithAuthRetry`-ს **ნუ** გამოიყენებ, თორემ proxy-ზე გადავა.
   ჩვეულებრივი `fetch` `API_BASE_URL`-ით, `catalog-api.ts`-ის სტილში.

6. **ძველი ბლოკის ბედი:** გადაწყვიტე, `HOME_SALE_DISCOUNTS`-ის ფეიკური sale ბლოკი
   ([src/components/show-room.tsx:90](src/components/show-room.tsx:90), [:176-235](src/components/show-room.tsx:176),
   [:936-944](src/components/show-room.tsx:936)) ჩანაცვლდება თუ თანაარსებობს ახალ სექციებთან.
   ჩემი რეკომენდაცია — ჩანაცვლდეს.

---

## 6. 🟡 `contrast_logo`-ს გამოყენება

**კონტექსტი:** [src/components/show-room.tsx:558](src/components/show-room.tsx:558) და
[:673-674](src/components/show-room.tsx:673) უკვე ითვლის `headerTone`-ს (`"light" | "dark"`) —
hero-ზე გადაფარვისას ჰედერის ტონი იცვლება. სწორედ აქ არის `contrast_logo` საჭირო.

**გასაკეთებელი:**

1. [src/types/brand.ts:44,51](src/types/brand.ts:44) — `logo`/`logo_url`-ის გვერდით დაემატოს:
   ```ts
   contrast_logo: string | null;
   contrast_logo_url: string | null;
   ```
2. [src/lib/brand.ts:249](src/lib/brand.ts:249) — `logoUrl`-ის მსგავსად:
   ```ts
   const contrastLogoUrl = readMediaUrl(data.contrast_logo_url, data.contrast_logo);
   ```
   და return-ში (271-292) ორივე ველი დაემატოს. `readMediaUrl` `null`-ს კორექტულად ამუშავებს ✅
3. `BrandApiResponse` ტიპში (8-15) დაემატოს `contrast_logo_url?: string | null;`
4. **გამოყენება — ყველგან fallback აუცილებელია** (`contrast_logo` შეიძლება `null` იყოს):

   | ფაილი:ხაზი | წესი |
   |---|---|
   | [src/components/site-header.tsx:157](src/components/site-header.tsx:157) | `headerTone === "light"` (ღია hero-ზე) → `contrast_logo_url ?? logo_url`; სხვა შემთხვევაში → `logo_url` |
   | [src/components/show-room.tsx:1158](src/components/show-room.tsx:1158) | იგივე ლოგიკა |
   | [src/components/footer.tsx:155](src/components/footer.tsx:155) | თუ ფუთერი მუქ ფონზეა → `contrast_logo_url ?? logo_url` |
   | [src/app/layout.tsx:87](src/app/layout.tsx:87) | **არ შეცვალო** — OG/schema-ს ჩვეულებრივი ლოგო სჭირდება |

   fallback-ის შაბლონი:
   ```ts
   const logoSrc =
     (needsContrast ? brand?.contrast_logo_url?.trim() || brand?.contrast_logo?.trim() : "") ||
     brand?.logo_url?.trim() ||
     brand?.logo?.trim() ||
     "/images/full.png";
   ```
5. [next.config.ts](next.config.ts) `remotePatterns` — `contrast_logo` იმავე ჰოსტიდან მოდის,
   ცვლილება არ სჭირდება ✅

---

## 7. 🟡 429 Too Many Requests

**ამჟამად:** კოდში `429`-ის არცერთი ხსენება არ არის. `!response.ok` ყველგან საერთო შეცდომაში
ვარდება, ან (catalog-ის შემთხვევაში) `undefined`/`null`-ში — ანუ მომხმარებელს ან „შეცდომა მოხდა"
დახვდება, ან ცარიელი გვერდი ახსნის გარეშე.

**გასაკეთებელი:**

1. **`/api/proxy/` ჰედერს კარგავს** —
   [src/app/api/proxy/[...path]/route.ts:132-136](src/app/api/proxy/[...path]/route.ts:132)
   მხოლოდ `Content-Type`-ს გადმოაქვს. `Retry-After` იკარგება.
   → `responseHeaders.set("Retry-After", ...)` დაემატოს, როცა upstream-ს აქვს.
   სტატუსი (`429`) ისედაც გადმოდის ✅

2. **საერთო helper** `src/lib/currency.ts`-ის მსგავსად, მაგ. `src/lib/api-errors.ts`:
   ```ts
   export const isThrottled = (response: Response) => response.status === 429;

   export const getRetryAfterSeconds = (response: Response) => {
     const raw = response.headers.get("Retry-After");
     const parsed = raw ? Number(raw) : NaN;
     return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : null;
   };
   ```

3. **სად შემოწმდეს** — ყველგან, სადაც ახლა `response.status === 401 || 403` მოწმდება:
   [src/components/checkout.tsx:756](src/components/checkout.tsx:756),
   [:824](src/components/checkout.tsx:824), [:867](src/components/checkout.tsx:867),
   [src/components/payment-success.tsx:160](src/components/payment-success.tsx:160),
   [src/components/profile.tsx](src/components/profile.tsx), [src/lib/cart-api.ts](src/lib/cart-api.ts).
   შეტყობინება:
   - KA: „ძალიან ბევრი მოთხოვნა. სცადეთ ხელახლა {N} წამში."
   - EN: "Too many requests. Please try again in {N} seconds."

4. **`fetchWithAuthRetry` — არ დაამატო ავტომატური retry.**
   [src/lib/auth.ts:143-157](src/lib/auth.ts:143) 401-ზე ერთხელ ცდის ხელახლა — 429-ზე იგივე
   **არ** გააკეთო, თორემ ლიმიტს კიდევ უფრო გაამწვავებ. 429 პირდაპირ UI-მდე უნდა ავიდეს.

5. **სად ვიძახებთ ციკლში / ხშირად** — გადამოწმდეს:
   - [src/components/shopping-bag.tsx:33-60](src/components/shopping-bag.tsx:33)
     `fetchAccountActiveStatus` ორ ენდფოინთს (`/api/me/`, `/api/auth/me/`) მიყოლებით სცდის →
     ორმაგი ტრაფიკი. გაირკვეს, რომელია სწორი, და ერთი დარჩეს.
   - [src/lib/auth.ts:97-129](src/lib/auth.ts:97) `fetchAuthSession` — dedup-ი აქვს ✅
   - `catalog-api.ts`-ის `cache()`-ები — მხოლოდ ერთი render-ის ფარგლებში მოქმედებს, ანუ თითო
     გვერდის ჩატვირთვაზე ისევ ახალი მოთხოვნაა. `cache: "no-store"`-ის შეცვლა ვალუტის გამო
     **სახიფათოა** (გაქეშილი ფასი სხვა ვალუტაში მოხვდება სხვა ვიზიტორთან), ამიტომ ჯერ პუნქტ 0-ს
     დაელოდე.
   - `catalog-api.ts`-ის `fetchJson` შეცდომას ჩუმად ყლაპავს (39-49) — 429-ის შემთხვევაშიც
     `undefined` დაბრუნდება და მომხმარებელი „პროდუქტები არ არის"-ს დაინახავს. სასურველია
     სტატუსის გატანა, რომ გვერდმა განასხვავოს „ცარიელია" და „ლიმიტს გადავაცილეთ".

---

## შესრულების რიგი

| # | სამუშაო | სტატუსი | დამოკიდებულება |
|---|---|---|---|
| 0 | SSR/proxy vs Cloudflare geo — გადაწყვეტილება | 🛑 ბლოკერი, ბექენდთან | — |
| 1 | API base URL + validate-env guard | 🔴 დამოუკიდებელი | — |
| 2 | `currency.ts` helper + ტიპები + 6 ადგილას ფასის ჩვენება | 🔴 | ვიზუალურად სწორი მხოლოდ 0-ის შემდეგ |
| 3 | `not-found.tsx` (პროდუქტის + გლობალური) | 🟠 დამოუკიდებელი | — |
| 4 | checkout 400 (`variant has no USD price`) | 🟠 | სასურველია ბექენდისგან `code` |
| 5 | `/api/sections/` მთავარ გვერდზე | 🟡 | 2 (ფასის ჩვენებისთვის) |
| 6 | `contrast_logo` | 🟡 დამოუკიდებელი | — |
| 7 | 429 (proxy-ის `Retry-After` + UI) | 🟡 | — |

**პარალელურად შეიძლება დაიწყოს:** 1, 3, 6, 7 — არაფერს ელოდებიან.

## ბექენდისთვის დასაზუსტებელი კითხვები

1. **(კრიტიკული)** SSR/proxy-ის შემთხვევაში ქვეყანა როგორ დადგინდეს? მიიღებს თუ არა ბექენდი
   ჩვენგან გადმოგზავნილ ქვეყანას სანდო ჰედერით?
2. checkout-ის 400-ს დაემატება თუ არა სტაბილური `code` და `variant_ids`, რომ ტექსტზე
   დამოკიდებული არ ვიყოთ?
3. `/api/sections/`-ის `products[]` ზუსტად იგივე ფორმატია, რაც `/api/products/`? `currency`
   შედის თუ არა თითო პროდუქტში?
4. rate limiting-ის გასაღები IP-ზეა თუ სესიაზე? (ერთი სერვერის IP-იდან მომავალი მოთხოვნების გამო)
5. `/api/instagram/embeds/`-ს ([src/components/show-room.tsx:85](src/components/show-room.tsx:85))
   ვალუტა/rate limit ეხება?
