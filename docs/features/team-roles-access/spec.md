# Team access

[Docs home](../../README.md) · [Team access](README.md) · [Design](design.md)

Preserve existing backend permission authority while making the necessary runtime and authentication changes. Additive custom-role redesign belongs to the later milestone.

The [current project scope](../../development/documentation.md) governs delivery.
Use the [application baseline](../../development/baseline.md) and
[smoke matrix](../../development/smoke-test-matrix.md) for recorded behavior and checks.

## Current authorization increment

The retained baseline above predates the authorized custom-authorization work.
The first implemented backend slice introduces typed custom roles and scoped
assignments, KV persistence, Better Auth organization membership integration and
room enforcement. See the [implementation and rollout record](authorization/design.md#implemented-first-slice)
for the concrete boundary, migration requirements and remaining resource rollout.
This increment does not replace the retained team/group UI or claim completed
page/thread/file enforcement.
