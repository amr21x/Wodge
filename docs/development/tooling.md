# Development tooling

[Docs home](../README.md) · [Develop Wodge](README.md)

The current foundation retains the existing tooling and selects only the runtime
and dependency changes needed by the portfolio milestone. See the
[current scope](documentation.md) and [executed foundation evidence](backend-foundation.md).

## Runtime and package manager

Node.js must be >=22.19.0; `.node-version` selects 24.19.0. The package-manager pin
is pnpm 9.4.0. The host's inherited pnpm launcher failed during verification;
checks invoked an existing pinned CLI directly. This is not a global launcher repair.

## Retained tools

- TypeScript remains on the resolved 5.3.3 compiler.
- ESLint and Prettier remain the linter and formatter. No replacement is selected.
- Turborepo remains on the retained 2.x dependency line.
- Vitest remains in the existing workspaces. Protocol-package peer compatibility
  uses its separately pinned version; it is not a repository-wide runner upgrade.

Broader tooling modernization is deferred. There is no current mandate to install
the latest package-manager, monorepo, compiler, linter, or formatter release.

## Commands and verification

`pnpm build` and `pnpm lint` retain their existing application behavior; the current
web lint task still invokes `next lint`. Root format/type/test gate scripts have
not been added. Do not describe target commands as implemented CI gates.

`pnpm --filter backend build` compiles the production Worker through Wrangler's
dry run. `pnpm --filter backend test:foundation` builds and runs the retained
compatibility fixture, import-boundary checks and local Worker/D1 checks. These do not deploy or validate all product journeys.
The evidence records explicit backend, protocol, and shared-data type commands.

Worker tooling is isolated in `config/workers`: Wrangler 4.148.0 uses Workers v5
types, while backend/shared code uses the compatible v4 types. The retained web
adapter keeps Wrangler 3.50.0 until its separately scoped migration.

## Configuration and secrets

Local development uses ignored environment files and explicit local bindings.
Deployed secrets are managed with the hosting provider. Secret-export CLI
integration and its workspace configuration have been removed at the owner's
instruction. Deployment scripts do not export production secrets or overwrite
local files, and the backend script does not forward local values with `--with-vars`.

Database generation and migrations are explicit operations. See the checked-in
[root scripts](../../package.json), [web scripts](../../apps/web/package.json),
[backend scripts](../../apps/backend/package.json), and [local setup](setup.md).
