# Wodge documentation site

VitePress renders the existing repository `docs/` tree. The independent
`wodge-docs` Cloudflare Worker serves static files at `wodge.amr21.dev/docs` and
`wodge.amr21.dev/docs/*`. A `/docs*` route also catches query strings on the
base URL; its fallback forwards other prefix matches to `wodge-web` through a
service binding. Matching assets are served before the fallback Worker.

```sh
pnpm --filter docs dev
pnpm --filter docs test
pnpm --filter docs typecheck
pnpm --filter docs build
pnpm --filter docs exec wrangler dev --port 8790
```

Open `http://localhost:5173/docs/` for editing or
`http://localhost:8790/docs/` to test the built Cloudflare assets.

See [publishing and recovery](../../docs/development/docs-site.md) for deployment.
