import type { NextConfig } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
type ImageRemotePattern =
  NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const getApiRemotePattern = (): ImageRemotePattern | null => {
  if (!API_BASE_URL) {
    return null;
  }

  try {
    const parsed = new URL(API_BASE_URL);
    return {
      protocol: parsed.protocol === "https:" ? "https" : "http",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/**",
    };
  } catch {
    return null;
  }
};

const apiRemotePattern = getApiRemotePattern();
const r2RemotePattern: ImageRemotePattern = {
  protocol: "https",
  hostname: "**.r2.dev",
  pathname: "/**",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: apiRemotePattern
      ? [apiRemotePattern, r2RemotePattern]
      : [r2RemotePattern],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
