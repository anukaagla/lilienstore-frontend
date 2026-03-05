# Lilien Store Frontend

Next.js 16 storefront for Lilien.

## Requirements

- Node.js 20+
- npm 10+

## Environment Variables

Copy `.env.example` to `.env.local` and set values for your environment.

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API origin used by browser-side requests |
| `API_BASE_URL` | No (recommended) | Backend API origin for server route handlers |
| `NEXT_PUBLIC_SITE_URL` | No | Public frontend URL for metadata/canonical links |

`npm run validate:env` is automatically executed before `build` and `start`.

## Local Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run check
```

This runs env validation, TypeScript type checks, and ESLint.

## Production Build

```bash
npm run build
npm run start
```

`next.config.ts` is configured for production with:

- `output: "standalone"` for container/process-manager deployment
- `reactStrictMode: true`
- `poweredByHeader: false`
- baseline security headers

## Deployment Notes

- Ensure `NODE_ENV=production` in runtime.
- Use HTTPS API/frontend URLs in production envs.
- If deploying in containers, copy `.next/standalone` plus `.next/static` and `public`.
