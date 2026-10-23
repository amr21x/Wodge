# Documentation site

[Docs home](../README.md) · [Develop Wodge](README.md)

The `apps/docs` workspace renders this repository's `docs/` Markdown with
VitePress. The independent Cloudflare Worker `wodge-docs` serves
`https://wodge.amr21.dev/docs/`. Its exact `/docs` and `/docs/*` routes take
precedence over the frontend Worker's custom domain; they do not match
`/docsmith`, application pages, APIs or realtime endpoints.

## Content and navigation

Edit the Markdown in `docs/`; there is no second content copy. Navigation is
built from the section directories and page headings. README files become section
index pages. Relative Markdown links become site links; references to repository
code or evidence JSON open GitHub. The site includes browser-local full-text search,
light/dark themes, mobile navigation and Mermaid rendering.

Product, development and historical engineering records are all published. Their
revision-specific Pass/Fail/Unverified labels still apply. Search requires no
external service, account, API key or application session. No backend providers,
D1 databases or Durable Objects are needed to serve the documentation.

## Develop and verify

```sh
pnpm install --frozen-lockfile
pnpm --filter docs dev
```

Open `http://localhost:5173/docs/`. For deployment-like asset routing:

```sh
pnpm --filter docs typecheck
pnpm --filter docs build
pnpm --filter docs exec wrangler dev --port 8790
```

Open `http://localhost:8790/docs/`. Check the `/docs` redirect, nested pages,
search, section links, diagrams and a missing-page 404. Generated files live under
`apps/docs/dist/docs/`; Wrangler uploads `apps/docs/dist/`, preserving the public
path prefix. Do not move the files to the asset root or use an SPA fallback:
unknown documentation URLs should return 404.

Root lint/format checks and `node scripts/check-boundaries.mjs` remain required.
The root Turborepo build includes this workspace and caches its `dist/` output.

## Deploy this Worker independently

Deployment requires Cloudflare access to the account/zone hosting `amr21.dev`.
The existing web/backend Workers do not need rebuilding or redeployment.

From the repository root, after reviewing the candidate:

```sh
pnpm --filter docs deploy
```

This builds the docs and deploys `apps/docs/wrangler.jsonc`. It publishes assets
and the two docs routes only. It does not run application migrations, change
application secrets or dispatch GitHub Actions. `workers_dev` is disabled; the
custom hostname must already resolve through Cloudflare for the app.

For an independent Cloudflare Git-connected project, select repository
`amr21x/Wodge`, Worker name `wodge-docs`, root `apps/docs`, production branch
`main`, build command `pnpm build`, and deploy command `pnpm exec wrangler deploy`.
Use Node 24.19.0 and pnpm 12.15.0. The checkout must include the whole repository
because content lives in `../../docs`. No secrets or build-time application
variables are required. Review automatic build/branch controls before connecting;
a manual deployment does not configure Git integration.

The owner-requested initial publication is performed manually, without running
CI/CD. Subsequent source pushes that must skip automation use the supported
`[skip ci]` prefix described in [CI/CD controls](../operations/ci-cd.md).

## Recovery and cost

Deploy the previous reviewed docs revision to roll back content; this static
Worker has no application database or migration state. Removing its two routes
returns `/docs` traffic to the frontend Worker and makes documentation unavailable;
it does not remove backend API routes. A docs deployment must not replace the
frontend Worker's custom domain.

Static assets avoid an application server and database on the docs request path.
Cloudflare account limits and any build usage still apply; this is not a promised
zero-cost or unlimited hosting tier. Keep secrets out of public Markdown.
