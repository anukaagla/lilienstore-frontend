export type Product = {
  id: string;
  name: string;
  nameLocalized?: {
    KA: string;
    EN: string;
  };
  price: number;
  primaryImage: string;
  secondaryImage: string;
  createdAt: string;
  detailImages: string[];
  description: string;
  descriptionLocalized?: {
    KA: string;
    EN: string;
  };
  care?: string;
  careLocalized?: {
    KA: string;
    EN: string;
  };
  material?: string;
  materialLocalized?: {
    KA: string;
    EN: string;
  };
  variants?: ProductVariant[];
};

export type ProductVariant = {
  id: number;
  size: string;
  color: string;
  hexColor: string;
  price: number;
  stockQty: number;
  allowOrder: boolean;
};

const detailImages = [
  "/images/dress.png",
  "/images/dress2.png",
  "/images/dress3.png",
  "/images/dress4.png",
  "/images/dress5.png",
  "/images/dress6.png",
  "/images/dress7.png",
  "/images/dress8.png",
];

const description =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

export const products: Product[] = [
  {
    id: "floaty-maxi",
    name: "Floaty Maxi Dress",
    price: 250,
    primaryImage: "/images/dress.png",
    secondaryImage: "/images/dress5.png",
    createdAt: "2026-01-18",
    detailImages,
    description,
  },
  {
    id: "soft-wedding",
    name: "Soft Wedding Gown",
    price: 420,
    primaryImage: "/images/dress2.png",
    secondaryImage: "/images/dress3.png",
    createdAt: "2026-01-17",
    detailImages,
    description,
  },
  {
    id: "night-gleam",
    name: "Night Gleam Jacket",
    price: 310,
    primaryImage: "/images/dress4.png",
    secondaryImage: "/images/dress5.png",
    createdAt: "2026-01-16",
    detailImages,
    description,
  },
  {
    id: "classic-coat",
    name: "Classic Beige Coat",
    price: 280,
    primaryImage: "/images/dress6.png",
    secondaryImage: "/images/dress7.png",
    createdAt: "2026-01-15",
    detailImages,
    description,
  },
  {
    id: "sand-trench",
    name: "Sand Trench",
    price: 260,
    primaryImage: "/images/dress8.png",
    secondaryImage: "/images/dress.png",
    createdAt: "2026-01-14",
    detailImages,
    description,
  },
  {
    id: "sunset-set",
    name: "Sunset Linen Set",
    price: 190,
    primaryImage: "/images/dress2.png",
    secondaryImage: "/images/dress3.png",
    createdAt: "2026-01-13",
    detailImages,
    description,
  },
  {
    id: "red-flare",
    name: "Red Flare Dress",
    price: 240,
    primaryImage: "/images/dress3.png",
    secondaryImage: "/images/dress4.png",
    createdAt: "2026-01-12",
    detailImages,
    description,
  },
  {
    id: "rose-embroidery",
    name: "Rose Embroidery Gown",
    price: 520,
    primaryImage: "/images/dress5.png",
    secondaryImage: "/images/dress6.png",
    createdAt: "2026-01-11",
    detailImages,
    description,
  },
  {
    id: "silk-midi",
    name: "Silk Midi Dress",
    price: 210,
    primaryImage: "/images/dress7.png",
    secondaryImage: "/images/dress8.png",
    createdAt: "2026-01-10",
    detailImages,
    description,
  },
  {
    id: "blue-velvet",
    name: "Blue Velvet Coat",
    price: 360,
    primaryImage: "/images/dress.png",
    secondaryImage: "/images/dress2.png",
    createdAt: "2026-01-09",
    detailImages,
    description,
  },
  {
    id: "minimal-tailor",
    name: "Minimal Tailor Suit",
    price: 340,
    primaryImage: "/images/dress4.png",
    secondaryImage: "/images/dress6.png",
    createdAt: "2026-01-08",
    detailImages,
    description,
  },
  {
    id: "evening-charm",
    name: "Evening Charm Dress",
    price: 295,
    primaryImage: "/images/dress8.png",
    secondaryImage: "/images/dress3.png",
    createdAt: "2026-01-07",
    detailImages,
    description,
  },
];
