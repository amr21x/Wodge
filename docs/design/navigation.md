# Retained navigation

[Docs home](../README.md) · [Design](README.md)

Preserve the existing workspace, team, page, task, discussion, room, and settings
navigation during the necessary Next.js/React/backend compatibility work. The
current project retains the frontend UI and defers broader redesign.

Calls and hosted generation are to be disabled in both UI and backend. Minimal MCP
connection behavior belongs to its own scoped implementation; the dependency
foundation adds no navigation flow.

Use the [existing smoke matrix](../development/smoke-test-matrix.md) when checking
navigation and error states. See the [current scope](../development/documentation.md).
