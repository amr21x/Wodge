# Security boundaries

[Docs home](../README.md) · [Architecture](README.md)

Better Auth sessions identify the acting user. HTTP handlers and direct object/realtime entry points enforce backend permissions; browser controls and optimistic mutations are not authorization. Realtime ingress verifies signed, session-bound tickets and replaces caller-supplied identity headers. Workspace policies remain authoritative for resource access.

D1 owns canonical identity/organization membership. Handlers coordinate changes with object projections; those stores do not share one transaction. Revocation and failed permission refresh must close protected writes. [Persistence boundaries](data-model.md) describe page access checks and durable Yjs updates.

Browser modules contain public configuration and typed API clients only. Provider credentials, signing secrets and D1 bindings stay in the backend. Local secrets use Bitwarden/OS credential storage; production secrets use Cloudflare. Do not put secret values, cookies, signed URLs or private content in diagnostics. See [setup](../development/setup.md).

Polar webhook signatures authenticate incoming events; the backend reads current sandbox subscription state before granting entitlements. Workspace checkout requires administrator access and the portal is purchaser-only. Calls remain disabled; generation endpoints are removed. MCP is deferred and has no supported client or executable transport in this revision. Future MCP operations must enforce the acting member's permissions.

Feature flags provide an additional fail-closed capability guard, independent of permissions and provider configuration. They do not erase data or revoke previously downloaded files, issued tokens or local copies. See [flag behavior](../operations/runbooks/feature-flags.md).

The [historical security cleanup](../development/security-evidence.md), [frontend verification](../development/frontend-integration-evidence.md) and [documentation verification](../development/documentation-verification.md) have revision-specific limits. A source review or local fixture pass does not establish current production authorization, multi-user browser acceptance or infrastructure enforcement.
