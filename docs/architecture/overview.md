# Architecture and current migration scope

[Docs home](../README.md) · [Architecture](README.md)

The [current project](../development/documentation.md) restores the existing Wodge
portfolio demo with limited necessary migrations. A local source change is distinct
from integrated acceptance or deployment.

## Retained application and state

The web application remains Next.js with its existing Tailwind/Radix UI. Replicache
continues handling structured local-first state; Yjs handles collaborative text.
Existing code still includes Supabase and PartyKit until their scoped migrations.

## Backend direction

Backend realtime services move to PartyServer with SQLite Durable Objects. Auth
moves to Better Auth/D1, with minimal member-controlled MCP for discovery, page
reading, and task creation/update. Billing uses Polar sandbox subscriptions through Better Auth's Polar plugin. Calls
and hosted generation are to be disabled for the portfolio milestone.

The foundation separates neutral/browser/server exports and supplies D1 explicitly
to persistence factories. Next request access is isolated inside the web application.
Existing backend-to-web API calls and production routing still need migration.
Authorization remains at the authoritative backend; persistence factories do not
create new authorization endpoints.

## Verification boundary

The [foundation record](../development/backend-foundation.md) provides actual local
package, type, bundle, Worker, and D1 observations. It does not prove full auth/MCP,
Yjs permission/persistence, browser journeys, or deployed bindings. No remote deployment
or resource provisioning occurred.

Broader framework/tooling/UI changes, custom roles, resource/invitation redesign,
expanded MCP, and call-provider restoration are deferred. No specific deferred
provider or replacement tool is mandated by this architecture page.
