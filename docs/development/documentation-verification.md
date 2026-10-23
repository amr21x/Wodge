# Documentation source verification

[Develop Wodge](README.md) · [Authority and publication](documentation.md)

Reviewed on 2026-10-23 against canonical source commit
`e8feb97cce617a26c55c5cc627c868341f3a2df3` plus this documentation-only change.
This is the checkout supplied for the owner-requested rewrite and CI-skipped push,
not approval of a production release. Application code, manifests, lockfile and
workflow definitions are unchanged. The final documentation commit is recorded in
Git history and the delivery report, avoiding a self-referential commit hash here.

## Source review

- **Pass:** manifests and Wrangler configuration establish Next.js 15.5.28/React 18,
  OpenNext frontend Worker, Hono backend, five SQLite PartyServer classes and
  `BACKEND` service binding. The diagram routes persistence through the backend,
  rather than implying browser-to-D1 access.
- **Pass:** domain feature registry/core policy show calls, agent access, hosted
  generation and resource libraries unavailable; attachments/avatars default off.
  There is no executable MCP transport/tool registry or supported client to claim.
- **Pass:** environment validator and examples require two distinct signing secrets
  and both Google/GitHub OAuth providers. Partial mode permits absent storage/Polar;
  ready mode requires those settings. Missing configuration does not fake success.
- **Pass:** the Polar adapter selects `sandbox`; authorized billing handlers and
  webhook processing separate checkout from entitlement. Member limits are 10/50;
  full storage quotas and a monetary spend cap are not established.
- **Pass:** current manifests/public environment examples contain no Supabase,
  Stripe, hosted generation SDK or private Tiptap registry requirement. Retained
  LiveKit packages are documented as disabled, not removed.
- **Pass:** workflow review confirms manual deployment applies remote D1 migrations,
  sets secrets and deploys both Workers; the checks job precedes the production
  environment-gated deploy job. GitHub CI and external Git builds are separate.

## Checks run for this change

- **Pass:** `pnpm install --frozen-lockfile` with pnpm 12.15.0 / Node 24.19.0;
  all 1,572 packages restored from the existing store with no lockfile changes.
- **Pass:** root `pnpm lint` (warnings denied).
- **Pass:** root `pnpm format` and `pnpm format:check`.
- **Pass:** local Markdown file/heading link validation across changed documents.
- **Pass:** `git diff --check`; only Markdown changed, including the walkthrough
  and this evidence record. No authored issue identifiers were introduced.

The initial sandboxed pnpm launcher could not open its version-management database.
Commands succeeded with the normal pinned launcher outside that filesystem restriction;
no alternate package-manager version was used. Application tests and builds are not
required for this documentation-only rewrite and are not claimed rerun. External link
availability, provider connectivity and production smoke checks were not rerun.

## Acceptance and publication limits

- **Unverified:** production deployment/demo journeys at the canonical revision.
  No live demo link is published. Runbook hostnames describe configuration.
- **Unverified:** new full browser acceptance, multi-user permission journeys,
  configured storage and live Polar sandbox checkout/webhook/portal behavior.
- **Unverified:** public-load cost, provider budgets/alerts, external Cloudflare Git
  build settings and production environment reviewer enforcement.
- **Unverified:** publication of earlier local scope amendments. Documentation push
  completion is reported separately after the final commit/push; production
  publication is not authorized by this task.
- **Historical evidence only:** [frontend integration](frontend-integration-evidence.md)
  records real OAuth and single-user/two-session journeys at earlier candidates;
  its pending Stripe-replacement note is superseded by current Polar code, but its
  tests are not relabeled as current results. [Relational persistence](relational-object-persistence.md)
  records SQLite/Yjs restart checks at its own candidate. The older [smoke matrix](smoke-test-matrix.md)
  remains a baseline and procedure, not a current blanket failure/pass statement.
- **Deferred:** MCP to milestone 2 and the TanStack frontend migration; the latter
  must update affected documentation once implemented. Capstone video and A+
  attribution remain historical. AGPL-3.0 licensing is preserved.
