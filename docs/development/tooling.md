# Development tooling

[Docs home](../README.md) · [Develop Wodge](README.md)

The monorepo uses Oxlint for linting and Oxfmt for formatting. Other runtime and
dependency choices retain the foundation described in the
[current scope](documentation.md) and [executed foundation evidence](backend-foundation.md).

## Runtime and package manager

Node.js must be >=22.19.0; `.node-version` selects 24.19.0. The package-manager pin
is pnpm 9.4.0. The host's inherited pnpm launcher failed during verification;
checks invoked an existing pinned CLI directly. This is not a global launcher repair.

## Tools

- TypeScript remains on the resolved 5.3.3 compiler.
- Oxlint 1.89.0 and Oxfmt 0.74.0 are pinned at the repository root. ESLint,
  Prettier and their plugins are no longer direct workspace dependencies.
- Turborepo remains on the retained 2.x dependency line.
- Vitest remains in the existing workspaces. Protocol-package peer compatibility
  uses its separately pinned version; it is not a repository-wide runner upgrade.

Other tooling modernization remains separately scoped; this migration does not
upgrade Next.js, React, TypeScript, pnpm or Turborepo.

## Commands and verification

Run these commands from the repository root:

- `pnpm lint` lints all workspaces and root scripts with one Oxlint invocation.
- `pnpm lint:fix` applies safe lint fixes.
- `pnpm format` writes formatting for supported source, config and documentation files.
- `pnpm format:check` checks the same files without modifying them.

The web workspace lint script forwards to the root command. Next.js 14 build-time
ESLint integration is disabled because linting runs separately. The Code Quality
workflow checks lint and formatting on pushes and pull requests, including docs-only
changes; these are source checks, not application build/test jobs. The manual Worker
deploy workflow runs both checks before configuring secrets or deploying.

The quality job skips dependency lifecycle scripts because it only runs source
checks. The Oxc tools use their installed platform bindings; application native
modules do not need to be built for linting or formatting.

`.oxlintrc.json` enables native TypeScript, React, Hooks, Next.js, accessibility,
import and general correctness rules. Correctness findings are warnings; Rules of
Hooks violations are errors. The lint command fails on either errors or warnings
now that the existing backlog has been cleaned up. React Compiler-specific checks are disabled because
this React 18 application does not use React Compiler. This is not exact ESLint rule
parity: the removed Cloudflare next-on-pages plugin's four provider-specific rules
and Turbo environment rule have no native replacement here. The retained Pages
adapter build remains the deployment compatibility check. The unused TanStack
plugin was installed but not enabled in the old configuration.

`.oxfmtrc.json` keeps the previous 80-column formatting and Tailwind class sorting
for `clsx` and `cn` using the web Tailwind v3 configuration. Import and package-key
sorting are disabled to preserve ordering. Generated outputs, dependencies,
coverage and the pnpm-managed lockfile are excluded; gitignored files are skipped.
The initial formatting pass establishes the baseline for the check command.

For VS Code, install the `oxc.oxc-vscode` extension. Workspace language settings use
it as the formatter; its lint integration reads the same root configuration.

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

## Intentional lint exceptions

Local Oxlint comments retain the existing Replicache subscription dependency contract,
mutable step counters, provider image URLs, and keyboard/event delegation around
embedded editors and composite controls. They name the rule and explain the constraint.
Uploaded audio/video and the demo currently have no caption-track contract; those
specific media elements remain documented accessibility limitations. No placeholder
caption tracks are generated to silence a lint rule.
