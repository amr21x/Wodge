# Relational object persistence verification

[Persistence boundaries](../architecture/data-model.md) · [Backend review guide](backend-review-handoff.md)

Checked locally on 2026-10-20 against base commit
`66ddd1daae69a1bd5a030393ada1443ca026d242` plus the working-tree changes described here.
Code/test/migration fingerprint: `1531b65a7e1f8f4ab861a50c07463c679726609f1a6cc6577b757d3681441108`.

The fingerprint is SHA-256 over sorted changed/new `.ts`, `.tsx`, `.mjs`, `.json` and `.sql` files
under `apps/` and `packages/`, concatenating relative path, NUL, file bytes, NUL; deleted paths use `<deleted>` as their content.
Documentation is excluded so this evidence can record the fingerprint without
self-reference. No commit, push, remote migration or deployment was performed.

## Results

- **Pass:** backend unit/integration suite (195 tests). Covers schema creation,
  append-only schema upgrades, repeated startup, rejection of newer schema versions,
  legacy SQL table adoption, retry after a failed import, row diffs, empty collections,
  legacy orphan task references,
  ordering, poll options/counts/voters, comments, assignees and projection resets.
- **Pass:** `pnpm --filter backend test:runtime`. The production entry runs with real
  local D1/SQLite Durable Objects in Miniflare. Structural records and Replicache
  acknowledgements survive object restart; retried pushes do not duplicate entities.
  User navigation and workspace membership projections survive the same restart.
- **Pass:** runtime Yjs collaboration exchanges actual binary updates between two
  WebSocket clients. Forged viewer updates are absent from restored state; an open
  viewer gains edit access and later loses it; revoked viewers disconnect and cannot
  reconnect. A fresh edit survives restart without waiting for the save debounce.
  Continuous edits cross the compaction threshold and restore correctly. Repository
  tests verify one-time legacy snapshot import, atomic append/compaction failure
  recovery, and retention of newer updates during compaction. Inserting/removing
  task-view nodes leaves the page-owned task collection unchanged.
- **Pass:** `pnpm --filter backend test:foundation`. Retained browser boundaries,
  production/fixture bundles, local D1 migrations and all object feature fixtures pass.
  The core bundle permits the Drizzle connection, migrations and generic SQL primitive
  while excluding providers/hosts.
- **Pass:** `pnpm --filter backend test:api`; the types-only contract retains
  32 route paths and its isolated consumer compiles.
- **Pass:** backend, web, core, auth, infrastructure and domain TypeScript checks.
- **Pass:** core tests (45), auth tests (2) and web tests (22), including page session
  reuse/cleanup and React Strict Mode effect replay.
- **Pass:** `pnpm --filter backend build` generates the API contract and completes
  Wrangler's dry-run bundle with all five Durable Object bindings.
- **Pass:** object migration generation reports no schema drift; bundled SQL matches
  the generated journals. Object migrations remain separate from D1.
- **Pass:** `pnpm lint` (warnings denied), `pnpm format:check`, ownership/import
  boundary check, changed documentation links and whitespace checks.

The environment uses Node 24.19.0. Existing installed dependencies were reused;
this was not a fresh installation check. The default pnpm launcher could not open
its version-management database, so commands used the available pnpm 9.4.0 JavaScript
entry through a temporary launcher. Miniflare needed localhost access outside the
restricted sandbox. Its email/storage/billing providers are network-boundary fixtures.
Expected negative-path auth/billing logs do not represent test failures.

## Limits

- **Unverified:** deployed PartyKit namespace transfer and production data cutover.
  Local table migrations operate within existing SQLite-backed objects and do not
  convert another namespace's storage backend.
- **Unverified:** full browser rich-text/table/Kanban interaction and hosted provider
  journeys. WebSocket collaboration, view-node removal, browser session lifecycle and
  retained optimistic page commands are exercised; this is not a full browser smoke run.
- **Retained limitation:** sync batches do not gain request-wide or distributed rollback.
  Native local SQL transactions protect related row writes; D1, object gateways and
  final sync acknowledgements retain their existing coordination semantics.
- Legacy structural, sync, authorization, presence, room binding and Yjs snapshot KV records are retained, not dual-written. SQL becomes
  authoritative after import. Duplicate entity IDs fail import rather than silently
  dropping records; repair requires an explicit data decision. Reverting to the old
  KV-only code would read stale data and needs a reviewed recovery procedure.
- Existing unbound rooms with records still require explicit ownership reconciliation;
  migration does not let a caller claim another room's data. Calls/generation remain
  disabled and no discussion domain redesign is included.

Yjs stores only the current state: one SQLite snapshot plus uncompacted updates.
Compaction replaces the snapshot and removes covered journal rows; no version history
is retained. Sync metadata, policies and invalidations, presence and room bindings all
use relational SQLite tables. Migration markers prevent stale KV values from being
re-imported. Web owns optimistic transformations and has no core dependency; backend
services use targeted relational queries and writes.

Regression checks cover commands reading SQL despite stale sync projections, preserving
unrelated rows, and publishing projections only after commit. Imported sync records
restore without KV reads or writes. Policy and invalidation writes roll back together.

## Access group removal

- **Pass:** current workspace/channel schemas, server and optimistic commands, settings
  routes, selectors and feature registry expose no access groups.
- **Pass:** upgrades from SQL and KV preserve legacy access as scoped user/team role
  assignments and remove all three group tables. Completed imports never replay.
- **Pass:** upgrading an existing policy preserves custom roles and revoked room grants.
- **Pass:** runtime page role changes affect open Yjs connections. A thread reader can
  synchronize but cannot write; granting update access enables the same direct object
  mutation. Page assignee candidates come from backend authorization.

- **Pass:** demoting a bootstrapped or migrated team moderator removes system moderator
  assignments and publishes policy invalidations. Stale assignments cannot grant page
  updates or team management after structural demotion, including when policy persistence
  fails. Retrying completes cleanup; custom grants and other teams remain intact.

Historical SQL and migration-only readers retain legacy field/table names solely to
upgrade existing data. Replicache client groups and UI command grouping are unrelated.
