# Backend review guide

Start with the execution path, then inspect ownership and persistence boundaries.

1. [Worker entry](../../apps/backend/src/server.ts) exports fetch and the five Durable Object classes.
2. [Application](../../apps/backend/src/application.ts) declares Hono middleware order and normal route mounts.
3. [Registration](../../apps/backend/src/container.ts) installs explicit backend registrations once. Follow the `di/register-*` modules for services, repositories, transport classes and technical integrations; `di/providers.ts` configures lazy factories and `di/adapters.ts` maps capability tokens.
4. [Runtime initialization](../../apps/backend/src/di/runtime.ts) creates one isolated instance cache per Worker environment or object activation. Durable Object startup restores persisted records before constructing routes. The servers hold ready instances, never containers.
5. [API routes](../../apps/backend/src/routes/api.ts) receive handler instances in constructors. Handler methods are bound once; request callbacks do not resolve dependencies.
6. [Account handler](../../apps/backend/src/handlers/api/account.ts) demonstrates handler → service → repository constructor injection. Handlers never import repository classes. Core services perform persistence internally.
7. [Object handlers](../../apps/backend/src/handlers/workspace/handlers.ts) coordinate services and cross-object gateways. Core services have no HTTP, request context or gateway dependencies.
8. [Authorization](../../packages/auth/src/authorization/service.ts) accepts identity explicitly per operation. Role policies and permission evaluation belong to auth; core repository classes persist the policy records.

## Lifetimes and ownership

`@injectable()` records constructor metadata without registering the class.
Every managed class and its `ContainerScoped` lifetime is registered explicitly in
backend DI modules. `@inject` supplies explicit tokens because Workers bundling
does not emit constructor type metadata. TSyringe constructs dependencies lazily.
Repeated resolution within one runtime returns the same registered instance;
separate objects receive separate state-bound instances. There are no per-request
containers, handler maps, global state-bound service singletons, or request headers,
principals and mutation revisions registered as dependencies.

Cloudflare constructs Durable Object classes. Their startup functions therefore
call the DI initialization boundary once to receive ready routes and lifecycle
dependencies. Startup restoration uses record repositories inside that boundary, before
services can observe object state; request handlers use services only.

Core features contain `services/`, `repositories/` and pure `mutations/` as needed.
Infrastructure owns technical clients and primitives, with database configuration
under `packages/infra/database/`. Domain owns DTOs, schemas and declarative types.
The web reuses pure optimistic transformations, not backend services or repositories.
Better Auth configuration, tokens, membership APIs and custom authorization are in
auth. Generic email delivery is an infrastructure integration.

## Frontend contract

[types/api-types.ts](../../apps/backend/src/types/api-types.ts) selects the actual
Hono HTTP schema without its Worker environment. `build:api` generates a portable
`dist/api-types.d.ts` containing Hono types and the resolved wire contract only.
`backend/api` exposes this file through a types-only package export. The web
[client](../../apps/web/src/client/api.ts) imports that type and constructs `hc`.

Routes and handlers remain constructor-injected classes. Static route definitions
retain Hono's returned schema types, and handler JSON responses preserve their
body/status types. JSON validators connect shared schemas to Hono input inference.
Forwarded authorization and token endpoints derive their contracts from their
owning object routes; those proxy assertions are deliberate transport boundaries.

The isolated consumer configuration under `apps/backend/tests/types/client` has no
Worker globals or backend source files. Positive and negative frontend checks
verify methods, paths, required parameters, request bodies, permissions and response
DTOs. Dependency declaration checking retains the repository's `skipLibCheck` setting.
Browser bundle verification includes the actual typed frontend client.

## Verification

- Backend unit/integration tests cover DI reuse and isolation, concurrent identities,
  constructor-injected handlers, SDK disposal, authorization, sync dispatch, validation,
  object persistence, membership synchronization, application errors and provider boundaries.
- Core tests cover pure mutations, identifiers, profiles and input contracts. Auth tests
  cover access rules. The package test configurations discover these suites directly.
- Typechecks cover backend, core, auth, infrastructure, domain, environment and web.
- `node scripts/check-boundaries.mjs` checks package exports, dependency declarations,
  handler/repository separation, infrastructure/core direction and browser imports.
- `pnpm --filter backend test:foundation` checks production bundling, actual browser
  mutator bundles, local D1 migrations and SQLite-backed object persistence.
- `pnpm --filter backend test:runtime` exercises the production Worker and object
  routes with local D1, Better Auth and mocked provider network boundaries.

## Known limits for behavior review

- The role/permission rollout is complete for the documented room slice. Page,
  thread and legacy file/group paths still have compatibility authorization.
- Durable Object storage uses KV records on SQLite-backed objects. Relational SQL
  tables and deployed namespace/data migration remain separate work.
- D1 organization writes and object synchronization cannot share one transaction.
  Handlers coordinate them and some operations reconcile idempotently; durable
  recovery for every partial failure still needs a reconciliation/queue design.
- Existing sync batch semantics can persist earlier mutation effects before a later
  failure leaves acknowledgements unchanged. A request is not an automatic rollback
  transaction over arbitrary asynchronous operations. Failure tests document this.
- TypeScript checks constructor arguments and Hono context contracts, but cannot
  prove that a string token is registered in the correct object runtime or that
  middleware executes in the intended order. Runtime wiring tests cover these paths.

No deployment or remote database changes are part of this refactor.
