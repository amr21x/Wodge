# Foundation compatibility verification

[Docs home](../README.md) · [Architecture](README.md)

This is historical checkpoint evidence. The later owner-approved editor migration
uses public Tiptap v2.27.3 packages and removes the private registry mapping.
See the [current test inventory](../development/testing-strategy.md) for validation.

Compatibility evidence is limited to the selected foundation scope of the
[verified project](../development/documentation.md) and actual local executions.
Imported provider/version conclusions and runtime claims from unrelated document
sources have been removed.

The [foundation record](../development/backend-foundation.md) and its linked JSON
record identify the checked code, package metadata, installed versions, exact
checks, failures, and limitations. The selected package family loads and compiles
in the local Worker fixture. Local D1 migrations and shared persistence operations
execute there; this is supporting evidence, not integrated product acceptance.

Full workspace installation remains blocked by private Tiptap registry access.
Lifecycle-enabled complete installation and the full web build remain unverified.
Shared-data type checking retains the documented baseline diagnostics. Backend and
protocol type checks, import boundaries, and the local Worker build pass.

Production routing, deployed bindings, auth sessions, MCP authorization/discovery,
Yjs persistence/reconnect/viewer denial, provider journeys, and budget acceptance
require their own execution evidence. No call-provider or broader frontend/tooling
compatibility claim is made here.
