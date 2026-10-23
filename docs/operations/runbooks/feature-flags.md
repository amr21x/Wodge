# Database-controlled feature flags

Feature flags provide environment-wide switches. The canonical registry is [`packages/domain/src/features/models.ts`](../../../packages/domain/src/features/models.ts); the enforcement map is [`feature-policy.ts`](../../../packages/core/src/features/policy.ts). There is no dashboard, workspace targeting, percentage rollout, or external flag service. Permissions, membership, premium checks, quotas, and provider configuration continue to apply independently.

## Setup and database edits

Apply the normal D1 migrations to the intended environment before deploying the code:

```sh
pnpm --filter backend db:migration:local
```

For the deployed environment, use `--remote` through the normal authorized deployment procedure. Migration `0003_feature_flags.sql` creates `feature_flags(key, enabled)` and seeds every registered key. `enabled` must be the integer `0` or `1`; the database rejects nulls, text that cannot be stored as 0/1, fractions, and other integers. SQLite may normalize numeric text to integers through column affinity. No user or workspace identifier belongs in this table.

Inspect and edit individual values directly:

```sh
pnpm --filter @wodge/worker-tools exec wrangler d1 execute wodge --config ../../apps/backend/wrangler.jsonc --local --command "SELECT key, enabled FROM feature_flags ORDER BY key"
pnpm --filter @wodge/worker-tools exec wrangler d1 execute wodge --config ../../apps/backend/wrangler.jsonc --local --command "UPDATE feature_flags SET enabled = 0 WHERE key = 'polls'"
pnpm --filter @wodge/worker-tools exec wrangler d1 execute wodge --config ../../apps/backend/wrangler.jsonc --local --command "UPDATE feature_flags SET enabled = 1 WHERE key = 'polls'"
```

Substitute `--remote` only when deliberately operating the deployed environment. Confirm the affected row with SELECT. UPDATE of a misspelled name changes no rows. Unknown database keys are ignored. Delete of a known row restores its explicit registry default on the next successful read; use UPDATE to disable it.

To add missing definitions safely after introducing registry entries, rerun:

```sh
pnpm --filter @wodge/worker-tools exec wrangler d1 execute wodge --config ../../apps/backend/wrangler.jsonc --local --file ../../packages/domain/seed-feature-flags.sql
```

The seed and migration use `ON CONFLICT(key) DO NOTHING`; reruns preserve all operator values, including disabled values. Tests verify parity between the registry, migration, and seed. Rollback normally means restoring individual previous values, not dropping the table. A missing table causes fail-closed behavior.

The backend Worker and each Durable Object read the same D1 binding directly. Start them with `pnpm --filter backend dev` and the web with `pnpm --filter web dev`. Next.js forwards `/api/feature-flags` to the Worker; there is no web database binding or internal flag endpoint. Existing session and object authentication still apply to protected operations.

## Propagation and failure behavior

- Worker HTTP handlers and direct Durable Object entry points check effective flags using their constructor-injected feature service. The service reads the shared D1 binding for every operation; the web only consumes the public snapshot.
- `GET /api/feature-flags` exposes only effective booleans and expiry metadata. It is public so authentication failures cannot break flag loading. The endpoint sends `Cache-Control: no-store`. It exposes no operator write API.
- Visible, running clients refresh every **15 seconds**, with a **5 second request timeout**: allow up to **20 seconds** for a healthy change to reach an already-open client. Focus, visibility changes, and reconnection also trigger refresh. Sleeping, background-throttled, or offline browsers cannot guarantee wall-clock polling; they refresh when resumed. Backend checks remain authoritative.
- Every runtime retains a last-known-good snapshot only until **60 seconds after its successful database read**. Its absolute expiry travels through the backend and the browser, so fallback layers cannot restart the grace period. Reads are not cached on the success path; read caching remains future work.
- On an unavailable database, hung read, or invalid transport snapshot, unexpired last-known-good values apply. At expiry, or on a cold start with no good snapshot, all product flags close. The browser independently expires its snapshot even if requests hang. Recovery reads continue and successful reads restore effective values.
- Unknown rows are ignored. Invalid values encountered in an existing/nonconforming table fail closed for that known key; values are never truthiness-coerced. Unavailable capabilities are always clamped off, even if their row is `1`.
- Backend refusals return `403` with `{ "error": "FeatureDisabled", "feature": "..." }`. Unregistered HTTP capabilities and Replicache mutations are rejected. Push batches are checked before any mutation or mutation-ID bookkeeping; rejected offline batches may retry and apply when the capability is re-enabled.
- New page connections and every incoming/outgoing Yjs message are checked. Disabled traffic is suppressed without closing established sockets; close/cleanup handlers keep working. Completed writes, downloaded files, local copies, presigned URLs, and issued provider tokens are not revoked. Disabling a flag is not a data-erasure or emergency-session-revocation mechanism. Existing calls are not automatically disconnected.

## Capability inventory and coverage

All keys are stable and typed. The first thirteen default to enabled after a successful DB read; the final four default to disabled and are unavailable in this revision. Cold-start/failure defaults for all keys are disabled.

| Key                 | UI entry points                                                                       | Authoritative gates                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspaceCreation` | Add-workspace create tab and form                                                     | `/api/workspaces/new`; workspace Durable Object `/create`                                                                                                                                                                                                   |
| `workspaceSettings` | General workspace settings, workspace-switcher link                                   | Workspace update/avatar/delete HTTP and Durable Object operations                                                                                                                                                                                           |
| `membership`        | Join tab/form and direct invitation route; members settings and switcher link         | Invite/join/leave/member HTTP endpoints; Durable Object join/leave; remove-member and role mutations                                                                                                                                                        |
| `teamManagement`    | Teams settings, team creation/edit/membership/role controls                           | Workspace create/update/delete team mutations; folder-only updates use `pages` instead                                                                                                                                                                      |
| `groups`            | Groups settings, creation/edit/membership controls                                    | Workspace create/update/delete group mutations                                                                                                                                                                                                              |
| `discussions`       | Threads navigation, recent items, direct thread/post/Q&A routes and editors           | Thread Durable Object reads/pushes; workspace create/update/delete thread mutations; comments, post status and votes retain existing permission checks                                                                                                      |
| `messaging`         | Rooms navigation, recent items, direct room routes, message editor                    | Room Durable Object reads/pushes; workspace create/update/delete room mutations                                                                                                                                                                             |
| `polls`             | Room/thread poll creation and voting widgets                                          | Poll creation/votes and mutations targeting stored polls; room/thread pulls filter poll items, including after a flag-only change                                                                                                                           |
| `pages`             | Pages navigation, recent items, direct page routes, folders and rich editor           | Page Durable Object reads, Yjs connections/messages; workspace page/folder/channel mutations; nested add/remove-folder team updates                                                                                                                         |
| `tasks`             | Embedded task boards, tables, filters, assignees, priorities, dates and slash command | Page Replicache reads and every column/task mutation, additionally requiring `pages`                                                                                                                                                                        |
| `attachments`       | Room upload/media controls, editor image insertion/upload controls                    | Workspace channel file upload/download; media-message mutations and operations targeting stored media; room pulls filter media messages                                                                                                                     |
| `profiles`          | Account profile form and avatar controls                                              | Existing-profile update HTTP endpoint and user-avatar HTTP/Durable Object operations; initial profile completion is an infrastructure exception                                                                                                             |
| `billing`           | Upgrade settings and checkout/portal controls                                         | Checkout and portal HTTP endpoints; existing admin/premium/provider checks remain                                                                                                                                                                           |
| `calls`             | New-call control and join window                                                      | Both token entry points retain the permanent `CALLS_DISABLED` response. **Unavailable:** legacy LiveKit cannot be re-enabled through flags; approved Calls/SFU replacement is absent. Existing session controls remain mounted.                             |
| `agentAccess`       | No implemented MCP connection UI                                                      | `/api/mcp` and descendants are reserved and closed. **Unavailable:** there is no executable MCP transport/tool registry in this checkout, so no successful MCP operation is claimed or introduced. Future tools must also gate their underlying capability. |
| `hostedGeneration`  | AI slash command, text-menu actions and legacy writer node view hidden                | Removed AI endpoints stay absent; reserved AI and prompt policies remain closed regardless of DB values. Wodge-hosted generation is outside approved scope.                                                                                                 |
| `resources`         | Standalone resource-library navigation, recent items and direct routes hidden         | Legacy team-bucket file/list/delete HTTP and Durable Object paths remain closed. Channel attachments have their own flag.                                                                                                                                   |

The root client route gate handles direct navigation and already-open routes. It hides an already-mounted route without tearing down its session or editor state; a direct visit to a disabled feature does not mount it. Sidebar tabs, team/channel navigation, settings items, recent items, forms, and embedded controls consume effective flags. Formatting, tables, links, emoji, columns, and collaborative cursors are part of the containing editor (`pages`, `messaging`, or `discussions`), not separate capabilities. Task-list formatting is document text; structured task boards and their data use `tasks`. Existing rich document content and embedded node metadata remain stored when a subfeature closes; flags gate feature operations rather than rewriting documents or stripping arbitrary external links.

## Necessary infrastructure exceptions

- Authentication, signup/login/logout, session refresh/callback, user identity reads, and initial profile completion must remain usable. `/api/users/update` checks `profiles` for users that already have a username; first completion remains available so a disabled flag cannot trap a new account in onboarding. Profile-change notification to the backend updates projection versions only and remains infrastructure.
- Workspace discovery, workspace metadata, workspace membership/structure sync, token minting, channel authorization, membership checks, presence and poke notifications support the application shell and existing authorization. They remain available even when management capabilities are disabled. Structure includes team/channel metadata; disabling a feature does not make its historical names secret. Domain content reads and mutations still enforce their flags separately, including when using previously minted tokens.
- Landing/demo/info, workspace home/recent shell, theme, account/recovery shell, static assets, CORS preflight, and the flag endpoints remain available. Theme and recovery controls are not product kill switches. Cached/local data is not purged.
- Signed Polar webhooks reconcile already-created billing operations even when checkout is disabled. Billing success/failure return pages remain usable. This does not authorize production billing or relax test-billing restrictions.
- Deleting a workspace or team is governed by its management flag and can cascade to contained records. Provisioning can create default team/folder metadata. Flags do not freeze records or disable required cleanup.
- Service calls for authorization, projection maintenance, cleanup, and notifications retain their existing authentication and continue independently. They are not new public product entry points.

## Extending and verifying

For each new capability: add its stable key/default/availability to the registry, add the seed row and migration as needed, register HTTP/Party/mutation policy and all UI/route gates, and update this inventory. Enabling availability requires the actual approved implementation and provider configuration; a flag alone cannot create it. Never take effective backend flags from request headers, client JSON, or client state.

Run `pnpm test:feature-flags`, then backend/frontend type and lint checks under the normal repository workflow. The focused suite covers SQLite seed reruns/constraints, malformed values, unknown keys, unavailable capabilities, database failures/timeouts, read/write transitions, mixed batches, nested/poll/file/MCP policies, realtime suppression/recovery, and an open React client's polling/offline expiry. It does not claim live D1, deployed backend, provider calls, or executable MCP end-to-end validation. Node versions with `node:sqlite` use it; older supported Node versions use the existing web `better-sqlite3` development dependency and need its native build.
