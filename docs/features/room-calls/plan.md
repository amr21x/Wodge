# Calls disabled for the portfolio milestone

[Docs home](../../README.md) · [Calls disabled for the portfolio](README.md) · [Specification](spec.md) · [Design](design.md)

The [current project](../../development/documentation.md) requires temporary call
disablement in both UI and backend. The retained source still contains LiveKit
paths; their presence is not evidence that the disablement is implemented.

Verify that disabled call controls communicate their state and that direct backend
requests cannot start the disabled operation. Do not provision a call provider,
exercise paid media paths, or treat restored calls as a current acceptance gate.
Call-provider restoration belongs to deferred modernization and requires its own
reviewed scope and execution evidence.
