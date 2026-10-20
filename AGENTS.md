# Code rules

## Working agreement

- Do not include issue IDs in authored content.
- Confirm the task understanding before planning; and give also confirm the implementation plan before applying it.
- Preserve approved behavior and architecture. Discuss material changes before implementing them.
- **Reuse first:** search for existing services, schemas, queries, helpers and library APIs before adding code. Extend suitable implementations instead of creating parallel solutions.
- **DRY:** keep each business rule, validation rule and integration in one authoritative place. Extract genuinely shared logic; do not couple unrelated features merely because their code looks similar.
- **SOLID:** keep responsibilities focused, dependencies explicit and interfaces small. Extend behavior through clear boundaries and preserve existing contracts. Use constructor injection for replaceable dependencies; avoid inheritance or abstractions without a concrete need.
- Prefer the simplest cohesive implementation. No unnecessary wrappers, duplicate layers or empty folders.

## Ownership

Backend flow: **route → handler → core service → repository → persistence**.

- **Backend:** routes declare endpoints; class handlers validate, authorize and coordinate services, integrations and gateways. Handlers never query databases or use repositories directly.
- **Core:** business services, pure mutations and data-access repositories, grouped by feature. Services know nothing about HTTP, Hono, PartyServer or gateways. Repositories contain queries/persistence only, with database/storage injected once. Use `Repository` consistently, not `Queries`.
- **Domain:** declarative models, DTOs, schemas and error contracts, including auth/database schemas. No business operations, mutations or authorization implementation; shared identifier helpers are an approved exception.
- **Auth:** Better Auth configuration, identity, sessions, tickets and permissions. D1 owns canonical users, organizations and memberships; workspace internals and resource policies live in its Durable Object.
- **Infrastructure:** technical clients, storage primitives and provider adapters; no business logic or feature queries. Database configuration/tooling belongs under `packages/infra/database/`.
- **Web:** UI, API clients and browser-safe optimistic mutations. No backend logic, database access or provider secrets.
- Keep types with their owner; do not redefine technical interfaces in core. Infrastructure must not depend on core, and domain must not depend on application/runtime packages.

## DI and transport

- Use TSyringe constructor injection with `@injectable()` and explicit `@inject` tokens. Register providers and lifetimes centrally in backend `container.ts`/`di/`; no package self-registration.
- Reuse one instance graph per Worker environment or Durable Object activation. Never rebuild it per request/alarm or share object-bound state across objects.
- Resolve dependencies only at runtime initialization. Routes and servers receive ready instances: no service callers, composition wrappers, `defineHandlers` or per-route container resolution.
- Pass identity, headers and revisions as operation arguments; never register or retain request-specific values in reusable instances.
- Keep server adapters thin. Cross-object calls use gateways and the shared HTTP client; Replicache bookkeeping stays in `lib/sync/`. Native Hono middleware can remain functions.
- Provider packages configure their clients from the typed environment; DI registration must not duplicate their configuration.

## Contracts and correctness

- Compose request validators from domain schemas; validate relevant body/path/query/header inputs once. Handlers provide authorized, validated input; services enforce business invariants.
- Enforce permissions on backend and direct object/realtime entry points. Coordinate organization synchronization in handlers, not lifecycle hooks. Never trust caller-supplied identity headers.
- Preserve Hono route inference and the generated types-only `backend/api` contract. Return typed DTOs; use existing global error handling. Avoid `any` and casts that conceal broken contracts.
- Services persist through repositories; no manual handler save/commit step. Preserve restoration, sync acknowledgements and Yjs persistence. Durable Objects do not make arbitrary awaits, D1 writes or cross-object calls one rollback transaction.
- Use UUIDv7 for new entity IDs, retain existing IDs, and reserve Nano ID for short URL-safe identifiers and public asset keys.

## Readability and verification

- Use direct `@wodge` imports. No barrels, forwarding-only re-exports, browser stubs or dependency bags. Required Worker object exports and the generated API entry are exceptions.
- Keep routes explicit and readable; avoid long fluent chains without losing Hono types. Format changed files and comment non-obvious intent/constraints.
- Never expose secrets. Document environment settings and their purpose in `.dev.vars.example`. Missing optional providers must fail clearly, never fake success or bypass authentication.
- Code quality checks and formatting are required validation. Run `pnpm lint` and `pnpm format:check` from the repository root; use `pnpm format` to apply formatting and resolve lint findings before finishing.
- Run affected type checks and meaningful tests. Use `backend test:runtime`/`test:foundation` for runtime changes, `backend test:api` for API contracts, and `node scripts/check-boundaries.mjs` for ownership/import changes. Commands are run through `pnpm --filter <package>` as appropriate.
- Report what changed, checks actually run and remaining limitations. Documentation-only edits need formatting/link/whitespace checks, not application tests.

See the [backend review guide](docs/development/backend-review-handoff.md) and [backend README](apps/backend/README.md) for detailed wiring, commands and current limitations.
