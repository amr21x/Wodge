# Persistence boundaries

[Docs home](../README.md) · [Architecture](README.md)

D1 owns canonical users, organizations, memberships, invitations and billing state.
Its declarative schemas and SQL migrations live in `packages/domain`; database
configuration/tooling lives in `packages/infra/database`. Backend handlers coordinate
D1 identity changes with the workspace/user projections. These stores do not share
a transaction.

Each of the five PartyServer object kinds owns a private SQLite database. Structural
entities use relational tables accessed through Drizzle’s Durable SQLite driver. The
`objectDatabase` connection is cached per activation and separate from D1’s `database`
connection. Feature repositories in core own queries; domain `schema/object.ts` modules
declare tables. Infrastructure supplies the connection, migration runner and generic row
reconciliation primitive. Sync projections and public DTOs retain their existing aggregate shapes.

- User objects persist ordered workspace references in `user_workspaces`.
- Workspace objects persist membership projections, teams, folders and channels,
  with separate rows for team members/moderators. Channel kind, team, folder and position preserve navigation placement.
- Room objects persist ordered messages, poll options, vote counts and voters.
- Thread objects persist ordered posts and comments, with the same relational poll
  representation as rooms.
- Page objects persist ordered columns/tasks and task assignees. A task belongs to
  the page's collection and references a column; table/Kanban views and editor nodes
  do not own separate task collections. Column relationships are indexed; backend
  services own column validation and task deletion, so legacy orphan references remain readable.

Entity IDs are retained. Position columns preserve existing array order rather than
inferring it from timestamps or IDs. Optional fields and collection revisions/deletion
flags survive hydration. Services read and write individual entities through relational repositories.
Bulk reconciliation is reserved for legacy imports and lifecycle replacement. Related local SQL writes use Drizzle transactions backed by native
`transactionSync`; no distributed transaction or request-wide rollback is implied.

Replicache client/group acknowledgements and revision maps, presence, authorization
policies/outbox records and room ownership bindings use explicit relational tables.
`sync_clients`, `sync_client_groups` and `sync_versions` store synchronization state.
Workspace `authorization_*` tables store policy roles, permissions, assignments and the
invalidation outbox; `workspace_presence` stores presence. `room_scope` binds a room
to its workspace/team. Legacy KV values are imported once, with SQL markers preventing stale re-imports. The public
Replicache patch/envelope format is unchanged. A later failure in a sync batch can still
leave earlier application effects persisted without the final acknowledgements, as in
the retained contract; moving structural records to SQL does not change that policy.

Yjs is separate from task persistence and stores its binary CRDT representation in
SQLite through the same object Drizzle connection. `page_document` holds one snapshot
and journal positions; `page_document_updates` holds subsequent incremental updates.
Each update is appended synchronously before its message callback completes. Startup
replays the snapshot and remaining journal. The YServer save debounce compacts into a
replacement snapshot; 64 updates or 256 KiB also trigger compaction during continuous
editing. Snapshot replacement and deletion of covered updates share one transaction.
Only current-state recovery is supported; compacted updates and older snapshots are
not retained as version history. A legacy `yjs:snapshot` KV value is imported once.

Read-only checks refresh current page capabilities for incoming messages. Outgoing
updates require durable persistence and current view access; revoked viewers are
disconnected. Browser providers, IndexedDB persistence and Y.Doc instances are created
and disposed with the mounted page session.

## Object schema lifecycle

Wrangler `new_sqlite_classes` declares object classes/namespaces. It does not create or
upgrade application tables. The official Drizzle Durable SQLite migrator applies the
owning object's ordered migrations during awaited startup and records them in
`__drizzle_migrations`. Each object kind has its own migration directory under
`packages/infra/database/objects/`; D1 keeps its existing configuration and migration
stream. Newer schema versions are rejected. The initial baseline adopts tables from
the previous SQL implementation without deleting records.

After editing domain object schemas, run `pnpm --filter @wodge/infra db:generate:objects`
to generate SQL, metadata and bundled migrations. Review and commit all generated files;
append new migrations rather than editing applied ones. Run
`pnpm --filter @wodge/infra db:check:objects` to detect stale bundles. Startup applies
pending migrations per object; no remote D1 migration command is used for these tables.

On the first structural load, repositories import the old KV aggregate into entity rows,
preserving IDs, ordering and record revisions. The SQL record metadata marks a completed
import; user objects have a dedicated import marker because their workspace set has no
record envelope. Failed imports can be retried. Once imported, SQL is authoritative,
including for empty/deleted collections. Old structural KV keys are retained as legacy
source records and are never dual-written or reimported over newer SQL state. Empty new
rooms use a room-scope import marker and do not acquire a persisted message record until
a write, preserving the existing room ownership-binding guard.

This is an in-place import within an already SQLite-backed object. It does not convert a
legacy KV-backed namespace or copy deployed PartyKit namespaces/Yjs snapshots. Production
namespace transfer remains a separate cutover requiring deployment-specific inspection.
After SQL writes begin, deploying the old KV-only application would read stale structural
records; rollback needs a reviewed data recovery/forward-fix procedure.

[Verification evidence](../development/relational-object-persistence.md) records the
checked source and local results. No remote migration or deployment is implied.

## Retiring access groups

Workspace access groups and channel view/edit lists are removed from current schemas,
commands, optimistic mutations and settings. Teams and custom scoped roles now govern
room, page and thread access. Browser permission checks query the backend policy;
page collaboration refreshes that policy for incoming messages and outgoing updates.

The workspace upgrade resolves legacy access lists into temporary user/team permission
projections before dropping `workspace_groups`, `workspace_group_members` and
`workspace_channel_groups`. Legacy KV structures use a migration-only reader with the
same projection format. Authorization imports the projections once, persists the new
policy revision, then clears them. Existing custom room roles and revoked room grants
are preserved. Old migration files necessarily retain the removed table definitions;
they are historical upgrade inputs, not active schemas. Replicache client groups are
unrelated sync records and remain supported.
