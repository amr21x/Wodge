# Current validation and evidence

[Docs home](../README.md) · [Develop Wodge](README.md)

Record the actual checked revision/content hashes, command outcomes, and limitations.
Use Pass, Fail, and Unverified to describe execution results; source presence and
package importability do not establish full application acceptance.

The [baseline](baseline.md), [failure inventory](failure-inventory.md), and
[smoke matrix](smoke-test-matrix.md) record existing failures and product journeys.
The [foundation evidence](backend-foundation.md) records dependency/peer checks,
backend/protocol types, browser/server boundaries, Worker compilation, and local D1
checks. It separately identifies failed and unexecuted gates.

Preserve meaningful bug-fix/retest evidence. Do not count a synthetic fixture as
full auth/MCP, collaboration, permission, provider, or browser acceptance. No new
test framework, coverage target, or CI gate is selected by this page.

## Restructuring checks

The [page/task slice checkpoint](code-structure.md#pagetask-slice-checkpoint)
records the current commands, dependency provenance, outcomes and limitations.
`pnpm check:boundaries` checks package ownership and public imports;
`pnpm --filter backend test:pages` exercises the extracted client/domain/backend
path. Worker/D1 and browser bundle checks remain in `test:foundation`.

Use integration tests for persistence, authorization, provider and synchronization
boundaries; end-to-end tests should cover critical user journeys when the app can
run. Retain unit tests for substantial permission and mutation rules. Empty suites
and tests that merely mirror implementation do not need preservation. Existing
failing tests must be evaluated against intended behavior rather than deleting
them solely to produce a green run. Coverage percentages are not completion gates.
