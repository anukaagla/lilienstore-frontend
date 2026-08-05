import fs from "node:fs";
import path from "node:path";

const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const mode = (process.env.NODE_ENV ?? "development").trim() || "development";
const envFiles = [".env", `.env.${mode}`, ".env.local", `.env.${mode}.local`];

const parseLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex <= 0) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  if (!ENV_KEY_PATTERN.test(key)) return null;

  let rawValue = trimmed.slice(equalsIndex + 1).trim();
  if (!rawValue) {
    return { key, value: "" };
  }

  const quote = rawValue[0];
  const isQuoted =
    (quote === '"' || quote === "'") &&
    rawValue.endsWith(quote) &&
    rawValue.length >= 2;

  if (isQuoted) {
    rawValue = rawValue.slice(1, -1);
    if (quote === '"') {
      rawValue = rawValue.replace(/\\n/g, "\n");
    }
    return { key, value: rawValue };
  }

  const commentIndex = rawValue.indexOf("#");
  if (commentIndex >= 0) {
    rawValue = rawValue.slice(0, commentIndex).trimEnd();
  }

  return { key, value: rawValue };
};

const loadEnvFile = (fileName, target) => {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    target[parsed.key] = parsed.value;
  }
};

const loadedFileEnv = {};
for (const file of envFiles) {
  loadEnvFile(file, loadedFileEnv);
}

for (const [key, value] of Object.entries(loadedFileEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const trim = (value) => (typeof value === "string" ? value.trim() : "");

const requiredKeys = ["NEXT_PUBLIC_API_BASE_URL"];
const errors = [];
const warnings = [];

const requireValue = (key) => {
  if (!trim(process.env[key])) {
    errors.push(`Missing required environment variable: ${key}`);
  }
};

const validateHttpUrl = (key) => {
  const value = trim(process.env[key]);
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      errors.push(`${key} must use an http(s) URL. Received: ${value}`);
      return null;
    }
    return parsed;
  } catch {
    errors.push(`${key} must be a valid URL. Received: ${value}`);
    return null;
  }
};

for (const key of requiredKeys) {
  requireValue(key);
}

const publicApiUrl = validateHttpUrl("NEXT_PUBLIC_API_BASE_URL");
const serverApiUrl = validateHttpUrl("API_BASE_URL");
const siteUrl = validateHttpUrl("NEXT_PUBLIC_SITE_URL");

if (!serverApiUrl) {
  warnings.push(
    "API_BASE_URL is not set; server route handlers will use NEXT_PUBLIC_API_BASE_URL.",
  );
}

// The backend derives the visitor's currency from Cloudflare's CF-IPCountry header.
// A *.onrender.com origin bypasses Cloudflare entirely, so every price silently
// falls back to GEL. This must fail the build, not merely warn.
const CDN_BYPASS_HOSTS = ["onrender.com"];

const isCdnBypassHost = (parsed) =>
  CDN_BYPASS_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
  );

// Leaking the shared secret to the browser would let anyone forge their own currency.
for (const key of Object.keys(process.env)) {
  if (key.startsWith("NEXT_PUBLIC_") && key.includes("INTERNAL_PROXY_TOKEN")) {
    errors.push(
      `${key} must not be public. Rename it to INTERNAL_PROXY_TOKEN so it stays server-side.`,
    );
  }
}

if (mode === "production") {
  const productionUrls = [
    ["NEXT_PUBLIC_API_BASE_URL", publicApiUrl],
    ["API_BASE_URL", serverApiUrl],
    ["NEXT_PUBLIC_SITE_URL", siteUrl],
  ];

  for (const [key, parsed] of productionUrls) {
    if (!parsed) continue;
    if (parsed.protocol !== "https:") {
      warnings.push(
        `${key} should use https in production. Received: ${parsed.toString()}`,
      );
    }
  }

  for (const [key, parsed] of productionUrls.slice(0, 2)) {
    if (!parsed) continue;
    if (isCdnBypassHost(parsed)) {
      errors.push(
        `${key} must point at the Cloudflare-fronted API domain, not ${parsed.hostname}. ` +
          "Origins that bypass Cloudflare break currency detection (everything becomes GEL).",
      );
    }
  }

  if (!trim(process.env.INTERNAL_PROXY_TOKEN)) {
    warnings.push(
      "INTERNAL_PROXY_TOKEN is not set; the backend will ignore the visitor country/IP " +
        "we forward and fall back to CF-IPCountry, which resolves to this server, not the visitor.",
    );
  }
}

if (errors.length > 0) {
  console.error("Environment validation failed:\n");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("Environment validation warnings:\n");
  for (const message of warnings) {
    console.warn(`- ${message}`);
  }
}

console.log(
  `Environment validation passed for NODE_ENV=${mode}. Checked files: ${envFiles.join(", ")}`,
);
