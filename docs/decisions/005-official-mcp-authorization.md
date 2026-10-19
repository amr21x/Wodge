# Auth and MCP dependency foundation

[Docs home](../README.md) · [Decisions](README.md)

The current foundation selects the Better Auth/MCP/Drizzle adapter family over D1. Package loading does not establish OAuth/discovery/session/authorization behavior. Do not infer a discovery fallback or transport security decision without reviewed implementation evidence.

See the [verified current scope](../development/documentation.md).
