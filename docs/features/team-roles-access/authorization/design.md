# Workspace authorization assessment

[Team access](../README.md) · [Existing scope](../spec.md)

Status: the first room-authorization slice is implemented locally. The broader
resource rollout remains a draft. The source was updated on 2026-10-17; no remote
migration, deployment or production cutover has been performed.

## Implemented first slice

- Typed domain permission catalogue, role/assignment schemas, scopes and errors.
- WorkspaceAuthorization in auth exposes role creation/update/deletion,
  assignment/removal, hasPermission, requirePermission and an internal grant
  resolver. Each operation receives the verified caller as an argument.
- AuthorizationRepository persists normalized roles, permissions, assignments and
  pending invalidation events with revision checks in one local Drizzle SQL transaction.
- The Better Auth organization is the canonical workspace identity in D1. Its ID
  is also the workspace DO name. There is no separate workspace table, membership
  table or organization-to-workspace mapping. Profile fields and metadata are
  managed through Better Auth; billing fields are server-managed organization
  extensions. DO state contains internal resources, teams, scoped policies and
  a membership projection used by retained collaboration features.
- Native organization endpoints are available. Organization hooks synchronize
  creation, profile updates, membership additions/removals, invitation acceptance,
  role changes and deletion with the workspace DO. The installed Better Auth leave
  endpoint skips member hooks, so an explicit after hook covers that operation.
  Active organization selection stays in Better Auth and does not alter DO state.
  The workspace adapter serializes complete projection refreshes with the native
  DO concurrency gate. Projection cleanup never writes authoritative membership
  back to D1.
- Existing application workspace endpoints delegate identity writes to Better
  Auth. Membership and organization role changes no longer run as Replicache
  mutations. The members settings screen uses the Better Auth role API.
  Superseded DO create/join/leave/update/delete and membership/admin-query routes,
  local join/leave implementations, validators and write schemas have been removed.
  Explicit rejection of retired sync commands remains for older clients.
- New workspaces bind each room to its workspace/team before use. New room
  creation claims that binding before saving the workspace structure. A binding
  cannot be reassigned to another workspace/team. Populated legacy rooms without
  a binding fail closed and require an explicit ownership migration; startup does
  not guess ownership from client-provided routing data.
- Room HTTP/Replicache requests authenticate at the Worker and enforce access at
  the room object. The Worker no longer makes the legacy workspace permission
  call for those room requests. Room grants are cached per user/session, bounded
  to 256 entries per object, coalesce refreshes, expire within 30 seconds and are
  invalidated by newer policy revisions. Fresh membership/session validation
  bounds the expiry; no separate positive-membership cache is implemented yet.
- Role mutations directly invalidate room grants after the local policy/outbox
  commit. Failed invalidations remain pending and a workspace alarm retries them.
  No queue has been added. Incoming stale refresh results are rejected.
- Member removal through native Better Auth and application management endpoints
  refreshes the local projection, removes team/moderator/group references and
  revokes explicit user assignments. A later rejoin does not restore them.
  Workspace request admission checks authoritative D1 membership; a stale positive
  local projection cannot admit a removed member. Owner/admin changes reconcile
  the corresponding workspace system-role assignments and invalidate room grants.
- Room message actions use explicit granted permissions, including ownership
  checks in domain operations. A permission-denied push is rejected before any
  command or acknowledgement is processed. This intentionally uses whole-batch
  admission for now; persisted per-command rejection results/client reconciliation
  remain future sync work. Known non-authorization storage failure behavior is
  retained by the current sync adapter.

The one-time policy bootstrap imports existing owner/admin/team-moderator and
room group grants into system roles and scoped assignments. Later custom role
operations do not modify group lists. Existing team membership/room scope still
comes from the workspace's retained structure; the complete team/group model
replacement and its client UI are not implemented. Legacy role/group edits are
not a second management API for the bootstrapped room policy.

The first slice covers room access, message operations and room-call admission.
Page/thread/file authorization and live Yjs connection revocation retain their
previous implementation. Page/thread permissions may be represented in role
definitions but are not yet the enforcement source for those resources.

### API and rollout requirements

Workspace-scoped routes are forwarded to the workspace object:

- GET/POST /api/workspaces/:workspaceId/authorization/roles
- PATCH/DELETE /api/workspaces/:workspaceId/authorization/roles/:roleId
- POST /api/workspaces/:workspaceId/authorization/assignments
- DELETE /api/workspaces/:workspaceId/authorization/assignments/:assignmentId
- POST /api/workspaces/:workspaceId/authorization/check

Apply D1 migrations through `0005_canonical_organizations.sql` before using this
code. The consolidation migration preserves existing workspace/DO IDs, remaps
organization member/invitation/session references, preserves public join links
and billing flags, and removes the duplicate identity/membership tables. It
refuses to proceed if any legacy workspace or membership has not been explicitly
adopted into Better Auth. It never links identities by email or discards an
unadopted workspace. Run migrations through the normal D1 migration runner so
failed batches roll back. Populated legacy room objects still need a trusted
room-scope backfill; this work does not infer their owner from incoming requests.
Fresh databases use organization IDs directly from creation.
All application Durable Object persistence uses Drizzle SQLite, including authorization.
One-time imports retain legacy records without dual writes; deployed namespace transfer
remains separate work.

Outstanding work includes other resource enforcement, existing-state adoption,
team/group UI/data conversion, immediate session/membership invalidation across
all external mutation paths, queue integration if selected, per-command rejection
reconciliation and the final production revocation guarantee. D1 and workspace
writes do not share a transaction. Local policy atomicity relies on native
Durable Object storage guarantees; no generic transaction framework was added.

Organization hooks synchronously request projection refreshes. They do not make
D1 and the DO atomic: a hook/network failure can leave a committed D1 change with
an incomplete DO projection. The API reports the failure; a later successful
organization mutation refreshes the full snapshot, while existing room grants
expire within 30 seconds and local invalidation failures use the existing outbox.
A durable D1-to-DO lifecycle outbox/reconciliation worker remains outstanding.
Native email invitations can be created and accepted through Better Auth; email
invitation delivery and a dedicated acceptance UI are not implemented here.

## Verification evidence

The first slice has automated coverage in:

- `apps/backend/tests/unit/authorization.test.ts`: scope inheritance, role union,
  membership enforcement, privilege-escalation prevention, system-role protection,
  assignment lifecycle, revision conflicts, persisted policy/outbox, actual message
  ownership and removal/rejoin behavior.
- `apps/backend/tests/unit/authorization-grants.test.ts`: refresh coalescing,
  user/session isolation, lease expiry, failed refresh, stale in-flight grants,
  immutable room binding, legacy-room ownership protection and durable invalidation
  retries.
- `apps/backend/tests/runtime/authorization.mjs`: real Better Auth/D1 membership,
  two workspace objects, scoped role API, forged role/scope/sender rejection,
  authorized message pushes, immediate warm-grant invalidation, unchanged denied
  mutation acknowledgement, membership removal/rejoin, concurrent role edits and
  canonical workspace profile updates.
- `apps/backend/tests/runtime/organizations.mjs`: native profile/metadata and
  active organization operations, invitation acceptance, owner/admin projection
  changes, demotion, leave, deletion, warm room-grant revocation and protected
  server-managed fields.
- `apps/backend/tests/runtime/organization-migration.mjs`: populated migration,
  explicit-adoption guard refusal without data loss, retained IDs/references,
  billing settings and foreign-key integrity.
- `apps/backend/tests/integration/feature-services.test.ts`: idempotent projection
  refresh preserves resource IDs, updates roles and removes departed users.
- `apps/backend/tests/integration/router-errors.test.ts`: D1 membership takes
  precedence over a stale local projection.

The retained regression, runtime and compatibility suites are also run. Browser
UI role management and page/thread authorization are not claimed by this evidence.

## Group removal amendment

The current implementation removes workspace access groups, their management commands,
settings routes, channel selectors and active table definitions. Teams and scoped custom
roles authorize rooms, pages and threads; Yjs refreshes page permissions while connections
remain open. Browser visibility/editability checks use the permission API, and page task
assignee candidates are resolved by backend policy. Thread mutations require update access.

Legacy SQL and KV access lists are translated once into scoped user/team assignments.
The SQL upgrade drops the group tables after preserving these projections. Existing room
custom roles and revocations are authoritative and are not overwritten by legacy room
lists. Newly created resources receive explicit default team assignments. Historical
migration files and migration-only readers retain obsolete names solely for upgrades.
Earlier first-slice limitations below describe the previous baseline; group replacement,
page/thread access and live Yjs permission refresh are now implemented. UI role management
and deployed namespace transfers remain outside this change.

## Requested direction

Better Auth provides authentication and organization membership. A dedicated
application service provides workspace authorization with a Better Auth-style API.
D1 owns users, sessions, organizations and organization membership. Each workspace
Durable Object's SQLite database owns workspace authorization policy. Replace
groups with teams and custom permissions. Each authoritative fact has one owning
store; projections and caches cannot be independently edited.

The complete Durable Object migration covers user, workspace, room, thread and
page objects, including records, sync versions, client groups, acknowledgements,
deletions, presence and Yjs snapshots. Existing configuration declares SQLite
classes. Application records now use relational tables through a separate Drizzle
connection and migration stream from D1. Transferring any deployed KV-backed
namespaces remains a distinct migration concern.

Queues may be introduced later. They are an option, not a selected dependency or
an immediate-revocation guarantee.

## Previous authorization baseline

Before this slice, Better Auth handled identity and sessions without its
organization plugin. Workspace object state holds fixed roles, team membership,
moderators, groups and channel view/edit lists. D1 also contains application
membership links and invitations. Worker ingress verifies identity, asks the
workspace object for channel access and forwards trusted capabilities to the
resource object. Core enforces operation-specific rules.

Page WebSockets retain a canEdit flag established at connection time. Permission
changes do not currently refresh that flag or disconnect affected connections.
The draft below must not be described as existing protection.

## Viability and Better Auth boundary

The storage split is feasible in principle. Stock organization-plugin
configuration does not directly implement our full scoped policy model.
Better Auth organization roles apply at organization scope; its installed
implementation stores assignments on member records and loads dynamic role
permissions through its configured adapter. Teams do not automatically add
team-scoped role assignments or channel grants.

Two integrations were assessed but are not selected:

- A custom database adapter routes Better Auth models between D1 and workspace
  SQLite. This needs tenant-safe model routing, ID-only lookup handling,
  cross-store reads, joins, deletion and failure recovery. An adapter changes
  storage routing; it does not invent missing scope semantics.
- A custom workspace authorization plugin uses Better Auth identity,
  organization APIs and access-control evaluation, while workspace SQLite stores
  team/resource assignments and policy. Scope resolution and persistence remain
  application code. This adds framework integration without removing those duties.

The selected direction is a dedicated, typed workspace authorization service.
It owns permission evaluation, scope resolution and local policy management.
No custom Better Auth plugin or distributed database adapter is planned. Better
Auth remains behind an injected organization-membership/session interface.
Organization-management permissions and workspace permissions must have explicit,
non-overlapping responsibilities. In particular, organization member-role
management must not become a second editable assignment system for the same
workspace capability.

Sources: [organization plugin](https://better-auth.com/docs/plugins/organization),
[custom adapters](https://better-auth.com/docs/guides/create-a-db-adapter).
Installed Better Auth version inspected: 1.7.10. No distributed adapter or custom
workspace plugin has been implemented. The independent authorization service now
has the first room slice described above.

## Efficient enforcement proposal

Authorization is enforced for every protected operation. The expensive policy
resolution can be cached for a limited time.

1. Worker ingress verifies the Better Auth session or session-bound ticket and
   establishes trusted identity. Clients cannot supply their own capabilities.
2. On a resource object's first access, or when its cached grant is invalid or
   expired, the workspace object verifies organization membership through Better
   Auth and resolves local team, role and resource permissions. The workspace may
   reuse a still-valid membership lease for that user.
3. The workspace returns a grant bound to user, session, workspace, resource,
   allowed actions, observed policy revision and a fixed expiry. Carry it through
   authenticated server communication; client-carried grants would additionally
   require signature verification and strict audience validation.
4. The resource object caches the grant and checks the requested action and expiry
   locally on each HTTP/sync operation or WebSocket message. Cache misses use one
   in-flight refresh per subject/resource to coalesce concurrent requests.
5. A denied or expired grant cannot permit access while refresh is unavailable.
   Refreshing a grant requires re-evaluation; restoring it from SQLite or a
   connection attachment does not renew it.

The target object must verify its actual workspace/resource association. User
supplied workspace or team routing metadata cannot establish that association.
Validate the target and scope before issuing or accepting a grant.

Grants cache authorization for a specific resource and set of actions, rather
than a global isAdmin or canEdit flag. Business invariants, such as editing only
one's own message, remain enforced for each operation in core. Application
permission evaluation also lives in core; Better Auth identity and membership
integration remains behind an injected contract. Core stays transport- and
framework-independent.

For workspace navigation, return a batched projection of visible teams/channels
and allowed UI actions. Do not require a client request per sidebar item, and do
not return hidden resource content for the browser to filter. That projection is
for discovery and presentation; resource objects still enforce actual access.
Issue/cache detailed resource grants lazily for resources in use, rather than
precomputing every user/resource pair across the workspace. Batch legitimate
multi-resource requests where useful, while keeping every returned grant scoped.

## Expiry, versions and revocation

A child grant's expiry must not exceed the expiry of the membership/session
validation that supports it. Renewing a child from a cached parent must not
restart the parent's validity period. Session revocation needs the same treatment
as organization membership revocation.

A short lease, for example 30 seconds, is an illustrative starting point, not an
approved revocation SLA. Its final value depends on measured load and the access
revocation guarantee the product requires. With no delivered invalidation, access
may remain available for the unexpired lease. Immediate global revocation is not
claimed, and already admitted in-flight operations require a defined policy.

Workspace policy changes persist a monotonically increasing revision. Notify
active resource objects and invalidate affected grants after commit. A revision
inside a grant is not self-validating: the recipient needs a newer authoritative
revision or expiry/revalidation to detect that it is stale. Workspace-wide
revision invalidation is simpler initially; finer team/resource revisions can
reduce unnecessary refreshes if measurement justifies them.

D1 membership changes and workspace policy writes have no shared atomic
transaction. A crash between the authoritative write and notification is an open
correctness gap. A durable outbox is a candidate, but it must be recorded with the
owning write; a post-write hook alone does not prove that property. Until reliable
invalidation is demonstrated, expiry and fresh membership checks provide the
explicit bounded-staleness fallback. Deleting an organization must invalidate
local grants and prevent any later role update or event from restoring access.

## Live connections and outbound data

Permission enforcement includes outgoing data, not only writes. A revoked reader
must stop receiving document updates, broadcasts and sync results. On expiry or
invalidation, refresh access before delivering protected content; otherwise stop
delivery and close the connection. Downgrading edit access must prevent a Yjs
update from being applied or broadcast, rather than rejecting it afterward.

Connection state should retain identity, resource scope, grant expiry and revision,
with restoration after hibernation. Cloudflare supports persistent WebSocket
attachments; their presence does not establish that their permissions remain
valid. Use expiry checks and, where idle connections need scheduled closure, an
object-level alarm/expiry scheduler rather than one persistent interval per
connection. YServer lifecycle integration needs an actual prototype.

Source: [Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).

## Possible queue integration

Notifications should carry an event ID, organization/workspace ID, affected scope
and monotonic source revision. Consumers must tolerate duplicates, delayed and
out-of-order events. Do not apply an old grant after a newer revocation; a revision
gap should trigger reconciliation rather than assuming intermediate changes were
received. Use separate source versions for D1 membership and workspace policy,
with an explicit ordering strategy for concurrent membership updates.

Cloudflare Queues uses at-least-once delivery and does not guarantee publication
order. Consumers need idempotency and durable progress; queue delivery cannot be
the sole access-revocation control. Retries, reconciliation and dead-letter
handling remain design work. For a first prototype, direct invalidation plus
lease expiry is sufficient to test correctness; its failure window must remain
visible.

Sources: [delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/),
[queue ordering](https://developers.cloudflare.com/queues/reference/how-queues-works/).

## Performance expectations to verify

A warm message should need only a local grant/action/expiry check and any
operation-specific business check. A cold or expired resource grant introduces a
workspace call; a cold or expired membership lease also introduces a D1 lookup.
High-frequency messages should not each load Better Auth sessions, memberships
or complete workspace policies from D1.

Bound cache sizes, share refreshes across concurrent operations and index
workspace SQL by user, team, role and resource. Return resolved grants rather
than entire workspace policy. On object wake, load only the needed policy state.
The workspace remains a potential hot spot when many leases expire or policy
changes invalidate many resources. Measure cold latency, warm latency, refresh
rate, workspace requests, D1 reads, expiry bursts and revocation delay before
choosing lease durations or more elaborate caching.

A long-lived connection cannot keep access alive indefinitely by generating
traffic. Never extend expiry merely because a grant was used. Negative results
also need bounded caching so new grants can take effect.

## Open decisions and proof requirements

- Verify the exact division between Better Auth organization-management roles
  and workspace/team/resource assignments, including owner recovery/bootstrap.
- Choose whether teams themselves use Better Auth's stock team models or custom
  workspace authorization models; avoid duplicating team membership across stores.
- Define role scope, inheritance, multiple-role combination and any explicit-deny
  rules. The application permission evaluator must match the selected semantics.
- Define the maximum membership/session/policy revocation delay and treatment of
  in-flight work; choose fresh checks for actions that need a stronger guarantee.
- Prove Better Auth membership integration, tenant isolation and scope validation with two
  organizations and two workspace databases.
- Prove role creation/edit/removal, team-scoped grants and forbidden escalation.
- Prove role downgrade, membership removal, session logout and reader revocation
  for already connected clients, including outbound data suppression.
- Prove wake/restart behavior, expiry during an outage, duplicate/out-of-order
  notifications and missed-notification recovery.
- Define the complete object SQL schemas and data transfer/cutover separately.
  Converting groups must preserve approved access or require explicit product
  decisions where team permissions cannot represent an existing grant.

No full implementation recommendation should claim these gaps are resolved by
adding a plugin, a cache, a queue or SQLite alone.

## Concrete implementation proposal

The following choices make the design implementable for review. They are proposed
initial defaults, not proof of Better Auth integration or approved production
revocation guarantees.

### Storage and policy semantics

D1 holds Better Auth identity/session/organization/member/invitation models.
Organization management roles govern organization administration. They do not
implicitly grant workspace content access. Workspace content roles are assigned
in the workspace database. Provisioning explicitly bootstraps the creator's
workspace owner assignment; owner recovery and organization deletion remain
lifecycle requirements.

Workspace SQLite has teams, team_members, roles, role_permissions,
role_assignments, resource scopes, a policy revision and authorization outbox.
These are domain-defined schemas with infrastructure SQL repositories. Resource
scope records and provisioning bind each room/thread/page object to its real
workspace and parent team. The same identity must be checked on both sides of a
grant request. Do not accept a workspace association from client headers.

Role assignments identify a subject (user or team), a role and a scope
(workspace, team or resource). Start with additive grants, default deny and no
explicit-deny rules. Resolve matching assignments at the target and applicable
ancestor scopes; team assignments apply only to current team members. An active
organization membership is always required. A user's lack of team membership is
not an implicit deny of a separate explicit workspace-scoped grant. The
permission catalogue is fixed in code; custom roles choose from it at runtime.

Stock Better Auth organization team/role endpoints must not also write these
workspace assignments. The application authorization service owns these operations
and evaluates the resolved permissions. D1 membership reads go through the auth
integration behind an injected contract. The exact Better Auth membership helper
must be verified during implementation; it is not a claimed stock API.
The workspace object hosts the service; core remains independent of Better Auth.

### Request and grant contract

Worker ingress verifies the session/ticket and forwards a trusted principal:
userId, sessionId, sessionExpiresAt and verifiedAt. Forward these only over the
existing authenticated internal boundary. Clear client-supplied principal and
permission fields. Ticket verification must return validated session identity
metadata, which its current result does not expose completely. Do not forward or
persist raw session tokens in grants or connection attachments.

Remove the current unconditional workspace authorizeChannel call from Worker
forwarding after equivalent target-object enforcement is in place. The target
object determines its stored scope and resolves a resource grant using the
verified principal. Its cache key is userId + sessionId + resource type/ID. Values
contain allowed actions, policy revision, issuedAt, expiresAt and the scope.
Cache grants only in a bounded local cache and in connection state as needed;
a restored connection must still pass expiry and invalidation checks.

Initial prototype defaults: maximum membership/session validation lease of 30
seconds, maximum resource grant lease of 30 seconds, with earlier randomized
refresh to spread load. Compute expiry as the minimum of issuance plus the grant
TTL, parent membership validation expiry and session expiry. Jitter can shorten
refresh timing, never extend the expiry. Coalesce concurrent refreshes per key.
Cache denials for at most a short configurable interval, initially one second.

The workspace validates the current session and organization membership through
the auth integration when the parent validation lease is absent/expired. A fresh
trusted Worker session check may supply session freshness; WebSocket renewal
requires revalidation without relying indefinitely on connection-time identity.
If the result permits access, resolve the local assignments, evaluate allowed
actions and return the grant. Register the requesting resource object as a lease
consumer for targeted invalidation. That registration must not synchronously call
back into an object waiting for its grant.

### Current HTTP message path

Messages currently use HTTP Replicache pushes. The path stays client -> Worker ->
room object. Worker authenticates identity. The room obtains a grant from its
local cache, refreshing through the workspace only when necessary. The room's
sync scope receives the resolved principal and allowed actions, without trusting
old role headers.

The dispatcher validates command inputs and invokes core. Core checks the one
required action, for example message:send, and its business invariants before
producing effects. Remove the existing duplicated role-boolean guards from sync
dispatch once core checks are installed. For a valid cached grant, permission
enforcement adds no workspace call. HTTP identity validation still has its own
cost; do not describe the HTTP path as having zero D1 activity.

Classify failures explicitly. Invalid identity or missing resource-read access
rejects the request without admitting the batch. Authorization refresh failure
is transient and must not consume mutation IDs. An action-specific terminal
denial can be acknowledged as a no-op only with a persisted, client-visible
rejection result; it must not silently disappear into a catch block. The client
pull reconciles optimistic state and reports that rejection. Domain changes,
acknowledgements and rejection records need an atomic SQL commit unit, with any
remote validation completed before entering the synchronous SQL transaction.
This is a target contract to prove during the SQL/sync work, not existing
transactional behavior.

### Yjs and read paths

A page object requires page:read before initial synchronization or protected
outbound data. Each incoming document update requires an unexpired page:update
grant before application/broadcast. An expired grant pauses protected work until
renewal completes. Refresh on the message boundary and schedule expiry handling
for idle connections; direct notifications invalidate sooner. The exact YServer
hooks must be demonstrated with the installed version before rollout.

Do not change page content access using a connection-time canEdit boolean alone.
Read revocation closes affected connections and suppresses protected outbound
updates. Write-only revocation may keep a connection read-only if page:read still
holds. The same read gate applies to HTTP pulls, file downloads and broadcasts.

### Change delivery and outage behavior

Workspace policy updates write policy, revision and notification outbox entry in
one local SQL transaction. Attempt direct invalidation after commit. Retry
pending events durably; a future queue may transport them. Consumers invalidate
matching grants and ignore older/duplicate versions. Initially a workspace-wide
policy revision is acceptable; membership invalidations are user/session scoped.

D1 organization membership and session changes need equivalent notification
coverage across every mutation path, including Better Auth's own endpoints.
Atomic D1 write/outbox coupling is still unproven and must not be claimed through
an after hook. The 30-second prototype leases bound stale access without an
invalidation only if parent/child expiry rules and outbound gates are enforced.
Do not promise immediate cross-object revocation or rollback of already admitted
work. Owner/role administration, member removal and deletion should use fresh
membership checks and authoritative local policy rather than an old resource
grant. No privilege increase is permitted on a refresh error.

### Code ownership

Keep shared action names, input DTOs and policy schema definitions in domain.
Keep Better Auth configuration and membership/session integration in auth.
Core owns application permission evaluation and authorized policy operations.
Infrastructure owns D1/SQLite storage and migration implementations.
Backend owns object lifecycle, trusted principal forwarding, routes/handlers,
resource grant caches and connection enforcement. Register every dependency in
the existing backend container.ts entrypoint and its focused di modules; add no
secondary registration roots, forwarding exports or service-callers layer.

## Developer API

The session author selected an independent workspace authorization service with
an ergonomic Better Auth-style API. The API is implemented for the first room slice; the remaining resource rollout
and stronger delivery guarantees are still proposed.

The backend request scope supplies the verified principal and workspace. Consumers
resolve one authorization service through the existing DI container. Checking
another arbitrary caller by passing a userId is not part of the ordinary API.
Role assignment targets are explicit and management permissions are enforced by
the service itself, rather than relying exclusively on HTTP middleware.

```ts
const authorization = container.resolve(WorkspaceAuthorization);

const editor = await authorization.createRole({
  name: "Editor",
  permissions: {
    page: ["read", "update"],
    message: ["read", "send", "editOwn"],
  },
});

await authorization.assignRole({
  roleId: editor.id,
  subject: { type: "team", id: engineeringTeamId },
  scope: { type: "team", id: engineeringTeamId },
});

const result = await authorization.hasPermission({
  scope: { type: "page", id: roadmapPageId },
  permissions: { page: ["update"] },
});

await authorization.requirePermission({
  scope: { type: "room", id: roomId },
  permissions: { message: ["send"] },
});
```

Expose createRole, updateRole, deleteRole, assignRole, removeRole,
hasPermission and requirePermission. Add other methods only for actual consumers.
Role removal uses the exact assignment ID, avoiding ambiguous removal across
subjects or scopes. Deleting an assigned role is rejected by default until its
assignments are explicitly removed or reassigned. Required system owner policy
cannot be edited/deleted through custom-role APIs.

hasPermission returns a typed result with success: boolean and an optional stable
denial code. requirePermission resolves without a result on success and throws
an application authorization error on denial. Dependency/refresh errors are
separate from a known permission denial and never become permission grants.
Both methods share the same resolver/evaluator and cache policy.

All requested permissions must be allowed. Combine applicable role permissions
additively before that check; actions may come from multiple applicable roles.
Different resource targets require separate checks or a future explicit batch
API. SQL-resolved ancestry determines which scopes apply. Unknown permissions,
inapplicable resource/action combinations and foreign-workspace IDs are rejected.
Message editOwn still requires the operation's actual ownership check in core;
that permission is not proof that the current message belongs to the caller.

Permission resources/actions are a typed catalogue in domain, defined in code
alongside actual supported behavior. Administrators create custom roles at runtime
from that catalogue. This does not let an administrator invent a new permission
name that no application operation enforces. Store role definitions and assignments
in workspace SQLite. Use UUIDv7 for role/assignment identifiers.

Request-scoped caller binding must not be retained in a singleton or shared across
requests. Resource grant caches remain subject/session/resource scoped. Core
operations reuse the resolved authorization context instead of independently
refreshing a grant for each internal helper call. The API hides cache and lease
mechanics from its consumers; those mechanisms retain the explicit revocation
limitations described above.
