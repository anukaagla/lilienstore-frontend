import type { MetadataRoute } from "next";

import { SITE_ORIGIN } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/checkout",
          "/checkout/cancel",
          "/checkout/success",
          "/profile",
          "/register",
          "/reset-password",
          "/shopping-bag",
          "/*?q=*",
          "/*&q=*",
          "/*?sort=*",
          "/*&sort=*",
          "/*?search=*",
          "/*&search=*",
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: new URL(SITE_ORIGIN).host,
  };
}
