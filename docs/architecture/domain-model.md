# Retained domain model

[Docs home](../README.md) · [Architecture](README.md)

Shared definitions now live in `packages/domain/src`, grouped by user, workspace
(including membership and teams), pages, discussions and rooms. Shared permission
calculations, keys and pure mutations have explicit public entries. D1 table
definitions are isolated behind `@wodge/domain/schema`; browser-safe contracts do
not import live persistence or browser clients.

Replicache handles structured local-first state, while Yjs handles collaborative
text. D1 persistence and schema definitions remain distinct from browser adapters.
Zod 3 domain validation is retained; Zod 4 is isolated to auth/MCP protocol adapters.

This foundation introduces no custom-role model, resource/invitation redesign,
storage quota, call accounting model, or premium-eligibility flag. Those changes
cannot be inferred from dependency or package-boundary work.

See [package boundaries](../development/code-structure.md) and the
[foundation results](../development/backend-foundation.md).
