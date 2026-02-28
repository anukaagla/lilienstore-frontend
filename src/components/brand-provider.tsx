"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { fetchBrand } from "../lib/brand";
import type { Brand } from "../types/brand";

type BrandContextValue = {
  brand: Brand | null;
  isLoading: boolean;
};

const BrandContext = createContext<BrandContextValue>({
  brand: null,
  isLoading: true,
});

type BrandProviderProps = {
  initialBrand?: Brand | null;
  children: React.ReactNode;
};

export function BrandProvider({
  initialBrand = null,
  children,
}: BrandProviderProps) {
  const [brand, setBrand] = useState<Brand | null>(initialBrand);
  const [isLoading, setIsLoading] = useState(initialBrand === null);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (brand || hasRequestedRef.current) {
      return;
    }

    hasRequestedRef.current = true;
    let cancelled = false;

    const loadBrand = async () => {
      try {
        const nextBrand = await fetchBrand();
        if (cancelled) {
          return;
        }
        setBrand(nextBrand);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadBrand();

    return () => {
      cancelled = true;
    };
  }, [brand]);

  return (
    <BrandContext.Provider value={{ brand, isLoading }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext).brand;

export const useBrandState = () => useContext(BrandContext);
