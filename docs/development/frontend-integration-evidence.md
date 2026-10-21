# Frontend integration verification

[Develop Wodge](README.md) · [Smoke-test matrix](smoke-test-matrix.md)

Recorded 2026-10-20 against base commit
`ee9989508093c39d6b46a18117d2a0a1f842104a` plus the local frontend changes.
The candidate source/test fingerprint is
`43c7777a173fe5d7185c88992ca6372a3a56b5d008c320ec84e7bb544a459c56`. It hashes
each changed or untracked, nonignored file under `apps` and `packages`, sorted by
path, as UTF-8 path, NUL, file bytes, NUL. Deleted files use the bytes `<deleted>`.
The evidence document itself is excluded.
These results describe an uncommitted candidate, not a deployed revision.

## Implementation scope

The approved demo sign-in scope was amended during implementation: Google and
GitHub replace email/OTP sign-in. The email form, OTP UI and Better Auth email OTP
plugin are removed. The server's OAuth client IDs and secrets are mandatory in
both integration modes; missing, empty or whitespace values fail configuration
validation. Resend is not required in ready mode, and authentication no longer
resolves an email sender. See the [backend environment example](../../apps/backend/.dev.vars.example)
for the four variables and provider callback paths.

Room controls consume authoritative read, send, edit-own, delete-own, moderation
and voting checks. Workspace settings expose room-only custom roles and their
user/team assignments at room, team or workspace scope through the existing
roles/assignments API. Roles containing other resource permissions remain
read-only in this screen. System-role protections remain authoritative on the
backend. The page/thread/file compatibility contracts and disabled-feature policy
are retained.

Role changes, membership notifications and reconnects refresh permission state.
Explicit server denials clear prior allows; failed permission refreshes cannot
keep controls writable. Ordinary offline pauses retain previously checked grants
for pending local work, whose eventual acceptance is decided by the backend.
Permission responses are not persisted across browser sessions. Session/account
changes close active sync instances and clear protected query data without
removing Replicache or Yjs offline databases. Subscription callbacks and snapshots
are tied to their source instance to avoid displaying another workspace's state.

Sign-in and settings retain input on failure and release pending controls.
Workspace navigation/reset follows successful writes. Shared feedback handles
validation, authentication, authorization, rate limits, unavailable integrations
and network failures. Mutation retries are disabled; Replicache retains its
existing identified-mutation recovery protocol. Empty successful pushes and
protocol error responses are handled separately. Sync failures do not claim that
pending edits were acknowledged. Root errors and backend outages provide recovery
actions without exposing unexpected diagnostics.

## Automated execution

Environment: Node 24.19.0, pinned pnpm 9.4.0, Next 14.1.0, TypeScript 5.3.3,
Vitest 1.5.0. Dependencies were restored using the frozen lockfile, offline cache
and `--ignore-scripts`. No dependency or lockfile change is part of this work.
The system pnpm launcher failed/hung; a pnpm 9.4.0 executable in `/tmp` was placed
on PATH for the commands below. This temporary launcher is not a repository change.

- Pass: `pnpm --filter web run test`: 58 tests across 12 suites. Includes OAuth provider/network failures,
  pending cleanup, absence of email controls, safe redirects, room action
  checks, role editing and assignment/removal, permission loss/refresh failure,
  workspace snapshot isolation, offline pauses, session/account replacement,
  structured/plain-text errors, empty pushes, protocol errors and outage recovery.
- Pass: `pnpm --filter web typecheck`, including generated browser-only API
  consumer checks and assignment/list/removal contracts.
- Pass: `pnpm --filter backend test:api`.
- Pass: `pnpm --filter backend test`: 199 tests across 26 suites, including
  required Google/GitHub configuration in partial and ready modes.
- Pass: `pnpm --filter @wodge/auth typecheck` and `pnpm --filter @wodge/env typecheck`.
- Pass: `pnpm --filter backend test:runtime` and
  `pnpm --filter backend test:foundation`.
- Pass: root `pnpm lint`, `pnpm format` and `pnpm format:check`.
- Pass: `node scripts/check-boundaries.mjs` and `git diff --check`.

Frontend integration tests stub selected HTTP/auth/provider boundaries. Backend
runtime tests use local Workers/D1/Durable Objects and mocked provider boundaries.
Their sessions now use the real Better Auth OAuth initiation/state/callback flow
with mocked GitHub token/profile endpoints, including the second collaboration user.
Neither establishes live browser acceptance of authenticated user journeys.

## Actual browser execution

Used the T3 collaborative Chromium preview at 1280 × 800, synthetic input,
Next dev on port 3000 and the actual local Worker on port 8787. The Worker used
partial integration mode, disposable local signing values and the existing local
D1 migrations before OAuth settings became mandatory. The final OAuth UI check
ran with the Worker stopped. No external provider credentials, authenticated fixture accounts,
production database, paid-provider activity or authentication bypass were used.

- Pass: sign-in renders against the local Worker. After applying migrations,
  `/api/auth/get-session` returns HTTP 200 with no session.
- Pass: the final sign-in page contains only Google/GitHub provider buttons and
  no email or OTP inputs. This DOM check was repeated after the scope amendment.
- Before that amendment, live unavailable-email (HTTP 503) and absent-OAuth
  (HTTP 404) feedback was verified against the local Worker. Those historical
  responses are superseded: email routes now return HTTP 404 in the runtime suite,
  and missing OAuth configuration now prevents Worker initialization. They do not
  establish final-provider readiness.
- Pass: signed-out navigation to a protected settings URL redirects to sign-in
  with both the original path and query string retained.
- Pass: after stopping the local Worker, protected navigation reaches the
  unavailable recovery page with a retry action and the original return path.
  The feature flag guard remains enabled; recovery uses its own public route.

Initial setup attempts hit a refused frontend connection, a sandbox port-binding
restriction, missing local D1 tables and a preview timeout while Next compiled.
The local servers were started with the required host permissions, existing local
migrations were applied, and the final checks above were repeated successfully.
These setup failures are not counted as successful journeys.

## Live OAuth results

Run locally with the backend reading its six required secrets from the OS
credential store (no `.dev.vars`) and public web values from `apps/web/.env.local`.
Browser journeys ran in a real Chrome (WSL) driven over the DevTools protocol,
with separate cookie contexts per window; credentials were entered by the user.

- Pass: the sign-in start endpoint returns GitHub and Google authorization URLs with
  the configured client IDs and callbacks under
  `http://localhost:3000/api/auth/callback/<provider>`.
- Pass: a real GitHub sign-in completed the callback (HTTP 302), created a
  GitHub-linked UUIDv7 user with an active session, reached onboarding and then
  the workspace list showing the GitHub profile.
- Pass: a real Google sign-in completed the callback (HTTP 302) and was linked to
  the existing user with the same verified email rather than creating a duplicate.
- Pass: workspace creation; the workspace loads with synchronized teams and rooms.

## Replicache upgrade

Replicache 14 disables itself without a license key, which blocked every synced
journey. Replicache 15.3.0 no longer uses a license key, so both apps now depend on
`^15.3.0`, the `licenseKey` option is gone and `NEXT_PUBLIC_REPLICACHE_KEY` was
removed. The lockfile change is limited to Replicache and its `@rocicorp` packages.
After the upgrade: 58 web tests, 199 backend tests, 20 runtime checks, 13
foundation checks, the API contract, type checks, lint, formatting and boundary
checks pass, and the browser console shows no Replicache errors.

## Browser journeys (single user, two sessions)

- Pass: room message send; live delivery between two separate sessions in both
  directions (about 2 s including typing).
- Pass: offline reconciliation: a message sent while offline stays local, is
  delivered about 3 s after reconnecting and appears exactly once on both clients
  and after reload.
- Pass: page creation and two-client page editing: edits arrive in under 2 s,
  concurrent typing converges to identical content and persists after reload.
- Pass: workspace rename saves (HTTP 204), appears in the other session, persists
  after reload and was restored.
- Pass: custom room role lifecycle: create (201), assign to a team for one room
  (201), deletion is disabled while assigned, unassign (204), delete (204). System
  roles expose no edit or delete controls; an empty name is rejected.
- Pass: invite link opened while signed out redirects to
  `/login?redirect=/<workspace>/join/<code>`.
- Pass: Tasks DB insertion shows Kanban; columns and tasks sync to the other
  session; the table view lists the task; removing both embedded boards through
  the block menu syncs, and a reinserted board shows the existing column and task.
- Pass: logout from one tab revokes that session (401). Its other open editor tab
  shows "Your session has expired. Pending edits have not been confirmed.", hides
  page content, disables editing and does not deliver a later keystroke; Back does
  not reveal cached content. The other signed-in session continues to work.

Findings from these journeys:

- Fixed: empty custom-role names showed raw validator text; the shared role schema
  now reports "Role name is required" (and a length message) to the UI and API.
- Fixed: "Sign in again" after session expiry opened `/login` without a return
  path. One `loginPath` helper now builds login links for the middleware, invite
  page and session recovery; the live banner links to
  `/login?redirect=<current page>`.
- Fixed: the Kanban, Table and filter toggles had no accessible names.
- Open: a room or settings screen polls one `authorization/check` per distinct
  permission set every 10 s (about eight requests together). Reducing this needs a
  backend endpoint that returns a scope's effective permissions in one response.

## Remaining acceptance

Unverified: two-user journeys (invite acceptance, custom-role changes and access
loss observed by another member, viewer denial), cross-origin credential behavior,
workspace switching between several workspaces and uploads with configured storage.
These need a second account with a different email, or storage credentials.

Billing acceptance is deferred: Stripe is planned to be replaced by Polar in
separate work, so no billing credentials will be configured for this record.
Preserve the existing smoke-test matrix's Pass/Fail/Unverified distinction; this
work does not mark those remaining rows complete. No credentials were written to
files or disclosed during this work.
