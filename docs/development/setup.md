# Local setup and current commands

[Docs home](../README.md) · [Develop Wodge](README.md)

Use Node >=22.19 and pnpm 9.4.0. The backend runs a Hono Worker and five PartyServer
Durable Objects; web remains Next-on-Pages and calls backend APIs. Authentication
uses the separate `@wodge/auth` package with Better Auth, D1, email OTP, Google and
GitHub. Editor extensions use the public Tiptap v2 packages.

## Configure and start

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Copy the root `.env.example` to `apps/web/.env.local`. These values are public web configuration.
3. Copy `apps/backend/.dev.vars.example` to `apps/backend/.dev.vars`. Set local auth, email, OAuth and provider credentials there.
4. Apply local D1 migrations with `pnpm --filter backend db:migration:local`.
5. Start `pnpm --filter backend dev` and `pnpm --filter web dev`. Next forwards `/api/*` to the Worker in development.

Worker bindings and public backend values are in `apps/backend/wrangler.jsonc`.
Core services are registered in the sole backend container. Web has no D1 binding,
DI container, application API handlers, Supabase integration or backend secrets.
Auth schemas and migrations belong to domain. Database configuration belongs to
infrastructure.

`pnpm init:app` applies local migrations; it does not generate a new migration.
`pnpm generate` generates Drizzle migrations. `pnpm reset:app` deletes local
Wrangler state and therefore local data; it is not a routine setup step.
`pnpm livekit` starts the separate local call server.

## Verify

- `pnpm exec vitest run --maxWorkers=2 --minWorkers=1` runs domain and backend tests.
- `pnpm --filter backend test:runtime` runs the actual Worker/DO/auth flows in Miniflare, mocking external email and object storage.
- `pnpm --filter backend test:foundation` checks package and existing database compatibility.
- `pnpm --filter backend build` performs a Wrangler dry-run build.
- `pnpm check:boundaries` checks package ownership and web/backend dependencies.

See [test inventory](testing-strategy.md) for cases and limits. Browser preview on
the current host needs `libasound.so.2`; complete web build/typecheck. Live OAuth completion and email delivery need actual
provider configuration.

## Deployment

Fresh authentication accounts are allowed; existing application data is not reset
or silently attached to new accounts. The checked-in Worker registrations create
new namespaces. Existing PartyKit storage and Yjs snapshots need an explicit
cutover before production deployment. See [backend deployment notes](../../apps/backend/README.md).

The manually triggered workflow uses Wrangler and Cloudflare secret management.
It does not apply remote migrations or configure the web-origin route. No remote
secrets, databases, deployments or authentication providers were changed.

Historical checkout evidence remains in [baseline](baseline.md),
[failure inventory](failure-inventory.md), and [security evidence](security-evidence.md).
