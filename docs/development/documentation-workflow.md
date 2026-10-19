# Documentation workflow

[Docs home](../README.md) · [Develop Wodge](README.md)

Read and edit the Markdown directly in GitHub. Repository files own product and engineering knowledge; Linear owns issue status, assignments, dependencies, detailed execution work, and evidence.

## Find what you need

Start from the [documentation home and feature index](../README.md). Explore explains the product, Develop guides engineering work, and Operate covers deployment and support. Each section has a README index; individual pages link back to their section and the docs home.

| Folder                                    | Content                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| [product](../product/README.md)           | Goals, scope, terminology, and feasibility                                       |
| [architecture](../architecture/README.md) | System boundaries, stack, domain/data models, security, and quality requirements |
| [design](../design/README.md)             | Shared UX, navigation, and interaction patterns                                  |
| [development](README.md)                  | Setup, tooling, workflow, testing, and engineering evidence                      |
| [operations](../operations/README.md)     | Environments, CI/CD, observability, release, maintenance, and runbooks           |
| [features](../README.md#features)         | Feature specifications, designs, and warranted delivery approaches               |
| [decisions](../decisions/README.md)       | Decisions, rationale, consequences, and approval evidence                        |

## Edit and review

Open the page on GitHub, use the pencil button, and preview the Markdown. Propose changes through the repository's branch and review process. Editing requires repository permission; no separate documentation account is required.

Use ordinary headings, lists, tables, relative links, images, fenced code, and Mermaid. Keep navigation in README files. Do not add publishing metadata, duplicate summary files, or tool-specific card markup. This repository currently needs no documentation package, site build, or hosting setup to read its docs.

Keep feature behavior in spec.md and feature design in design.md. Retain plan.md only for a substantial delivery approach; additional rollout coordination belongs in deployment.md or an applicable shared runbook. Detailed implementation, deployment, and maintenance work stays in existing Linear issues.

Preserve stable acceptance IDs, source references, decisions, and approval evidence. Distinguish inspected implementation from approved intent and new proposals. Presentation cleanup does not approve new requirements or prove behavior has shipped.

## Check changes

Preview changed pages in GitHub or a Markdown viewer. Check relative links and section anchors, confirm that indexes reach every page, and check diagrams and referenced assets. Compare feature acceptance criteria and source evidence when reorganizing content. Follow the [CI/CD policy](../operations/ci-cd.md) for documentation-only versus mixed changes; the approved policy is not yet fully enforced by the checked-in application workflow.

## Source and integration state — 2026-10-16

The source is AMR-21/Wodge, with documentation rooted at docs/. This cleanup is prepared on dev after integrating the incoming backend foundation commits; it has not been pushed. Read access follows repository visibility and permissions; this cleanup does not change either.

GitBook is no longer part of the repository documentation workflow. Its local configuration, duplicate summaries, and presentation metadata have been removed. No replacement renderer or hosting service has been configured.

The previously verified GitBook integration read main and served an existing public Wodge site. Its live sync and old published copy have not been disconnected or changed by this cleanup. Removing local files does not disable that integration. The owner must separately authorize live disconnection and decide the old site's visibility before a publishing cutover. See the [historical connection record](documentation-history.md#verified-connection).

Original Linear documents stay intact until replacements are available at an approved remote revision and verified. Then apply only authorized source-link changes and supersession notices. Pushes still require exact-command confirmation; publication and remote settings require separate authorization.

## Coverage, gaps, and evidence

The [current project scope](documentation.md) governs delivery. Its retained application and limited migration milestone supersede the broader revival targets recorded in the migration history.

The [engineering coverage assessment](documentation-history.md#coverage-assessment) and [migration source/approval record](documentation-history.md#source-preservation-and-approval-limits) preserve the existing knowledge inventory. The [open questions](documentation-history.md#open-questions-and-unresolved-proof) are dated findings, not new requirements or completion claims.

Runtime compatibility, security remediation, performance/recovery targets, release configuration, and CI enforcement still need the evidence described in their owning documents. The earlier GAP-10 claim of an unverified GitBook connection was superseded by the later connection inspection; live detachment is now the outstanding integration operation. The incoming project scope confirms AMR21 / Wodge Revival & Enhancements as the only active delivery scope. Outside-project links and imported approval claims in the historical record are provenance only, not current-project authority.
