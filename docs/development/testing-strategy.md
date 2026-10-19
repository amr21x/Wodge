# Implemented tests and validation

[Docs home](../README.md) · [Code structure](code-structure.md)

The automated suite contains **217 tests in 26 suites**. The inventory below
identifies implemented cases and their limits. Run all suites from the root with
`pnpm exec vitest run --maxWorkers=2 --minWorkers=1`. Backend tests also run with
`pnpm --filter backend test`; domain tests with `pnpm --filter @wodge/domain test`.

## Domain unit tests

| Suite in `packages/domain/tests/unit` | Cases | What is checked                                                                                                                                                                        |
| ------------------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `access.test.ts`                      |     4 | Team membership, moderator capabilities, edit permission and view permission.                                                                                                          |
| `teams.test.ts`                       |     5 | Creator membership; name updates preserve state; workspace membership restrictions; folder parent/duplicate rules; last-team deletion guard.                                           |
| `discussions.test.ts`                 |     4 | Thread creation/deletion; comment author CRUD; impersonation and unauthorized changes; duplicate comments, missing posts and resolved discussions.                                     |
| `workspace-contract.test.ts`          |     1 | Shared workspace validation remains compatible with the table-derived contract.                                                                                                        |
| `input-contracts.test.ts`             |    39 | Valid DTO and missing input for all 8 page, 5 room, 9 discussion and 17 workspace operations; invalid nested updates/roles/folders/IDs; user profile validation and username trimming. |

`identifiers.test.ts` adds 6 domain cases: UUIDv7 uniqueness/order/time encoding;
legacy acceptance and invalid ID rejection; UUID defaults for teams/welcome
channels; UUID DTOs and group permissions; mixed old/new records without ID
rewrites; and user/workspace database generator defaults. Reserved root folder
keys retain their deterministic relationship to the team ID.

`user-profile.test.ts` defines 3 cases for canonical field mapping and identity/time
preservation, nullable optional fields, and excluding auth-only fields from DTOs.
These new cases have been compiled, not executed, in the current static pass.

## Backend unit tests

Files are in `apps/backend/tests/unit`.

`authentication.test.ts` defines 2 cases: a valid session supplies its canonical
user without resolving a profile service/repository, and an invalid session denies
access without profile provisioning. These new cases are compiled but not executed.

`session-tickets.test.ts` adds six cases covering claim shape and purpose, TTL,
revoked sessions, malformed claims, invalid signatures and expiry.

`sync.test.ts` has 11 direct tests of `repPush` and `repPull`, with no HTTP router:

1. Missing identity and malformed push envelopes do not run operations.
2. Client group ownership is enforced.
3. Stored client/group association is enforced.
4. Consecutive operations, multiple clients, duplicate suppression and one batch revision.
5. A noninitial operation from an unknown client reports missing client state.
6. Future operation IDs do not advance the stored acknowledgement.
7. Runner failure keeps acknowledgements unchanged; retry replays earlier effects.
8. Initial pull uses zero, returns the patch/current cookie, and permits a new group.
9. Pull filters acknowledgement changes by cookie and client group.
10. Pull rejects missing identity, wrong ownership and invalid cookies before patching.
11. Patcher failure returns a server error without changing sync state.

`application-errors.test.ts` has 8 tests: a transport-free core page call and denied
write; serializable error code/message/details; room author rejection and unchanged
dependency-error identity; and all six billing-code mappings to existing HTTP
responses. Application failures contain no HTTP status.

`dependency-lifetimes.test.ts` has 11 tests:

1. A class resolves to one instance per request; different requests get different instances.
2. Scoped services isolate object state and revision values.
3. One service handles successive mutation revisions correctly within a batch.
4. Unused providers are not initialized; initialized clients are disposed once.
5. Overlapping requests share DO state while retaining separate service and SDK instances.
6. Workspace admission does not instantiate object storage.
7. Concurrent authorization requests retain separate authenticated principals.
8. The production server disposes injected clients after a handler fails.
9. Constructor injection receives the service instance already resolved in the request.
10. Grant-cache services are request-scoped while grant data stays on the DO.

`handler-injection.test.ts` has 3 tests: middleware receives the existing scoped
constructor graph and isolates requests; unrelated and rejected requests skip
handler construction while resolution failures still dispose the scope; and DO
routes resolve handlers from request bindings. Compile-time cases in
`tests/types/injection.ts` reject unknown handler names/methods and instance maps.

`workspace-access.test.ts` adds 3 guard cases: team file writes require both
membership and moderation; either missing capability denies access.

`tests/types/injection.ts` contains compile-only assertions for constructor calls,
handler maps, context keys, handler names and methods, named provider resolution,
runtime-value registration and object-specific tokens. These cases
run with the backend compiler check; they do not execute application behavior.

`tests/types/user.ts` checks canonical session-to-profile mapping and rejects
exposing auth-only fields or editing identity IDs/emails through account operations.

The latest structure/type pass checks backend, core, domain, infrastructure, auth
and the web consumer, plus boundary and formatting checks. Runtime acceptance of
these latest changes is deferred; earlier test counts describe the implemented
suite and do not certify this pass's runtime behavior.

## Backend integration tests

Files are in `apps/backend/tests/integration`.

| Suite                         | Cases | What is checked                                                                                                                                                                                                                     |
| ----------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page-service.test.ts`        |    11 | Backend caller dispatch/persistence for all 8 page operations; each edit capability and denied no-op; unknown operation policy; storage failure and in-memory state.                                                                |
| `page-sync.test.ts`           |     5 | Production route registration, Hono push/pull ordering and acknowledgements; denied-write acknowledgement/poke; storage failure without acknowledgement; adapter initialization reload; missing workspace and denied read statuses. |
| `pages.test.ts`               |     3 | Real browser Replicache transactions agree with backend create/edit/cascading delete; missing column inserts nothing; storage failures propagate.                                                                                   |
| `shared-state.test.ts`        |     3 | Workspace optimistic/backend parity and authorization; room/discussion parity; sender impersonation rejected on client and backend.                                                                                                 |
| `sync-failures.test.ts`       |     6 | Production workspace, room and discussion route registration and acknowledgement behavior after storage failure and unknown operations.                                                                                             |
| `provider-boundaries.test.ts` |     4 | Actual JWT claims/key/expiry; local LiveKit grant/identity/TTL; S3 key/endpoint/signed expiry; Stripe raw webhook signature verification. No live providers.                                                                        |
| `router-errors.test.ts`       |    33 | Application error mappings; unexpected-error sanitization/logging; malformed JSON on all routers; validation fields; ingress mapping; awaited/failing startup; object isolation; explicit administrative guards.                    |
| `feature-services.test.ts`    |    15 | Cases listed below.                                                                                                                                                                                                                 |

The 15 feature-service cases cover:

1. Workspace owner/default team creation, default-team join, persist-before-notify.
2. Remote provisioning failure and partial state after bucket failure.
3. Unauthorized workspace commands and remote-before-local member removal.
4. Invalid workspace arguments fail before the acknowledged-operation catch.
5. Workspace deletion preserves state after failed user removal and clears on success.
6. Presence rejects outsiders and persists member connection/disconnection.
7. Room send permission and author checks.
8. Discussion announcement permission and author/privilege checks.
9. User workspace persistence before notifications, including write failure.
10. Private file keys, signed expiry, pagination/size and write notifications.
11. Missing file deletion does not persist or notify.
12. Billing authorization/plan checks, checkout metadata/URLs and portal eligibility.
13. Billing verified events, missing metadata, updates and notifications.
14. Directory compensates failed provisioning/joining.
15. Invite operations require the authoritative administrative check.

## Local Worker and database checks

`pnpm --filter backend test:foundation` runs 13 checks:

- Browser domain entries exclude host, persistence runtime and sync client code.
- Core services bundle independently of application hosts/transports/databases.
- Browser adapters exclude authoritative server/database/auth implementations.
- Common UI utilities exclude editor/feature/provider/server implementations.
- The production Hono Worker entry compiles without Next context.
- The D1/PartyServer/Yjs fixture Worker compiles.
- Local Worker imports execute without live provider configuration.
- Existing migrations and user reads execute against local D1.
- Workspace batch writes preserve owner membership and invite creation.
- Directory preview, invite rotation and toggling execute against D1.
- UUIDv7 user/workspace defaults persist in the Worker runtime alongside existing records.
- Page operations persist through actual object storage, service reconstruction and object isolation.
- Workspace, room, discussion and user operations persist through actual object storage.

These local fixtures reconstruct services per request. They do not prove process
restart recovery, production deployment, authenticated collaboration or Yjs editing.
The foundation name identifies the test harness, not a replacement backend runtime.

## Architecture and runtime checks

`node scripts/check-boundaries.mjs` checks package declarations, direct exports,
handler/service/repository boundaries, infrastructure direction and browser imports.
Backend class registrations are explicit under `src/di/`; services, handlers and
repositories use constructor injection without accessing the container. The runtime
initialization boundary is the only production consumer of container resolution.

Dependency-lifetime tests verify reused instances within one runtime, isolation
between objects, operation-local mutation revisions and identities, no handler
resolution during requests, and disposal of class-owned SDK clients. Compile-time
cases check Hono context and constructor contracts. String tokens still need
runtime wiring coverage.

Core and auth packages discover their own unit suites. Backend unit/integration
suites cover sync failure semantics, authorization, membership coordination,
request validation, persistence and provider boundaries. Local foundation checks
exercise D1 migrations, actual browser mutator bundles and reconstructed object
state. Production runtime checks exercise the real Worker with local D1/objects
and provider network mocks. See [the review handoff](backend-review-handoff.md)
for the review path and remaining behavioral limits.
