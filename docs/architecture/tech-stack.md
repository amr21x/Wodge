# Technology scope

[Docs home](../README.md) · [Architecture](README.md)

The [verified current project](../development/documentation.md) governs scope.
Versions below distinguish retained implementation, foundation candidates, and
work still awaiting application acceptance.

## Retained application

The checkout retains Next.js 14 and React 18, Tailwind CSS 3, Radix components,
Tiptap 2 with its original premium packages, and Replicache/Yjs. Existing source
still contains PartyKit and Supabase paths. Hosted generation has been removed from the application, including provider
endpoints, editor controls, SDK dependencies and API key configuration. Calls
remain in the capstone source and must be disabled for the current milestone;
that separate disablement is not established by the generation removal.

## Current migration scope

- PartyServer 0.5.10 and y-partyserver 2.2.0, targeting SQLite Durable Objects.
- Better Auth and official MCP/Drizzle adapter family 1.7.8 over D1.
- Drizzle ORM 0.45.2 with Kit 0.31.4.
- Zod 4 at isolated protocol adapters; retained domain schemas stay on Zod 3.
- Node >=22.19.0 and deliberately pinned compatible Workers tooling.
- A separately scoped Next.js/React/maintained Cloudflare adapter update while
  retaining Tailwind, Radix, existing routes, and UI behavior.

The [foundation evidence](../development/backend-foundation.md) records exact
installed versions, import/build/runtime checks, and unresolved installation gates.
It does not establish production auth, MCP, Yjs, or full application acceptance.

## Deferred work

Broader frontend/framework/tooling modernization, custom roles, resource/invitation
redesigns, expanded MCP, and call-provider restoration belong to a later milestone.
Specific replacement frameworks, visual libraries, compilers, linters, formatters,
and call providers are not selected by this page.

## Configuration

D1/Drizzle remain the database direction. Cloudflare holds deployed Worker secrets;
local configuration uses ignored environment files and explicit bindings. No remote
secret or infrastructure migration was performed by the local foundation work.
