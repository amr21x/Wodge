# Code structure and purpose

[Docs home](../README.md) · [Backend review path](backend-review-handoff.md)

The application runs as a Hono Worker and five PartyServer Durable Objects.
Packages use the `@wodge` scope and expose their owning modules directly.

```text
apps/backend/src/
  server.ts                     Worker fetch export and Durable Object class exports
  application.ts                Hono middleware order, auth, webhooks and API mounts
  container.ts                  one backend registration entrypoint
  di/
    register-services.ts        core/auth classes and their lifetimes
    register-repositories.ts         persistence repository classes and their lifetimes
    register-transport.ts       routes, handlers, gateways and sync adapters
    register-providers.ts       technical integration classes
    providers.ts                lazy database and Better Auth factories
    adapters.ts                 capability tokens mapped to implementations
    runtime.ts                  Worker cache and awaited object initialization
  servers/                      Cloudflare lifecycle adapters; no containers
  routes/                       method/path definitions; injected handler instances
  handlers/                     validation, authorization and coordination
  middleware/                   native Hono middleware factories
  validators/                   transport schemas composed from domain schemas
  gateways/                     calls to other objects through the HTTP client
  lib/
    sync/                       dispatch, acknowledgements, patches and validation
    authorization/              invalidation delivery and retry coordination
    helpers/                    request parsing and identity helpers
  errors/                       global HTTP error mapping
  types/                        Worker bindings, Hono contexts and request actors

packages/core/src/
  <feature>/
    services/                   business operations and persistence coordination
    repositories/                    pure database/object data access
    mutations/                  pure transformations, including optimistic reuse
    errors.ts                   application error factories where needed
  errors.ts                     application error class

packages/domain/src/
  <feature>/
    models.ts                   declarative business and stored record shapes
    dto.ts                      operation inputs and response types
    validation.ts               shared schemas
    errors.ts                   error code types where needed
  auth/schema/                  canonical identity and organization table schemas
  sync/                         shared record/protocol definitions and keys
  identifiers.ts                UUIDv7 defaults and legacy identifier validation

packages/auth/src/
  server.ts                     Better Auth configuration
  client.ts                     browser auth client
  membership.ts                 identity and organization membership operations
  tickets.ts                    session-bound connection tickets
  tokens.ts                     signing and verification
  authorization/                workspace policies, roles, grants and evaluation

packages/infra/
  database/                     Drizzle configuration
  src/
    database/                   database construction and types
    durable-objects/            technical record storage and alarm contracts
    http/                       general HTTP client; supports object stub transport
    email/                      generic delivery integration
    storage/                    object storage SDK
    payments/                   payment SDK
    calls/                      call token SDK
```

Not every feature needs every file. Avoid empty modules, barrel files, re-export
wrappers and generic dependency bags.

## Dependency flow

Routes receive handlers; handlers receive services and transport integrations;
services receive repositories; repositories receive configured database/storage instances.
Handlers do not import repositories. Services do not call HTTP endpoints or Durable
Object gateways. Infrastructure contains no feature repositories or business policies.
Auth owns permission evaluation, while core repository modules persist policy records.
Domain schemas may execute validation and identifier defaults; feature mutation
implementations and access evaluation live in core and auth respectively.

Cross-object workflows are coordinated in backend handlers. A gateway selects a
Durable Object namespace/stub and sends a request through `HttpClient`. The
`https://internal` hostname is synthetic; the stub selects the destination.
`/parties/:namespace/:id/*` remains the PartyServer routing convention.

## Injection and runtime lifetimes

All registrations live in the backend. `container.ts` calls the focused `di/`
registration modules once. Classes use `@injectable()` and explicit constructor
`@inject` tokens, without registering themselves. Registrations choose
`ContainerScoped`; factories cache their result within the owning runtime.

The Worker caches one application graph per environment object. Each Durable
Object activation initializes one graph during awaited `onStart`. The DI startup
boundary restores persisted records and supplies ready instances to the server.
There are no per-request or per-alarm containers, and request callbacks do not
resolve handlers. Identity, request headers and mutation revisions are explicit
operation arguments or Hono context values.

Cloudflare controls Durable Object construction, so its server classes cannot be
constructed directly by TSyringe. This is why the single startup boundary exists.
The required Worker class exports are runtime registration, not package barrels.

## Identity, authorization and persistence

Better Auth owns canonical D1 users, sessions, organizations and memberships.
Workspace internals and resource authorization policies belong to the workspace
Durable Object. Backend handlers coordinate identity writes and projection updates;
public Better Auth mutations that bypass this coordination are restricted.

Objects are SQLite-backed but currently persist KV records. Native Durable Object
storage gates protect local storage operations; they do not create a transaction
spanning D1, another object or an arbitrary asynchronous request. Full relational
SQL migration and durable cross-store reconciliation remain follow-up work.

Web contains presentation, browser authentication and optimistic sync adapters.
It can reuse core pure mutation modules, but cannot import core services, repositories,
DI, database clients or provider integrations. Browser bundling checks enforce this.
