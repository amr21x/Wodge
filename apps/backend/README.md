# Backend

Start at [src/server.ts](src/server.ts). It exports the Hono Worker and the five
PartyServer Durable Object classes registered in [wrangler.jsonc](wrangler.jsonc).
There is no default Party or separate PartyKit deployment.

- [src/server.ts](src/server.ts) exports the Worker and the Durable Object classes. [src/application.ts](src/application.ts) defines Hono middleware order, Better Auth, webhooks and API mounts.
- `routes/` declares routes and receives class handlers through constructor injection. Routes bind handler methods once when the router is constructed.
- `handlers/` validates requests, authorizes operations, coordinates core services and calls gateways or technical integrations. Handlers never import repositories.
- `validators/` composes transport request schemas from domain schemas; sync envelopes live in `lib/sync/validation.ts`.
- `servers/` contains PartyServer/YServer lifecycle adapters. `di/runtime.ts` restores object records and supplies ready dependencies during awaited startup. Requests and alarms reuse those instances.
- `container.ts` configures registrations once. `di/register-services.ts`, `di/register-repositories.ts`, `di/register-transport.ts` and `di/register-providers.ts` explicitly register classes and their lifetimes. `di/providers.ts` supplies lazy database/auth factories; `di/adapters.ts` maps capability tokens to implementations.
- Classes use `@injectable()` and explicit constructor `@inject` tokens. They do not self-register. TSyringe caches instances within each Worker environment or Durable Object activation. No request container, handler map or container-valued Hono context is involved.
- `types/` defines Worker environment bindings, Hono context variables, actors and the explicit object-kind union. Identity, headers and mutation revisions are operation arguments, not DI registrations.
- `gateways/` handles communication between objects through the infrastructure HTTP client. `/parties/:namespace/:id/*` is the PartyServer routing prefix. Internal stub requests use a synthetic `https://internal` URL; the selected Durable Object stub determines the destination.
- Core feature `services/` owns business operations; `repositories/` owns data access. Infrastructure configures SDKs, database clients and storage primitives. Repository instances receive their database/storage dependency once.
- Domain owns declarative models, schemas and DTOs. Core `mutations/` contains pure transformations also used by web optimistic updates; browser checks exclude services, repositories and provider SDKs.
- Auth owns Better Auth configuration, identity/session helpers and workspace authorization. Generic email delivery belongs to infrastructure. Better Auth owns the canonical D1 user, organization and membership records; workspace collaboration state and resource policies remain in its Durable Object.
- Organization lifecycle synchronization is coordinated by backend handlers. Direct Better Auth mutations that would bypass coordination are blocked; ordinary authentication and organization reads remain available.

[Authorization rollout](../../docs/features/team-roles-access/authorization/design.md#implemented-first-slice)
records remaining page/thread permission work. D1 and Durable Object updates are
separate transactions; durable reconciliation and queues remain follow-up work.
The current SQLite-backed objects still use the storage KV API, rather than relational tables.

## Typed frontend API

The source contract is [src/types/api-types.ts](src/types/api-types.ts). Run
`pnpm --filter backend build:api` to generate the declaration-only `backend/api`
entry. The frontend client lives in `apps/web/src/client/api.ts`:

```ts
const response = await api.api.users.me.$get();
const user = await response.json();
```

DI still constructs route classes and handlers. Each route class retains the
inferred return type of its static route definition; parent mounts retain their
returned types too. JSON validators expose wire inputs and parsed handler inputs.
The contract generator resolves the HTTP schema and strips Worker environments
and implementation imports. It never constructs services or executes backend code.

Frontend dev/build/typecheck scripts generate the contract first. Root `pnpm dev`
also watches backend types; for a standalone watcher, run
`pnpm --filter backend dev:api`. Verify consumer compile checks with
`pnpm --filter backend test:api`.

Workspace authorization and room-token forwarding derive contracts from the owning
object routes, with public path parameters applied at the Worker boundary. Binary
file forwarding and opaque sync/auth responses retain raw response types; do not
assume their JSON shape. Global error-handler responses are not inferred by Hono
RPC. Better Auth's own client remains the authentication client.

## Development

Copy `.dev.vars.example` to `.dev.vars` and provide local secrets. Set the public web
environment from the root `.env.example`. Start backend with `pnpm --filter backend dev`
and web with `pnpm --filter web dev`. Next forwards `/api/*` to the local Worker.

Apply local migrations with `pnpm --filter backend db:migration:local`. Auth is fresh:
no Supabase accounts, passwords or sessions are imported. Existing application data
is not deleted or linked to newly authenticated accounts automatically.

- `pnpm --filter backend test`: domain/application/transport regression tests.
- `pnpm --filter backend test:runtime`: production Worker, real D1/DOs and Better Auth checks in Miniflare. Email and object storage are mocked at the network boundary.
- `pnpm --filter backend test:foundation`: retained package and database compatibility checks.
- `pnpm --filter backend build`: Wrangler dry-run bundle.

## Deployment

The checked-in Worker configuration bootstraps new SQLite-backed Durable Object
classes. It does not migrate deployed PartyKit namespaces or old Yjs snapshots.
Before a production cutover, inspect the deployed namespace/class mappings, preserve
or transfer their records, and verify the Yjs document export/import. Existing SQL
migration statements are preserved; Drizzle metadata is upgraded and a new auth
migration is added.

Production `/api/*` paths on the web hostname must route to this Worker. Keep the
backend hostname available for existing PartySocket clients. Better Auth's public
base URL is `APP_DOMAIN`; register Google/GitHub callbacks under
`<APP_DOMAIN>/api/auth/callback/<provider>`. Configure Resend delivery and the Worker
secrets listed in `.dev.vars.example`.

The deployment workflow is manually triggered while namespace cutover remains
unverified. It uses Cloudflare credentials, a `BACKEND_SECRETS` JSON secret and
`APP_DOMAIN`, `BACKEND_DOMAIN`, `AVATARS_URL` repository variables. The initial Worker
must exist before bulk secret configuration. It does not apply remote migrations
or create the web-origin route automatically.

The structural/type review handoff is in
[backend-review-handoff.md](../../docs/development/backend-review-handoff.md).

Decorator execution requires `reflect-metadata` before decorated imports. The DI entrypoint
and the test setup load it first. Legacy decorators are enabled with
`experimentalDecorators`; esbuild does not emit design metadata, so every injected
constructor parameter has an explicit `@inject` token. Hono middleware remains
functions using Hono's native middleware contract.
