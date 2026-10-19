# Foundation security boundaries

[Docs home](../README.md) · [Architecture](README.md)

Preserve existing backend permission authority during the dependency/runtime work.
Persistence factories are not authorization endpoints. HTTP, synchronization, and
MCP callers must enforce the acting member's permissions.

Browser exports stay separate from server/database/protocol exports. Public browser
configuration is separate from server bindings and credentials. Shared persistence
receives D1 explicitly, while Next request context stays inside the web adapter.

Local configuration files remain ignored. The owner-directed secret-export CLI
removal changes scripts and configuration; it does not migrate remote secret values.
The editor uses public Tiptap v2 packages. Private extension imports and the
private registry mapping are removed; no registry authentication is required.

See the [security cleanup record](../development/security-evidence.md) and
[foundation evidence](../development/backend-foundation.md) for actual observations.
Auth sessions, MCP authorization/discovery, production binding wiring, and permission
journeys require their separate implementation and validation.
