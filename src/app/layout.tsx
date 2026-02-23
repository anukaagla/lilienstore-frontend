import type { Metadata } from "next";
import "./globals.css";
import { BrandProvider } from "../components/brand-provider";
import { LanguageProvider } from "../components/language-provider";
import { fetchBrand } from "../lib/brand";

export const metadata: Metadata = {
  title: "Lilien Atelier",
  description: "A contemporary fashion showroom for curated silhouettes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = await fetchBrand();
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <BrandProvider brand={brand}>{children}</BrandProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
