# Wodge

A local-first collaborative workspace for team conversations, shared pages and embedded tasks. Wodge began as a five-member graduation capstone, received an **A+ evaluation**, and is being revived as a portfolio showcase.

The current source uses a Next.js frontend and a separate Hono/PartyServer backend on Cloudflare Workers. Replicache synchronizes structured data, Yjs synchronizes collaborative text, Better Auth uses D1 for identity, and each Durable Object owns SQLite state. Billing is **Polar sandbox only**.

## Current application

- Workspaces, teams, invitations and backend-enforced scoped permissions.
- Room messaging, threaded discussions, comments and polls.
- Collaborative Tiptap pages with page-owned tasks displayed in table and Kanban views.
- Replicache local mutations and reconnection, with server authorization deciding final acceptance.
- Google and GitHub sign-in; email sign-in is disabled.
- Administrator-authorized sandbox checkout and purchaser-only billing portal.

Calls are disabled in UI and backend. Hosted generation has been removed. Standalone resource libraries are unavailable. Attachments and avatars default to disabled pending storage configuration. MCP is deferred to milestone 2: **no MCP clients are supported by this revision**, because there is no executable transport or tool registry. Installed auth packages and reserved routes do not establish MCP support.

These are implementation claims, not blanket acceptance results. The [source verification record](docs/development/documentation-verification.md) identifies the reviewed revision, historical browser evidence, remaining checks and pending publication. A live demo link is pending deployment verification.

## Start locally

Use Node >=22.19 (`.node-version` selects 24.19.0) and pnpm 12.15.0.

```sh
pnpm install --frozen-lockfile
cp .env.example apps/web/.env.local
pnpm secrets setup
pnpm init:app
pnpm secrets run -- pnpm dev
```

Before `secrets setup`, create a Bitwarden Secrets Manager project containing the required settings named in [the backend environment example](apps/backend/.dev.vars.example). Both OAuth providers and two different signing secrets are required even in partial mode. The frontend contains public configuration only.

Follow [local setup and secrets](docs/development/setup.md) for configuration, callback URLs, optional providers and recovery. `pnpm reset:app` deletes local Wrangler data; it is not a routine setup command.

## Architecture and technology

The independent [documentation project](apps/docs/README.md) publishes the existing Markdown at `wodge.amr21.dev/docs/`.

See the [architecture and diagram](docs/architecture/overview.md), [persistence boundaries](docs/architecture/data-model.md) and [verified technology inventory](docs/architecture/tech-stack.md).

```text
apps/web/          Next.js UI, browser sync and typed API clients
apps/backend/      Hono routes, handlers, gateways, DI and five PartyServer objects
packages/auth/     Better Auth, sessions, identity, permissions and tickets
packages/core/     Business services and feature repositories
packages/domain/   Models, schemas, DTOs and declarative database schemas
packages/infra/    Database tooling, storage, HTTP and provider adapters
packages/env/      Typed environment configuration
config/ts/         Shared TypeScript configuration
```

Web uses Next.js 15, React 18, Tailwind 3, Radix and public Tiptap 2 packages. Backend uses Hono, PartyServer, Drizzle, TSyringe and Better Auth. OpenNext builds the frontend Worker. Oxlint, Oxfmt, Vitest, pnpm and Turborepo supply repository tooling. A future TanStack frontend migration must update affected documentation when complete; TanStack Query/Table dependencies do not mean that migration has happened.

## Verification and operations

```sh
pnpm lint
pnpm format:check
```

See [testing guidance](docs/development/testing-strategy.md) for application checks and [the showcase walkthrough](docs/development/showcase-walkthrough.md) for manual acceptance. [Deployment instructions](docs/operations/runbooks/production-deployment.md) cover the two Workers, same-origin API routes, D1 migrations and secrets. Deployment is a separate authorized action; a push does not authorize production changes. Cloudflare Git builds have independent skip/branch controls; verify those controls when a push must not deploy.

The showcase has no verified monetary spending cap. Free/Pro membership limits are 10/50, not infrastructure budget controls. Calls/generation remain unavailable, billing uses test payments, and storage quotas remain incomplete. Read [operational limits and recovery](docs/development/setup.md#limits-and-recovery) before hosting a public instance.

## Capstone history

The [original project walkthrough](https://youtu.be/IBZvqOu6Xro) documents the graduation capstone. It may show retired or disabled features and is not a tour of the verified revived deployment.

Wodge was built by a five-member team. **Amr Yasser served as Scrum Master and contributed across the majority of the monorepo**, including frontend development, backend services, synchronization flows, collaborative editing, and deployment tooling.

## License and contact

Wodge is licensed under the [GNU Affero General Public License v3.0](LICENSE). For questions, contact [Amr Yasser](mailto:amryasseremam@gmail.com).
