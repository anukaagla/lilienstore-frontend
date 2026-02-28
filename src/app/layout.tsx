import type { Metadata } from "next";
import "./globals.css";
import { BrandProvider } from "../components/brand-provider";
import { LanguageProvider } from "../components/language-provider";
import { STATIC_BRAND_NAME, STATIC_FAVICON_PATH } from "../lib/site-config";

export const metadata: Metadata = {
  title: STATIC_BRAND_NAME.EN,
  description: "A contemporary fashion showroom for curated silhouettes.",
  icons: {
    icon: STATIC_FAVICON_PATH,
    shortcut: STATIC_FAVICON_PATH,
    apple: STATIC_FAVICON_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <BrandProvider>{children}</BrandProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
