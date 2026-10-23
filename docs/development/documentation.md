# Documentation scope and authority

[Docs home](../README.md) · [Develop Wodge](README.md)

The active delivery scope is **AMR21 / Wodge Revival & Enhancements**. [Open the project](https://linear.app/amr21/project/wodge-revival-and-enhancements-ee86a6345a5d). Repository source and revision-specific verification establish implementation; feature designs describe intended behavior and do not prove acceptance.

## Current milestone

The showcase retains the existing product/UI, Replicache and Yjs. PartyServer/SQLite Durable Objects, Better Auth/D1 and Polar sandbox billing are implemented in the reviewed source. Calls are disabled; hosted generation is removed. MCP is deferred to milestone 2 unless a specific capability has executable implementation evidence. This revision has no supported MCP clients or executable MCP tools.

The planned TanStack frontend migration is the final milestone increment and owns updating affected documentation when complete. Current source still uses Next.js/OpenNext. The full editorial rewrite does not delay the earliest deployment; essential setup, limitations and recovery guidance accompany deployment preparation. Publish a demo link only after verification.

## Source and evidence

The canonical source reviewed for this rewrite is `e8feb97cce617a26c55c5cc627c868341f3a2df3`, the current checkout supplied for the task. The owner requested completion and a push without CI/CD on 2026-10-23. That authorizes this documentation delivery, not blanket application acceptance or production deployment.

Earlier preparation records referenced baseline `63f7352ccb132cdd9be8901310ce691bed00e984`, local revisions `portfolio-milestones-draft-1`, `portfolio-quality-draft-2`, `portfolio-compatibility-draft-3` and handoff `portfolio-delivery-4`. Remote publication of those amendments remains unverified; they are provenance rather than an assertion that the current build was approved for release.

[Documentation verification](documentation-verification.md) records actual checks and Pass/Fail/Unverified boundaries. Historical [foundation](backend-foundation.md), [baseline](baseline.md), [persistence](relational-object-persistence.md) and [frontend](frontend-integration-evidence.md) records retain their original revisions and environments. Their passing fixtures or browser sessions must not be promoted to acceptance of a newer build.

## Publication and remote actions

At documentation review time, publication is pending the task's final commit/push; the delivered commit and push result are identified by the delivery report and Git history. Live showcase publication and acceptance at this reviewed revision remain Unverified. The configured hostname and deployment instructions are not evidence of a verified demo.

The owner subsequently authorized Cloudflare Git deployment from `main`; the merged automation at `a378aefd` governs ordinary application releases. This task branch retains its explicit no-CI/CD push instruction. Other remote migrations, provider/resource changes and named releases still need their own authorization. GitHub Actions and Cloudflare Git builds have independent triggers; see [deployment boundaries](setup.md#deployment-boundary). Do not put issue identifiers in authored documentation or evidence.
