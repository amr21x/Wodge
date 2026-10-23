# Verified source technology

[Docs home](../README.md) · [Architecture](README.md)

The manifests and runtime configuration at the [reviewed revision](../development/documentation-verification.md) establish this inventory. Versions are manifest declarations, not a fresh-install or production-build result.

| Area                    | Current source                                                            |
| ----------------------- | ------------------------------------------------------------------------- |
| Web                     | Next.js 15.5.28, React 18, TypeScript, Tailwind CSS 3, Radix              |
| Worker adapter          | OpenNext Cloudflare 1.20.13; frontend and backend Wrangler 4.152.0        |
| Structured browser data | Replicache ^15.3.0; no license-key configuration                          |
| Collaborative editing   | Public Tiptap 2.27.3 packages, Yjs, y-partyserver 2.2.0                   |
| Backend                 | Hono 4.13.13, PartyServer 0.5.10, SQLite Durable Objects                  |
| Identity                | Better Auth in `@wodge/auth`, Google/GitHub OAuth, D1                     |
| Persistence             | Drizzle, D1 and private SQLite per object                                 |
| Billing                 | Polar SDK and Better Auth Polar plugin, sandbox only                      |
| Optional files          | S3-compatible object storage adapter; uploads/avatars disabled by default |
| Dependency injection    | TSyringe 4.10.0, explicit tokens, reflect-metadata                        |
| UI state                | TanStack Query/Table, Zustand, Jotai, Immer                               |
| Tooling                 | pnpm 12.15.0, Turborepo, Vitest, Oxlint 1.89.0, Oxfmt 0.74.0              |
| Node                    | >=22.19.0; `.node-version` selects 24.19.0                                |

The frontend is not yet TanStack Start. Calls retain LiveKit packages but cannot issue call tokens. Auth/MCP dependencies do not establish executable MCP support. No MCP clients are supported in this revision; implementation is deferred to milestone 2.

Supabase, hosted generation providers, premium Tiptap registry setup, Replicache license keys and Stripe are retired from active application configuration. Historical migration/evidence files may retain their names. Polar is the current mandatory test-billing provider. Read [setup](../development/setup.md) rather than replaying capstone service instructions.

Cloudflare production secrets and local OS-credential-store secrets are separate. Web configuration is public and browser safe. Remote provisioning and deployment require explicit authorization; [operations](../operations/runbooks/production-deployment.md) describes the configured topology without establishing live verification.
