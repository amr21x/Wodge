# Web application

The frontend uses Next.js 15 and React 18. OpenNext builds it for Cloudflare Workers;
`wodge-backend` continues to own API routes, authentication and Durable Objects.

From the repository root:

- `pnpm --filter web dev`: Next.js development server, with API requests sent to the local backend.
- `pnpm --filter web build`: standard Next.js build.
- `pnpm --filter web workers:build`: build the frontend Worker and static assets in `.open-next/`.
- `pnpm --filter web preview`: build and preview under the Workers runtime.
- `pnpm --filter web deploy:app`: build and deploy the frontend Worker.

Set the three `NEXT_PUBLIC_*` values documented in the root `.env.example` before
building. Production uses the `BACKEND` service binding declared in
`wrangler.jsonc` for server-side API requests; browser requests stay on the public
origin. Start the backend Wrangler dev server when testing the Workers preview
locally so the service binding can resolve.

Authenticated pages remain dynamic. No incremental-cache R2 bucket is configured.
PWA installation and the existing service worker remain enabled. No Pages project,
Vercel CLI or custom build script is required.

See the [production runbook](../../docs/operations/runbooks/production-deployment.md)
for Cloudflare build settings, secrets, domain cutover and verification.
