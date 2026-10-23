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
- Domain owns declarative models, schemas and DTOs. Backend services execute relational operations through repositories. Web owns its optimistic transformations and cannot import or depend on core.
- Auth owns Better Auth configuration, identity/session helpers and workspace authorization. Generic email delivery belongs to infrastructure. Better Auth owns the canonical D1 user, organization and membership records; workspace collaboration state and resource policies remain in its Durable Object.
- Organization lifecycle synchronization is coordinated by backend handlers. Direct Better Auth mutations that would bypass coordination are blocked; ordinary authentication and organization reads remain available.

[Authorization rollout](../../docs/features/team-roles-access/authorization/design.md#implemented-first-slice)
records the authorization rollout. Access groups are removed; room/page/thread access
uses scoped custom roles. D1 and Durable Object updates are
separate transactions; durable reconciliation and queues remain follow-up work.
Structural records and binary Yjs snapshots/update journals use Drizzle in each SQLite-backed
object, with a connection and migrations separate from D1. Replicache metadata, presence,
authorization policies/outbox records and room bindings also use relational tables.
KV reads only import legacy records once; normal operations never write them.
[Persistence boundaries](../../docs/architecture/data-model.md) describes table migrations and the one-time structural import.

## Typed frontend API

[src/types/api-types.ts](src/types/api-types.ts) exports the inferred Hono route
schema as `backend/api`. The frontend imports it with `import type`, so backend
implementation code is erased from browser bundles. No generated contract or
watcher is needed. The frontend client lives in `apps/web/src/client/api.ts`:

```ts
const response = await api.api.users.me.$get();
const user = await response.json();
```

DI still constructs route classes and handlers. Each route class retains the
inferred return type of its static route definition; parent mounts retain their
returned types too. JSON validators expose wire inputs and parsed handler inputs.
The exported Hono schema omits Worker environment bindings. TypeScript follows
backend source dependencies when checking the frontend; its configuration enables
the backend's decorator syntax. No backend modules execute through a type import.
Verify consumer compile checks with `pnpm --filter backend test:api`.

Workspace authorization and room-token forwarding derive contracts from the owning
object routes, with public path parameters applied at the Worker boundary. Binary
file forwarding and opaque sync/auth responses retain raw response types; do not
assume their JSON shape. Global error-handler responses are not inferred by Hono
RPC. Better Auth's own client remains the authentication client.

## Development

Store the keys listed in `.dev.vars.example` in the application's Bitwarden
Secrets Manager project and run `pnpm secrets setup` once per machine (`pnpm secrets refresh` after changes); see
[local secrets](../../README.md#local-secrets). Set the public web environment from
the root `.env.example`. Start backend with
`pnpm secrets run -- pnpm --filter backend dev` and web with `pnpm --filter web dev`. Next forwards `/api/*` to the local Worker.

Google and GitHub are the supported sign-in methods. `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are mandatory
in both integration modes. Configure provider callbacks as
`<APP_DOMAIN>/api/auth/callback/google` and `<APP_DOMAIN>/api/auth/callback/github`.
Email/OTP sign-in is disabled and does not require Resend.

`BETTER_AUTH_SECRET` and `SECRET_KEY` must each contain at least 32 characters and
differ from one another; origins and D1/DO bindings come from Wrangler.
`INTEGRATION_MODE=partial` is the local default. Storage and billing credentials
remain optional in partial mode. Missing storage, billing or call configuration
returns HTTP 503 when those operations are attempted; calls always return HTTP 403 with
`CALLS_DISABLED`, regardless of credentials or plan. Authentication is never bypassed: sign-in requires a configured Google or GitHub OAuth provider.
Workspace synchronization skips bucket creation without storage credentials, so collaboration
can run after authentication. Workspaces created this way need their buckets provisioned before
enabling uploads later. Provider verification and required deployment configuration remain
showcase readiness work; a successful local health check does not establish those integrations.

Apply local migrations with `pnpm --filter backend db:migration:local`. Auth is fresh:
no Supabase accounts, passwords or sessions are imported. Existing application data
is not deleted or linked to newly authenticated accounts automatically.

- `pnpm --filter backend test`: domain/application/transport regression tests.
- `pnpm --filter backend test:runtime`: production Worker, real D1/DOs and Better Auth checks in Miniflare. OAuth providers, the Polar sandbox API and object storage are mocked at the network boundary.
- `pnpm --filter backend test:foundation`: retained package and database compatibility checks.
- `pnpm --filter backend build`: Wrangler dry-run bundle.

## Billing event processing

Billing uses Polar through Better Auth's Polar plugin (`@polar-sh/better-auth`), always against
the Polar sandbox. A workspace subscription belongs to the purchasing administrator's personal
Polar customer and carries the workspace ID as `metadata.referenceId`; Polar organization
synchronization is not enabled. The workspace billing API authorizes administrators and calls the
plugin's checkout and portal server API. Browser calls to the plugin's `/api/auth/checkout`,
`/api/auth/customer/*` and `/api/auth/usage/*` endpoints are rejected. Only the purchasing
administrator can open the customer portal; other administrators receive
`BILLING_PORTAL_PURCHASER_ONLY`. Checkout redirects are not payment evidence.

The plugin verifies webhook signatures at `/api/auth/polar/webhooks`. Every `subscription.*`
event only identifies the subscription: the backend re-reads it from Polar and ignores other
products and mismatched workspace references. Core services decide entitlement transitions; a
repository conditionally writes the subscription cursor and organization plan in one D1 batch.
The database change token is captured before the provider read, so concurrent updates require a
complete retry with a fresh Polar snapshot. Duplicate deliveries preserve entitlement and retry
the idempotent object notification. Scheduled cancellations keep access until Polar reports the
subscription as canceled. An old subscription cannot downgrade its replacement, and a canceled
subscription is never restored. Conflicts return 500 so Polar retries the delivery. Different
replacement subscriptions created in the same millisecond need explicit reconciliation; no
automated reconciliation queue exists yet. Full storage quotas remain incomplete.

Configure the sandbox webhook endpoint with the Raw format and all `subscription.*` events. Local
delivery needs a public tunnel to the backend, for example
`cloudflared tunnel --url http://localhost:8787`.

## Deployment

The deployment workflow offers `partial` (the temporary default) and `ready` integration modes.
Both modes require the two signing secrets, Google and GitHub OAuth credentials,
origins and D1/DO bindings. Ready mode additionally requires complete storage and
Polar sandbox settings before serving requests. Email sign-in is disabled; Resend
and LiveKit are not prerequisites. Both modes validate signing secrets, HTTP
origins and all four OAuth settings. Billing always uses the Polar
sandbox because this is a test-billing showcase; live payments need separate authorization. Configuration errors list field
names without printing values. The billing migrations, including the Polar cutover reset, must be applied before webhook use.

The checked-in Worker configuration bootstraps new SQLite-backed Durable Object
classes. It does not transfer deployed PartyKit namespaces.
Within these SQLite-backed namespaces, awaited startup applies versioned table migrations
and imports existing structural, synchronization, authorization, presence and room-binding
KV records and Yjs snapshots once. This does not transfer data from another
namespace or from a legacy KV-backed Durable Object. Before a production cutover, inspect
the deployed namespace/class mappings, preserve or transfer their records, and verify the
Yjs document export/import. Existing SQL
migration statements are preserved; Drizzle metadata is upgraded and a new auth
migration is added.

Production `/api/*` paths on the web hostname must route to this Worker. Keep the
backend hostname available for existing PartySocket clients. Better Auth's public
base URL is `APP_DOMAIN`; register Google/GitHub callbacks under
`<APP_DOMAIN>/api/auth/callback/<provider>`. Configure the Worker
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
