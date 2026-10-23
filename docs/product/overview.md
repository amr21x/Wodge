# Product and portfolio scope

[Docs home](../README.md) · [Explore Wodge](README.md)

Wodge is a local-first collaborative workspace for team conversations, shared pages and embedded tasks. It originated as a five-member graduation capstone and is being revived as a portfolio showcase with bounded operating exposure.

Current source retains the Next.js/Tailwind/Radix UI, Replicache structured synchronization and Yjs text collaboration. The backend now uses PartyServer with private SQLite databases and Better Auth/D1 identity. Google/GitHub OAuth replaces email sign-in. Polar sandbox is the current test-billing provider; live payments are outside scope.

Calls are disabled, hosted generation is removed and standalone resource libraries are unavailable. Storage-backed attachments/avatars default off pending configuration. MCP is deferred to milestone 2; no supported MCP client, executable transport or tool flow is verified in this revision. Design documents for future agent access are not delivery claims.

The planned TanStack frontend migration has not happened in this source and must refresh affected documentation when completed. The broader README rewrite does not gate the earliest deployment: essential configuration and recovery guidance is in [setup](../development/setup.md) and the [deployment runbook](../operations/runbooks/production-deployment.md).

See [source authority and publication](../development/documentation.md), [revision-specific verification](../development/documentation-verification.md), and the [manual walkthrough](../development/showcase-walkthrough.md). Historical capstone demonstrations are distinct from revived application acceptance.
