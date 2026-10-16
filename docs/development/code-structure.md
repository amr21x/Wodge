# Code structure and package boundaries

[Docs home](../README.md) · [Develop Wodge](README.md)

The current scope retains separate web and backend applications in the existing
pnpm/Turborepo monorepo. The web application remains Next.js; broader framework
and UI migration is deferred. See the [current project scope](documentation.md).

## Package responsibilities

- `apps/web`: retained Next.js routes, UI, browser state, editor/task views, and
  web-specific request adapters.
- `apps/backend`: realtime services and authoritative backend operations. Production
  routing remains PartyKit until the separately scoped PartyServer migration.
- `packages/domain` (`@wodge/domain`): extracted page/task contracts, schemas and
  pure mutations, plus shared channel definitions and constants. Its finite public
  entries are `/pages`, `/channels` and `/constants`; there is no root barrel or
  public source-path wildcard. It has no browser, environment or persistence imports.
- `apps/web/src/client/sync/pages`: page Replicache construction and transaction
  adapters. Both these adapters and backend page handlers call the same domain
  mutations. Browser factories are no longer exported from the data package for pages.
- `packages/data` (`@wodge/data`): transitional home for the remaining domain
  features, keys, browser adapters and binding-based server persistence. Page/task
  definitions and algorithms have moved; there are no compatibility re-exports for them.
- `packages/backend-protocol`: isolated Better Auth/MCP adapters with Zod 4, without
  changing retained Zod 3 domain validation.
- `packages/env`: existing application configuration and a separate public-only
  browser configuration entry point.
- `config/ts` and `config/workers`: shared TypeScript settings and isolated Worker
  build tooling respectively.

## Implemented foundation boundary

`@wodge/data` retains the remaining shared entry point, `@wodge/data/browser` exposes
the remaining browser helpers and constructors, and `@wodge/data/server` accepts
explicit D1 bindings. Browser
bundles reject the server/database/protocol entry points. Web request context stays
inside `apps/web/src/lib/data-server.ts`; backend factories receive `DB` explicitly.

Persistence operations do not grant authorization. HTTP/sync/MCP callers must enforce
actor and resource permissions. The existing backend permission checks are preserved.
Replicache remains the structured local-first system and Yjs owns collaborative text.

The [foundation evidence](backend-foundation.md) records the checked implementation
and limitations, including remaining production backend-to-web API calls. It does
not claim all product operations have migrated to the separate backend.

## Agreed restructuring direction

The starting point is the current fix state, not an assumed completed foundation.
Workspace packages use the `@wodge` scope. Existing Next.js and PartyKit hosts
remain while responsibilities are extracted in reviewable slices.

- `@wodge/domain`: feature contracts, data definitions and shared pure behavior.
  Persistence schemas may use Drizzle, but browser-safe exports must not reach
  server schemas, clients or initialization.
- `@wodge/core`: authoritative feature operations, authorization, concrete
  feature-owned queries and orchestration. Core receives dependencies explicitly;
  Next.js request contexts and PartyKit instances do not become service dependencies.
- Focused integration packages such as `@wodge/auth`, `@wodge/payments`,
  `@wodge/email` and `@wodge/storage` own provider interactions. Product policy
  belongs to core. No umbrella infrastructure package is required.
- Application hosts own transports, lifecycle, configuration and composition.
  Both existing server hosts may invoke core during extraction. Web owns UI and
  browser integration. A DI container is not selected by this structure.

Only populated boundaries are introduced. Core extraction, the remaining domain
features, provider packages and broader web feature organization are still pending;
the page slice does not claim their implementation. Runtime/auth migrations stay
separate from the restructuring.

## Page/task slice checkpoint

Implemented from source revision `63426ac8ac4f08a055eac1bee774a79f98ee5b18`,
with local validation on 2026-10-16. Schema defaults, mutation names and arguments,
storage keys, version updates and permission checks are preserved. The shared
readonly type is structural and does not require Replicache in domain.

Runnable checks with the pinned pnpm launcher:

```sh
pnpm check:boundaries
pnpm --filter @wodge/domain typecheck
pnpm --filter backend test:pages
pnpm --filter backend test:foundation
pnpm exec tsc -p apps/backend/tsconfig.json --incremental false --pretty false
pnpm exec tsc -p packages/backend-protocol/tsconfig.json --incremental false --pretty false
```

The new boundary check verifies declared workspace imports, public exports, domain
runtime dependencies and production imports that bypass another workspace's API.
The bundle checks additionally prove the page domain does not reach app, database,
environment or sync-client code and reject private domain imports. These checks
cover the extracted boundary; they do not assert complete separation of transitional
features in `@wodge/data`.

The page integration suite uses real Replicache transactions with an emulated
IndexedDB and an in-memory backend storage fixture. It checks creation, editing,
cascading column deletion, missing-column behavior, persisted versions and storage
failure propagation. It does not establish network sync, authorization ingress,
restart durability or multi-client/Yjs acceptance. The separate foundation suite
checks real local Worker/D1 bindings and all existing backend entry bundles.

All commands above passed using Node 24.19.0 and an existing dependency snapshot;
this is not a clean-install claim. Frozen offline lockfile validation passed with
pnpm 9.4.0; third-party package resolutions did not change. The default pnpm launcher
still fails locally, so validation invoked the pinned JavaScript launcher directly.
Worker/D1 execution required loopback access outside the restricted sandbox.

Full web and data type checks retain exactly their pre-slice diagnostic signatures
(36 web and 16 data diagnostics in this dependency snapshot). These include missing
premium editor packages, dependency drift and stale tests/movement types. Full app
startup, UI journeys and end-to-end collaboration remain unverified. Historical
baseline and foundation records describe their own revisions and dependency names.
