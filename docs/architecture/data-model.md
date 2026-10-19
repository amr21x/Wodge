# Persistence boundaries

[Docs home](../README.md) · [Architecture](README.md)

Shared D1 persistence uses the retained users, workspaces, memberships, and invite
schema definitions in `@wodge/domain/schema`. Query functions live in core.
Each host constructs its D1 client: backend receives an explicit binding, while
the web composition adapter reads its active request. Domain and core initialize
no database at import time. Existing migrations live in `packages/domain/migrations`.

The local Worker fixture applied the three existing SQL migrations and exercised
user lookup and workspace/member/invite writes. The
[foundation evidence](../development/backend-foundation.md) identifies the checked
source and results. No new application data model or production migration was
executed by that check.

Replicache domain state and Yjs text remain separate systems. Existing PartyKit
production routing and state paths still require their scoped PartyServer migration.
The auth migration must supply its own persistence/schema and session evidence.
