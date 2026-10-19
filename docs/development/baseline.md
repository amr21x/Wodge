# Application baseline

[Docs home](../README.md) · [Develop Wodge](README.md)

Recorded on 2026-10-16 at `3f7c59372334db7fc20d87f4964964bf16759421` on `dev`.
The owner authorized proceeding from the completed local security cleanup work. The original
premium editor extensions and dependency declarations are retained. This work
records the baseline; it does not change application code or repair baseline bugs.

The deliverables are the [failure inventory](failure-inventory.md), reusable
[smoke-test matrix](smoke-test-matrix.md), and machine-readable
[execution evidence](baseline-evidence.json).

## Environment and method

The host default is Node 24.19.0. These executions use the already-installed Node
20.20.2 and pinned pnpm 9.4.0. This is an observed test environment, not a new
runtime support policy. The inherited `pnpm` launcher fails with `unable to open
database file`; a temporary PATH shim invoking pinned pnpm exposed the next
application failure without modifying repository scripts.

Two tracked-source snapshots were copied into `/tmp`: the install snapshot has no
existing `node_modules`, while the existing-dependency snapshot links the existing workspace
dependency directories. Ignored local environment files, generated `.next`
artifacts, local databases, and Git metadata were not copied. The install uses an
existing public-package store but no existing installation, empty npm user/global
configuration, and no inherited credentials. The other runs use no inherited
application/provider environment values. No production secrets, migrations,
provider writes, deployment, or token-validity probes were used.

The existing dependency tree is **not the resolved lockfile baseline**: installed
Tiptap core is 2.27.3 while the lockfile selects 2.3.0, and the Pro packages are
absent. Existing Next.js is 14.1.0, TypeScript 5.3.3, and Vitest 1.5.0. Results
using this tree are identified as such; a clean pinned runtime pass is not inferred.

## Executed baseline

Commands below use portable equivalents; argv with normalized temporary paths, working directories,
durations, exit codes, output signatures, and log hashes are in the evidence JSON.
All checks completed without hitting their timeout.

| Check                                                                                                            | Result       | Actual observation                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh retained-package `pnpm install --frozen-lockfile --ignore-scripts --fetch-retries 0 --fetch-timeout 15000` | Fail, exit 1 | `ERR_PNPM_FETCH_403` downloading `@tiptap-pro/extension-node-range@2.8.1`; registry reports no authorization header was set. No private package was removed or replaced.                                |
| Root `pnpm build`, existing dependencies, inherited launcher                                                     | Fail, exit 1 | Turbo cannot run the web build through the local pnpm launcher: `unable to open database file`.                                                                                                         |
| Root `pnpm lint`, existing dependencies, inherited launcher                                                      | Fail, exit 1 | Same local launcher failure before lint runs.                                                                                                                                                           |
| Root `pnpm build`, temporary pinned pnpm PATH                                                                    | Fail, exit 1 | Next config loads `@repo/env`; validation fails for 17 unset provider/application variables. Build compilation and page generation are not reached. Only web defines a build task.                      |
| Root `pnpm lint`, temporary pinned pnpm PATH                                                                     | Fail, exit 7 | `next lint` loads the same config and fails environment validation before linting. Only web defines a lint task.                                                                                        |
| `next dev -p 3106`, existing dependencies                                                                        | Fail, exit 7 | Same environment validation failure; no running application was available for browser journeys.                                                                                                         |
| `vitest run --maxWorkers=2 --minWorkers=1`, existing dependencies                                                | Fail, exit 1 | All 6 files fail collection: 3 have no active suites and 3 fail environment validation; no tests execute.                                                                                               |
| Same Vitest command with synthetic environment fixture                                                           | Fail, exit 1 | 5 files fail, 1 passes; 8 tests fail and 6 pass out of 14 executed tests. Three empty-suite failures are additional to those 14 tests.                                                                  |
| `tsc -p apps/web/tsconfig.json --incremental false --pretty false`, existing dependencies                        | Fail, exit 2 | 9 diagnostics: 7 missing Pro-package imports, an image-node component type mismatch, and an implicit `any` caused by unavailable outline types.                                                         |
| `tsc -p apps/backend/tsconfig.json --incremental false --pretty false`, existing dependencies                    | Pass, exit 0 | Backend static type check only; no Worker/service runtime or deployment is exercised.                                                                                                                   |
| `tsc -p packages/data/tsconfig.json --incremental false --pretty false`, existing dependencies                   | Fail, exit 2 | 16 diagnostics in stale thread-test imports and movement argument/identifier types.                                                                                                                     |
| Direct web `eslint --no-ignore --format json src`, existing dependencies                                         | Fail, exit 1 | 421 files scanned, 902 errors and 53 warnings, zero parse errors. This bypasses Next config and explicitly includes files otherwise ignored by the root config. It is not a successful `pnpm lint` run. |

The supplemental test fixture supplies only synthetic strings and loopback URLs
to satisfy module validation; it does not configure real services. It exposes
test defects without establishing provider compatibility or integrated Wodge
acceptance. The 6 passing assertions cover the existing RBAC tests and thread
creation/deletion; they do not validate the milestone's target authorization model.

## Reproduced baseline findings

| ID   | Classification                       | Reproduction / evidence                                                                                                                                                                                                                          | Consumer and routing                                                                                                                                                |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 | Environment/access                   | Credential-free private registry fetch returns 403.                                                                                                                                                                                              | Every fresh workspace install and CI install; the security audit records the owner's decision to retain premium packages.                                           |
| B-02 | Local tooling                        | Turbo selects the failing global pnpm launcher. Temporary pinned pnpm reaches Next.                                                                                                                                                              | Root build/lint entry points; include in toolchain modernization toolchain work.                                                                                    |
| B-03 | Environment/bootstrap                | Next config and test imports require 17 unset values before useful work can start.                                                                                                                                                               | Build, dev, `next lint`, 3 test files; setup and dependency foundation work.                                                                                        |
| B-04 | Existing test configuration          | `channels.test.ts`, `chat.test.ts`, and `init.test.ts` contain no active suite and fail collection.                                                                                                                                              | Vitest workspace; regression coverage.                                                                                                                              |
| B-05 | Existing test/API mismatch           | Thread tests import `createThreadMessageMutation`, `deleteThreadMessageMutation`, and `editThreadMessageMutation`; the modules export comment mutations. All three calls fail with `TypeError`; data type checking also reports missing exports. | `packages/data/__tests__/workspace/thread.test.ts`; regression coverage.                                                                                            |
| B-06 | Existing assertion/behavior mismatch | All 5 team tests fail: 4 structure equality assertions and last-team deletion throws `Cannot delete the last team`.                                                                                                                              | `packages/data/__tests__/workspace/teams.test.ts`; regression coverage. Expectations must be reconciled with the approved behavior before changing production code. |
| B-07 | Existing source type errors          | Shared movement code accesses properties absent from union members and mixes numeric drag identifiers with string IDs.                                                                                                                           | `packages/data/models/workspace/mutators/make-movement.ts`; dependency/domain migration validation.                                                                 |
| B-08 | Existing installation drift          | Missing Pro packages and Tiptap 2.27.3 versus locked 2.3.0 explain why the existing web tree cannot represent a clean pinned check. Image-node typing failure is observed in this tree, not proven in a clean install.                           | Editor/runtime compatibility; editor migration and toolchain modernization.                                                                                         |
| B-09 | Existing lint findings               | 559 unused-variable, 132 display-name, 106 prop-type, 65 undefined-name findings; 17 hook-rule errors. Full rule counts are in evidence JSON.                                                                                                    | Direct ESLint diagnostic, not an implemented lint gate.                                                                                                             |

All B findings precede the documentation-only baseline recording change. They are not migration
regressions. The reverted security cleanup emoji-schema deletion reproduction is recorded in
the [security evidence](security-evidence.md); that attempted code is absent
from this baseline and must not be reported as a current application failure.

## Product and milestone evidence

All integrated browser, provider, MCP, and multi-client sync smoke rows start
**Unverified**. Dev startup fails before those flows can be exercised. Static
inventory entries describe current source contracts and implementation gaps;
they are not observed HTTP/browser results. Calls and hosted generation are
negative/disabled checks under the owner-approved milestone scope, even though the retained
capstone source still contains their provider paths.

The milestone conformance references include M1-AC-01/07/08/09/10. Their prepared definitions are absent from this
reviewed checkout, so this record does not invent mappings or claim those
milestone criteria pass. Feature-scoped AC references in the matrix point to
the checked-in specs; milestone overrides are explicitly attributed to the approved baseline scope.
The security cleanup dependency relation is preserved; direct owner authorization to proceed
allowed baseline recording without implying its earlier install criterion passed.

The baseline deliverable is complete when actual install/build/test outcomes,
environment conditions, source failure contracts, and reusable smoke instructions
are recorded. A red baseline is useful evidence, not a release pass.

## Rerun and regression classification

Use a new tracked-source copy at the candidate revision and record Node/pnpm
versions, dependency provenance, environment mode, command, exit, duration, and
redacted failure signature. Run `pnpm install --frozen-lockfile` before claiming
a clean dependency result; a failed install cannot validate later runtime checks.
Keep lifecycle-disabled diagnostics labeled separately from a full installation.

Then run `pnpm build`, `pnpm lint`, `pnpm exec vitest run --maxWorkers=2
--minWorkers=1`, and the three explicit `pnpm exec tsc --project ... --incremental
false --pretty false` checks above. The repository has no root `test` or
`typecheck` script. Use direct ESLint only as the separately labeled diagnostic.
Do not reuse an old `.next` tree or count cached Turbo output as a fresh execution.

Compare failure signatures under equivalent environments. A reproduced B finding
is pre-existing. A new failure introduced by a candidate revision is a suspected
regression until isolated. A version/credential/binding difference is an environment
change, not proof of a code regression. Execute the relevant smoke rows after
bootstrap succeeds; record their real outputs instead of carrying forward
fixture, static, or baseline-library passes.
