# Documentation migration history

[Docs home](../README.md) · [Develop Wodge](README.md)

These are dated migration and integration records, preserved for source and approval evidence. They describe the state at each inspection, not current publishing instructions. The [current documentation workflow](documentation-workflow.md) supersedes their GitBook setup/reuse guidance. The 2026-10-16 connection record supersedes earlier claims that no connection was verified.

The [current project scope](documentation.md) supersedes broader revival targets below. Imported source approvals and outside-project links are historical records, not evidence of current-project approval.

## Agreed migration

The user explicitly confirmed preparing the proposed repository documentation in this chat on 2026-10-09. Source and execution tracker: AMR21 workspace, permanent WODGE team (WDG). Destination: the existing AMR-21/Wodge repository. The intervening proposal to use Axxi was withdrawn; no cross-workspace copy or identifier migration is needed.

Repository Markdown is the selected canonical knowledge model. Linear retains delivery state, detailed implementation/deployment/maintenance work and execution evidence. The user approved the prepared repository content and proposed Linear reconciliation in this chat on 2026-10-09. This approves the migration revision, not implementation of unresolved proposals. Keep original Linear documents intact until the approved replacement revision is available remotely and its links/content have been verified. The reviewed supersession banners are approved conditionally on verified remote replacements; do not delete/archive content.

The root README remains a capstone introduction with the walkthrough, attribution and license. Its navigation addition does not claim the revival is implemented. Application README templates remain original implementation history; [local setup](setup.md) explains their limits.

## Coverage assessment

| Coverage                                 | Canonical destination                                                                                                                                                 | Assessment / remaining evidence                                                                                                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product, discovery, feasibility          | [Overview](../product/overview.md), [principles](../product/principles.md), [glossary](../product/glossary.md), [feasibility](../product/feasibility.md)              | Existing people, goals, showcase constraints and historical financial calculations preserved. This is a migration, not renewed product discovery. No empty discovery document or new business case.                 |
| Feature behavior and acceptance          | [Feature index](../README.md#features)                                                                                                                                | Eight source specifications split from UX; feature-scoped AC identifiers unchanged. Approved intent is distinguished from code evidence.                                                                            |
| Domain and data                          | [Domain/invariants/lifecycles](../architecture/domain-model.md), [data ownership](../architecture/data-model.md)                                                      | Ownership, membership, invitations, roles, tasks, plans, calls and agent state preserved. Exact target schemas and unresolved byte/retention semantics are not invented.                                            |
| UX, accessibility, prototypes            | [Shared design](../design/README.md), feature design documents                                                                                                        | Journeys and loading/empty/error/permission feedback preserved, with keyboard/text requirements. No standalone prototype asset was found; no new prototype or empty directory created.                              |
| Architecture, APIs, integrations         | [Architecture](../architecture/overview.md), [data model](../architecture/data-model.md)                                                                              | Separate backend and runtime/request boundaries retained. Detailed unspecified endpoint/schema contracts remain implementation decisions.                                                                           |
| Stack and compatibility                  | [Stack](../architecture/tech-stack.md), [investigation](../architecture/compatibility-investigation.md)                                                               | Approved targets retained. Original investigation dated 2026-10-01 is partial; no current-provider/version verification or runtime pass is claimed.                                                                 |
| Security and privacy                     | [Security](../architecture/security.md)                                                                                                                               | Backend authority, membership/role checks, revocation, secrets and test-billing controls preserved. Client discovery transport and historical credential-remediation evidence remain open.                          |
| Performance/reliability/scalability/cost | [Quality requirements](../architecture/non-functional-requirements.md), [feasibility](../product/feasibility.md)                                                      | Offline/recovery, accessibility and budget constraints retained. Measurable latency/load/SLO and cost-cap enforcement proof are not established.                                                                    |
| Code structure and guidance              | [Code structure](code-structure.md), [policy](engineering-policy.md)                                                                                                  | Established package/dependency boundaries retained. Detailed patterns and root AGENTS.md are deferred to the owner/implementation; no agent-authored replacement or empty guidance document.                        |
| Local setup/tooling/workflow             | [Setup](setup.md), [tooling](tooling.md), [workflow](workflow.md)                                                                                                     | Current scripts separated from target commands. Windows/reproducibility and resolved dependency graph unverified. Existing work window is not extended.                                                             |
| CI/CD and environments                   | [CI/CD](../operations/ci-cd.md), [environments](../operations/environments.md)                                                                                        | Current deploy-on-main versus approved verification/manual gate mismatch explicit; cloud configuration and protection enforcement unverified.                                                                       |
| Testing and validation                   | [Strategy](testing-strategy.md), conditional feature plans                                                                                                            | Existing Vitest and target critical-journey Playwright strategy preserved. Integration/E2E-first, targeted unit/contract/security/accessibility/recovery evidence required by risk. No product tests were executed. |
| Operations/observability/recovery        | [Observability](../operations/observability.md), [deployment coordination](../operations/runbooks/revival-deployment.md), [maintenance](../operations/maintenance.md) | Required failure/usage visibility and schema-aware rollback retained. Backup/restore, RPO/RTO, retention and support responsibilities remain gaps.                                                                  |
| Release/versioning                       | [Release policy](../operations/release-policy.md)                                                                                                                     | Manual approval and commit/build identity retained. Named release is distinct from deployment; internal/public mode, initial version and engine configuration remain unresolved.                                    |
| Planning and execution                   | [Workflow](workflow.md), conditional feature plan.md files, existing Linear issues                                                                                    | No SDLC restart, initiatives, new team, plans/changes directory, mapping file or per-feature maintenance plan. Cross-feature work stays in existing projects/issues.                                                |
| Documentation synchronization            | GitBook verification below                                                                                                                                            | No verified repository connection. Missing setup does not block repository drafts.                                                                                                                                  |

## Source preservation and approval limits

The inspection retrieved 65 Wodge documents: 46 current and 19 archived. The current seven navigation hubs are consolidated into [docs navigation](../README.md). Current substantive source content is transposed with document IDs, source update timestamps and source links. Domain summaries/invariants/lifecycles are consolidated; architecture persistence/deployment sections become data-model/environments. Repetitive architecture self-links are removed. Requirements, numeric limits and feature acceptance IDs are not silently changed.

The original implementation plan remains intact in Linear. Its shared approach, allocation, approval claims and phase context are retained in [workflow](workflow.md); detailed package descriptions, daily issue lists and per-issue dates remain in Linear rather than being maintained twice. The release plan's coordination and recovery content is retained in the shared deployment runbook. Conditional feature plans are approved editorial reorganizations of existing delivery intent.

Archived feature/UX redirects state “Status: Approved” and point to former Notion pages. Relevant claims are retained with their links in feature specifications; source comments returned no independent approval discussion for current documents/projects. Do not turn a redirect's approval label, an editor name, a timestamp or this migration confirmation into approval of later content or proof of implemented behavior. The original delivery plan says its revised issues/delivery case were approved; preserve that statement at its source revision without inventing a signature or extending it.

Three Mermaid diagrams across Architecture and Domain Model are retained as text. The root walkthrough link and linked graduation PDF in the financial assessment are retained. No uploaded issue attachments were returned. External Notion/report assets were not downloaded or claimed verified.

## Historical content

Nineteen archived documents and thirty archived issues remain intact. Historical duplicate/redirect documents are not promoted into new requirements. In particular, old Stripe-removal, RealtimeKit, Radix and group/moderator directions must not override the current retained test billing, Calls/SFU, Base UI and additive team-role decisions. The historical resource-library project is canceled/trashed; current attachments and page links remain in scope.

Three archived source documents (Scope & Product Constraints, Target Architecture, Delivery & Review Rules) remain truncated even through both get-document and fetch reads. Six archived issue descriptions are also truncated. Their originals remain intact in Linear; this migration cannot claim a complete independent historical export. No truncated historical text is used to reconstruct missing requirements.

The archived credential-remediation work retains an In Progress status and a single `@codex` comment. No rotation/completion evidence was returned. This migration neither exposes credential values nor executes credential rotation.

## Open questions and unresolved proof

| ID     | Finding                                                                                                                                                                 | Treatment                                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| GAP-01 | Official MCP authorization remains selected, but compliant CIMD discovery transport on Workers is not proven; managed registration or dynamic fallback is not selected. | Preserve Decision 005 and the partial investigation; resolve before the affected executable OAuth increment. No security fallback chosen. |
| GAP-02 | Target dependency graph, TypeScript/tool/compiler API compatibility, Worker sessions, Yjs persistence and SFU calls lack runtime evidence.                              | Keep existing implementation/evidence issues; no success claimed. Provider statements remain dated source findings.                       |
| GAP-03 | Current deployment runs on push to main; the approved target requires full verification and manual approval.                                                            | Existing verification and deployment work covers implementation. This docs-only migration leaves executable CI unchanged.                 |
| GAP-04 | $5 preferred / $10 maximum monthly operating budget is an approved constraint; product quotas cannot guarantee an account-wide provider spending cap.                   | Preserve financial history and usage requirements. Do not claim a configured billing cap or free-plan feasibility pass.                   |
| GAP-05 | Source approval labels do not provide independent signed approving revisions; some historical reads are truncated and Notion/report access is unverified.               | Retain original links and claims, mark limitations, and keep originals.                                                                   |
| GAP-06 | Detailed code conventions and repository agent instructions are owner-deferred.                                                                                         | Preserve existing code-convention and repository-guidance work scope; do not settle through documentation migration.                      |
| GAP-07 | October 4–11 targets coexist with a current Backlog execution snapshot.                                                                                                 | Record historical window and current state; no automatic date shifts, completion claims or new estimates.                                 |
| GAP-08 | Quantitative performance/SLO, backup/restore, RPO/RTO, retention and support/maintenance responsibilities are not settled.                                              | Explicit gaps; no invented targets or ongoing allocation.                                                                                 |
| GAP-09 | Release mode, initial version, pre-1.0 rules and release-engine setup are not verified.                                                                                 | Preserve approval boundary and separate named releases from deployment.                                                                   |
| GAP-10 | GitBook has no verified Wodge repository/branch/path synchronization.                                                                                                   | Prepare repository drafts; leave setup/publication untouched.                                                                             |

## GitBook verification — historical 2026-10-09 snapshot

See the verified connection record in the reader navigation update below for the current connection.

On 2026-10-09 the existing authenticated browser session could access the AMR21 GitBook organization. The visible AMR21 Docs site was unpublished, displayed authenticated audience access and “Git Sync — Set up”, and listed one Untitled space. Organization home likewise showed that site and space. This establishes access to those visible surfaces, not a configured Wodge repository sync or broader member permissions.

No Wodge repository, branch, documentation folder, synchronization direction or multi-user sharing capability was verified. No GitBook configuration file was found in this repository. Do not assume `main`/`docs/` is already synchronized, create another site, change visibility or publish. If a connection is later verified, reuse it and record actual repository/branch/path/direction/access. Repository work can proceed without it.

## Verification and cutover procedure

Review the repository draft and concrete external change summary. Check content, relative links, feature AC preservation, diagram text and coverage gaps. Detailed Linear work should receive only approved source-link edits, keeping identity, ownership, statuses, comments, evidence and dependencies untouched.

The replacement files need an approved immutable repository revision available remotely before Linear links can claim a verified canonical cutover. Repository push requires the user's separate exact-command confirmation and remote-divergence check; approval of these drafts does not authorize pushing. Read back remote replacements before adding supersession notices. Old documents stay intact.

No tests, builds, migrations, production operations, commits, pushes, publication, issue changes or supersession notices were executed as part of preparing this draft.

## Historical home-page records

The following material was relocated from the home page during the reader-navigation update on 2026-10-16. It preserves the earlier migration snapshot and approval claims; its stack targets, tracker references, counts, and readiness statements are historical, not a fresh assessment of the current revival.

### Status and authority

| State                                              | Meaning in this repository                                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Capstone / implemented baseline                    | Source commit `d875c2d369f2bed15ba4e7257242131fddcbfa0a` still uses Next.js 14, React 18, Supabase, PartyKit, LiveKit, group/moderator access and existing Stripe integrations. The root README/walkthrough describe the capstone. Source presence is not a current live-deployment or test pass.      |
| Approved revival intent, not demonstrated complete | TanStack Start, React 19, Tailwind 4, Base UI, separate Hono backend, Better Auth/D1, PartyServer/SQLite Durable Objects, retained Replicache/Yjs, Calls/SFU, member MCP agents, additive team roles, test billing and smaller limits. Source decisions/approval claims are preserved with provenance. |
| Approved migration revision                        | The file split/consolidation, repository navigation and canonical-link cutover in `migration-draft-1`. User approved the prepared content and proposed external edits on 2026-10-09; canonical-link cutover remains pending remote verification.                                                       |
| Unverified or unresolved                           | Current live/shipped state, runtime compatibility, executed validation/cost evidence, several historical/asset reads and GitBook synchronization. See [coverage and gaps](../development/documentation.md).                                                                                            |

Use the [root README](https://github.com/AMR-21/Wodge#readme) for the capstone introduction, walkthrough, team attribution and license. Use [local setup](../development/setup.md) to distinguish checked-in commands from target tooling. Existing [WODGE execution work](https://linear.app/amr21/team/WDG/overview) retains detailed delivery state. Do not use historical canceled/archived plans to overwrite current requirements.

### Preservation and review

The original Linear documents remain intact. Migrated substantive files retain source IDs/update timestamps and approval limits. Architecture and domain Mermaid diagrams remain editable text; the walkthrough and graduation-report reference remain linked. Detailed work packages are not copied into a parallel repository issue tracker.

The inspection covered 65 Wodge documents (46 current, 19 archived), 12 projects (nine current), and 174 issues (128 current Backlog, 16 current Canceled, 30 archived). The returned blocker graph had 553 edges with no missing issue references or cycles. These are inspection facts, not execution completion.

[Coverage and open questions](../development/documentation.md) explains truncated historical reads, unverified external assets, incomplete provider/runtime evidence and absent GitBook connection. GitBook setup does not block these repository drafts. No source or Linear push/publication/write is authorized by this index.

### Original navigation provenance

The former [Start Here](https://linear.app/amr21/document/start-here-3e5b85a2456e), [Product](https://linear.app/amr21/document/product-1679c84a393c), [Domain](https://linear.app/amr21/document/domain-941b5e9ecde0), [Features](https://linear.app/amr21/document/features-3a7fe6a226d8), [Design](https://linear.app/amr21/document/design-4105d64cac5d), [Engineering](https://linear.app/amr21/document/engineering-cf734441ce57), and [Decisions](https://linear.app/amr21/document/decisions-8998f260618f) hubs are consolidated here. Their originals are not changed or deleted.

### Feature index provenance

Every feature has a specification and design. Acceptance IDs remain scoped to their feature. The old documents called their behavioral section a “feature plan”; those requirements now live in `spec.md`, not an execution plan.

No standalone prototype asset was found in the inspected sources. Written UX and the existing capstone walkthrough are retained; no empty prototype directories or invented screens were generated. Only the three substantial approaches in the [feature index](../README.md#features) were assigned separate plan documents in that migration. Fresh-deployment coordination is shared in the operations runbook; detailed implementation/deployment/maintenance stays in existing issues.

## Reader navigation update — 2026-10-16

The home page now offers Explore Wodge, Develop Wodge, and Operate Wodge entry points. Canonical content remains in the existing folders; feature specifications are not relabeled as user guides. The existing feature index and delivery-plan links remain accessible.

Local configuration includes gitbook-docs.yaml, docs/.gitbook.yaml, and per-space summaries/configuration. The following authenticated read-only inspection supersedes the earlier unverified-connection snapshot. Existing space/section keys, URL paths, content directories, metadata, and assets are retained. No branch, sync direction, access policy, or live publication is changed.

### Verified connection

On 2026-10-16 the GitBook connector could read the existing public Wodge site (site_5uw7w) in AMR21. Its live navigation still uses the current Home, Product, Architecture, Design, Development, Operations, Features, and Decisions sections. These local edits do not change the published site.

| Existing space | Repository / branch | Content directory  | Reported sync                              |
| -------------- | ------------------- | ------------------ | ------------------------------------------ |
| Home           | AMR-21/Wodge / main | ./docs             | Active; latest operation successful import |
| Product        | AMR-21/Wodge / main | ./docs/product     | Active; latest operation successful import |
| Development    | AMR-21/Wodge / main | ./docs/development | Active; latest operation successful import |
| Operations     | AMR-21/Wodge / main | ./docs/operations  | Active; latest operation successful import |

The latest reported operation imports from GitHub; this does not verify bidirectional sync or authorize an import/export. The local checkout is dev; GitBook reads main, so these edits are not synchronized by local preparation. Connector read access was verified; other-user permissions and the rendered draft were not. No site settings, access, sync configuration, import/export, publication, or production work was changed.
