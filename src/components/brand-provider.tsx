"use client";

import { createContext, useContext } from "react";
import type { Brand } from "../types/brand";

const BrandContext = createContext<Brand | null>(null);

type BrandProviderProps = {
  brand: Brand | null;
  children: React.ReactNode;
};

export function BrandProvider({ brand, children }: BrandProviderProps) {
  return (
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);
