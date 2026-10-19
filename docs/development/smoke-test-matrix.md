# Retained showcase smoke-test matrix

[Docs home](../README.md) · [Develop Wodge](README.md)

Reviewed baseline: `3f7c59372334db7fc20d87f4964964bf16759421`, 2026-10-16.
**Every integrated journey below is Unverified in this baseline.** Dev startup
failed environment validation before a Wodge browser session could run. These
instructions are reusable acceptance checks, not claims that the current source
already implements their expected behavior. See [baseline results](baseline.md)
and [failure paths](failure-inventory.md).

## Test setup and evidence

Use an isolated test environment and synthetic content. Prepare separate browser
profiles for owner O, team editor E, viewer V, non-owner administrator A without
team grants, outsider X, and a member R whose access can be revoked. Prepare Free
and Demo Pro workspaces, a General team, a restricted team, a page containing rich
text/emoji/link/attachment and tasks, a discussion, a room, and a small benign file.
Keep paid-provider credentials out of browser configuration and captured evidence.

Run the [baseline commands](baseline.md#rerun-and-regression-classification) first.
Record which services/bindings and test accounts are configured. Use actual Wodge
pages and authoritative backend requests, not only standalone library fixtures.
Use two independent sessions for collaboration. Do not export real user data or
run destructive checks against a production workspace. Stripe journeys use test
mode; disabled calls/generation checks must not start paid provider activity.

For each row record candidate commit, runtime/dependency versions, account roles,
browser/viewport, fixture IDs, steps, observed output, and Pass/Fail/Unverified.
Capture redacted HTTP/protocol results and screenshots/traces when applicable.
Never include credentials, session cookies, signed download URLs, user content
bodies or OTPs in diagnostics. A skipped/unavailable step stays Unverified; a
configured execution that contradicts an expectation is Fail. Static source gaps
stay separately identified in the failure inventory.

References are feature-scoped: [WM](../features/workspace-membership/spec.md),
[TS](../features/teams-shared-spaces/spec.md),
[RA](../features/team-roles-access/spec.md),
[PT](../features/pages-embedded-tasks/spec.md),
[DM](../features/discussions-messaging/spec.md),
[AA](../features/agent-access/spec.md),
[BL](../features/demo-billing-limits/spec.md). An `AC-01` in one feature is not
the same criterion as another feature's `AC-01`.

## Retained user journeys

| ID                                  | Execute in Wodge                                                                                                                                                                                                           | Observable pass condition                                                                                                                                                                                    | Source                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| S-01 Auth and return navigation     | Open a protected page and an invitation signed out; sign in, complete required profile and return. Reload, expire the session, sign out and attempt browser-back/direct API access.                                        | Correct return destination; visible sign-in failure/retry; signed-out or expired identity cannot read or mutate protected content. Previously visible data is not usable after sign-out.                     | WM invitation identity; F-04/F-05                        |
| S-02 Root/unknown route             | Load `/`, an unknown URL, a missing workspace, and a missing resource. Test desktop and narrow viewport with keyboard navigation.                                                                                          | Visible, accessible destination/recovery; missing content is not an infinite spinner or blank screen; an unknown route does not expose inaccessible content.                                                 | Baseline scope; F-02/F-03/F-08                           |
| S-03 Workspace creation             | O creates a unique workspace; repeat a conflicting slug and retry a failed initialization in a separate fixture.                                                                                                           | One workspace/membership; creator owns it; General, Welcome page, room and discussion defaults exist; errors preserve input and do not create orphan/duplicate state.                                        | WM AC-01; F-06                                           |
| S-04 Reusable invitations           | E accepts a valid invitation. O disables/resets it; X tries the old link through UI and direct request.                                                                                                                    | Member appears in workspace/General with Member role; disabled/replaced link cannot grant membership.                                                                                                        | WM AC-02/03                                              |
| S-05 Email invitations              | Invite a new verified address; try a different signed-in address, expired invitation and revoked invitation. Retry/return after signup.                                                                                    | Only intended verified identity joins; seven-day expiry/revocation and resend behavior hold; no wrong-account membership.                                                                                    | WM AC-04/05                                              |
| S-06 Member capacity and authority  | Fill Free/Demo Pro accepted-member limits, attempt another join, downgrade an over-limit fixture; try A granting admin/removing O/deleting workspace.                                                                      | Owner counts toward 10/50, pending invites do not; over-limit joins fail without losing existing content/members; only O changes admin status or deletes workspace; O cannot leave while owner.              | WM AC-06/07/09                                           |
| S-07 Teams and spaces               | Create/join/leave a team; organize nested folders; create/rename/delete page/room/thread with confirmation. Try direct operations as V, A and X.                                                                           | Default Member role and default grants apply; only authorized managers change structure; General/protected structure rules hold; unauthorized content is absent from navigation and denied by backend.       | TS AC-01–09                                              |
| S-08 Additive roles                 | Give E two roles with different grants; remove a grant/role; let an authorized role manager assign a role to themselves; try deleting Member.                                                                              | Additive effective access updates; Member cannot be deleted; A without grants cannot bypass content restrictions; O retains owner access.                                                                    | RA AC-01–08                                              |
| S-09 Editor compatibility           | Open the existing rich-text/emoji fixture as E, edit surrounding text, save, reload and inspect from a second session. Exercise headings/lists/tables/images and existing premium drag-handle/outline behavior.            | Existing nodes and attributes survive round trips; no silent schema deletion, missing block menu, dropped attachment or changed task collection. Compare persisted JSON/Yjs content, not just rendered text. | PT AC-01/03/11; owner instruction to preserve the editor |
| S-10 Concurrent page editing        | O and E edit different and overlapping positions while observing collaborator presence; navigate away/back and reload.                                                                                                     | Both sessions converge without overwriting content; presence updates; reloaded page preserves edits.                                                                                                         | PT AC-03                                                 |
| S-11 Offline page and task edits    | Cache a page, disconnect E, change text and tasks, let O edit online, then reconnect E and reload both sessions. Repeat with lost permission before reconnect.                                                             | Authorized edits reconcile once; cached data is retained through an ordinary outage; revoked writes are rejected without falsely showing server acknowledgement.                                             | PT AC-04; RA AC-05/08                                    |
| S-12 Viewer/backend enforcement     | V and A without grants try text updates, task mutations and direct forged Yjs/Replicache updates; change grants during a session.                                                                                          | Viewer can read but cannot mutate; non-owner A has no content bypass; revocation stops subsequent server access. An optimistic local change is not proof of server acceptance.                               | PT AC-01/02; RA AC-05/07/08                              |
| S-13 Tasks in both views            | Create/edit/reorder columns and tasks; switch table/Kanban; set title, overview, multiple assignees, priority and dates; filter in both views.                                                                             | One collection, consistent ordering/fields/filters in both views; one column per task; two sessions converge.                                                                                                | PT AC-05/06/07                                           |
| S-14 Task lifecycle                 | Remove/reinsert the embedded task view, remove an assignee from the team, then delete the page in a disposable fixture.                                                                                                    | Reinsertion restores tasks; removed member's assignments clear without deleting tasks; page deletion removes text, attachments and collection.                                                               | PT AC-08/09                                              |
| S-15 Discussions and Q&A            | E creates a post, question, comment and answer. Author resolves/reopens a question; another editor tries author-only edit/delete; a delegated manager acts without/with content access.                                    | Attribution is correct; resolved questions reject new answers; author and delegated-management boundaries hold at backend.                                                                                   | DM AC-01/02/04/05/08/09                                  |
| S-16 Poll lifecycle                 | Create discussion and room polls; vote as V, change/retract vote, close as author, then attempt another vote/retraction and unauthorized close.                                                                            | At most one current vote/member; open poll permits changes; closed results remain visible and votes cannot change; only authorized closure.                                                                  | DM AC-06/07/08                                           |
| S-17 Room messaging                 | E sends text, Unicode/structured emoji, a media/file message and poll; edits/deletes own message. V, A without grants and X attempt reads/writes.                                                                          | Messages synchronize, retained emoji survive edit/save, authorship is enforced; V cannot send and A/X cannot bypass content access.                                                                          | DM AC-01/03/04/09                                        |
| S-18 Page/room attachments          | E uploads/opens/deletes a benign attachment and link; V downloads; X guesses the identifier; remove V's access and retry using the captured reference.                                                                     | File access follows containing resource grants, including direct download; visible failure for denied/missing file; deletion removes access and stale references do not grant new access.                    | PT AC-11; RA AC-10; DM AC-03                             |
| S-19 Member departure/deletion      | Remove R from team/workspace while R's second session is open; attempt direct read, queued write, download and agent action. Delete a disposable workspace as O.                                                           | Access and task assignments end, authored shared content is retained appropriately, deleted workspace is unavailable, no reconnect restores authority.                                                       | WM AC-08/09/10; TS AC-05; PT AC-09                       |
| S-20 Test Checkout/portal return    | O/A opens Stripe test Checkout and portal; complete/cancel test flow. Try initiating as E. Navigate back to Wodge and delay webhook delivery.                                                                              | Authorized managers only; cancellation has clear return state; plan is based on verified subscription events, not success URL alone; ordinary member can view plan/usage.                                    | BL AC-01/02                                              |
| S-21 Stripe webhook lifecycle       | Send valid test-mode created/updated/canceled events, duplicate and reordered deliveries, missing/invalid signatures, and provider/network failures.                                                                       | Invalid signature changes nothing; repeated events do not duplicate effects; effective subscription state/downgrade is correct and UI eventually agrees. Verify both persisted state and visible plan.       | BL AC-01; testing strategy; F-18                         |
| S-22 Limits and preservation        | Attempt joins/storage growth/uploads/queued synchronization at the tier limit, downgrade an over-limit fixture, and toggle operator creation pause.                                                                        | Authoritative limits apply; existing content is preserved; denied growth does not corrupt state; current workspaces remain available during creation pause.                                                  | WM AC-06/11; BL; backend authority                       |
| S-23 MCP discovery and actions      | E connects the supported MCP client; discover accessible workspaces/pages and execute the approved page/task/discussion/poll actions, including allowed attachment/link operations. Try V and inaccessible team resources. | Only current member grants authorize discovery/actions; changes synchronize into Wodge with member-via-agent attribution. Agent access adds no privileges.                                                   | AA AC-01/02/04–07/09                                     |
| S-24 MCP revocation and disablement | Revoke E's connection; disable workspace agent access; test an owner-connected agent and a member losing a required role mid-session.                                                                                      | All subsequent affected actions are denied; workspace disablement applies even to O's connection; ordinary browser access follows its own permissions.                                                       | AA AC-03/08; RA AC-09                                    |

## Milestone disabled features

These expectations come from the owner-approved current milestone scope, overriding the
positive calls journey in its historical description and the full future calls
spec. This baseline task does not implement the disablement.

| ID                                      | Execute                                                                                                                             | Observable pass condition                                                                                                                               | Baseline source observation                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| N-01 Calls disabled for every demo plan | In Free and Demo Pro, use room UI and attempt direct web/backend token/join paths as O, E and V. Observe outgoing provider traffic. | No start/join/publish UI grants a session; backend refuses token/media admission; no LiveKit/other call provider session starts. Messaging still works. | F-19 contains active call UI/token paths; integrated result Unverified.                                                 |
| N-02 Hosted generation removed          | In Free and Demo Pro, inspect editor menus and POST to both former workspace AI endpoints. Observe outgoing model traffic.          | No generation controls or registered generation handlers, no model stream or provider request, and ordinary rich-text editing still works.              | Source removal verified; integrated browser/HTTP result Unverified. See [removal record](hosted-generation-removal.md). |

## Failure injection and recovery

Repeat relevant journey rows with these injections, recording UI and authoritative
backend outcomes separately. Restore the test environment after each injection.

| ID                                    | Inject at the actual Wodge boundary                                                                                                      | Pass condition                                                                                                                                                     | Inventory     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| E-01 Root/segment failure             | Make an isolated test backend unavailable; use a test-only render fault at root and workspace segment separately.                        | Visible safe recovery and keyboard focus; bounded retry; no raw secrets or content in error text/logs. A segment boundary does not count as a root-boundary test.  | F-01/02/03/05 |
| E-02 Network and response shape       | Return text/HTML/empty/invalid JSON 400/401/403/404/429/500 or timeout for each relevant browser API call.                               | No JSON parser exception masking the real condition, stranded spinner or false success; drafts persist and unauthorized data is removed.                           | F-06–12/16/17 |
| E-03 Partial workspace initialization | Fail downstream initialization after DB creation/join; retry the original action.                                                        | No orphan/duplicate workspace or membership, correct compensation and a useful retry state.                                                                        | F-06          |
| E-04 Replicache ordering/state loss   | Replay duplicate mutation IDs, a gapped future ID, wrong client-group actor and `ClientStateNotFound`; restart the test storage runtime. | Duplicate operation has one effect; unauthorized/gapped operations do not corrupt state; client-state recovery is explicit and acknowledged data is durable.       | F-12/13       |
| E-05 Poke/WebSocket failure           | Expire token, deny connection, disconnect/reconnect, and send malformed poke data from a test peer.                                      | No unhandled app exception, duplicate subscriptions or endless busy state; accessible data catches up and revoked data stays denied.                               | F-14          |
| E-06 Yjs/schema/persistence           | Disconnect/restart provider, switch pages, reload browser, revoke edit during reconnect and load existing emoji/custom-node content.     | Compatible nodes survive; access is enforced on the server; persistence and convergence hold without cross-page data leakage.                                      | F-15; S-09–12 |
| E-07 Files/provider outage            | Fail token fetch, upload, link lookup, download, delete and storage response separately.                                                 | Correct toast/inline state, spinner ends, no orphan insertion or false success, retry is safe; authorization remains effective.                                    | F-16/17       |
| E-08 Billing/MCP provider error       | Delay Stripe test delivery or make an agent transport/action unavailable.                                                                | Stable error/retry result, preserved plan/content, no privilege escalation or duplicate operation; provider success and Wodge persistence are verified separately. | F-18/21       |

## Per-run record

Copy this record for each execution; keep the matrix unchanged as the checklist.

```text
Run / date / candidate commit:
Node / pnpm / dependency provenance:
Environment / bindings / test-mode services:
Browser / viewport / account roles / fixture IDs:
Check ID and scoped acceptance references:
Steps and injected condition:
Observed UI / HTTP or sync result / persisted state:
Evidence links (redacted):
Result: Pass | Fail | Unverified
Classification: baseline B-* | source gap F-* | suspected regression | environment
Recovery observed and fixture cleanup:
```

A milestone or feature passes only after its applicable checks have actual
evidence. Counts of passing unit assertions, generated checklist rows, an
available browser, or a successful library fixture do not substitute for these
integrated outcomes.
