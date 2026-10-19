# Backend foundation evidence

[Docs home](../README.md) · [Develop Wodge](README.md)

Recorded 2026-10-16. The owner confirmed starting checkout
`17b723acc4444f55621eb791edc967f94975cb80`. This is a local, uncommitted candidate;
no push, deployment, remote resource provisioning, or Linear completion is claimed.
The [machine-readable evidence](backend-foundation-evidence.json) identifies checked source
files, their hashes, selected installed versions, commands, and output signatures.

## Scope authority

Only AMR21 / Wodge Revival & Enhancements and its own foundation work description,
direct owner instructions, and actual local executions support this record.
See the [verified project scope](documentation.md). Imported tooling documents and
approval labels from another workspace/project are excluded. No linter, formatter,
or broad compiler/framework modernization was implemented or approved by this record.

## Implementation

- `@repo/data` exposes neutral schemas, keys, shared helpers, and compatible domain
  mutations. Browser constructors, QueryClient-dependent mutators, and browser
  helpers are exposed by `@repo/data/browser`.
- `@repo/data/server` creates database/model operations from an explicit D1 binding.
  Importing the package does not read request context or initialize a global DB.
  Browser exports reject the server/database modules. Worker and server conditions
  take precedence over the browser condition used by Wrangler bundling.
- `apps/web/src/lib/data-server.ts` keeps the retained Next-on-Pages request access
  inside the web application. Its lazy DB callback preserves the existing model
  operations and their error-handling boundaries. Existing route/action callers
  use this adapter; their permission checks and response contracts are retained.
- `apps/backend/src/lib/data-server.ts` receives an explicit `DB` binding. These
  are persistence operations, not authorization endpoints. Existing backend
  permission checks remain authoritative and unchanged.
- `@repo/backend-protocol` isolates Better Auth/MCP/adapter dependencies, JOSE 6,
  and Zod 4. Existing domain schemas, Replicache validation, and retained AI SDK
  consumers continue using their existing Zod 3 and JOSE 5 dependencies.
- Backend/shared packages use Workers types `4.20260424.1`; `@repo/worker-tools`
  uses Wrangler `4.148.0` and Workers types `5.20261006.1`. No global peer override
  or peer-warning suppression is used. The retained web adapter keeps Wrangler
  `3.50.0` until the retained web adapter migration. ORM and Kit are pinned to `0.45.2` and `0.31.4`.
- The Node requirement is `>=22.19.0`, with `.node-version` selecting `24.19.0`.
  Executions here used Node `24.19.0` and pinned pnpm `9.4.0`.
- At the owner's additional instruction, Infisical configuration and secret-pull
  scripts were removed. Deployment scripts no longer export secrets or overwrite
  environment files; the backend script no longer passes `--with-vars`. Local
  ignored files and provider-managed deployed secrets replace those assumptions.
  No secret values or provider configuration were migrated remotely.

## Dependency resolution and provenance

Direct public npm metadata confirmed PartyServer `0.5.10`, y-partyserver `2.2.0`,
Better Auth/core/MCP/OAuth provider/Drizzle adapter `1.7.8`, Drizzle ORM `0.45.2`,
Kit `0.31.4`, and protocol Zod `4.5.4`. The exact installed versions are recorded
in the evidence JSON. The transitive Miniflare `5.20261006.0-alpha` is selected by
the pinned Wrangler, rather than independently selecting a latest Miniflare.

Full workspace resolution/fetch encounters HTTP 403 from the retained premium
Tiptap registry with no authorization header. The editor implementation and all
original private dependency declarations, integrity metadata, and private package
snapshots are preserved. No extension was removed, replaced, or stubbed.

To resolve the accessible graph, a temporary manifest-only copy excluded the four
private direct dependencies. The original private importer entries and their
snapshot dependency closure were then restored to the generated lockfile. A
structural comparison against `17b723a` confirms that every private package record
is unchanged. The public resolution reported no peer warnings; existing package
deprecation warnings remain. This method does not verify private registry access
or prove a complete clean application install.

The full frozen install accepted the manifest/lockfile match, then failed fetching
a private tarball. A separate source-identical backend snapshot omitted only the
web importer from the lockfile and omitted the web application from the workspace.
Its frozen install passed, including a final offline install. Installation used
`--ignore-scripts`; a full lifecycle-enabled installation is **Unverified**.
Its source hashes match the checked candidate. No ignored environment files or
application secrets were copied into the snapshot.

The host's inherited pnpm launcher fails before package-manager execution. Checks
invoked an existing pinned pnpm 9.4.0 CLI with the selected Node directly; this
work does not repair the user's global launcher.

## Executed results

**Pass:**

- Frozen backend-only installation and installed-version audit.
- Accessible graph peer resolution without peer warnings, and preservation of the
  original private package lock records and editor source.
- Type checking of `apps/backend` and `packages/backend-protocol` using TypeScript
  5.3.3 from the resolved graph. Explicit Workers type scopes resolve D1 typing
  without an unsafe cast or disabling library checks beyond the existing policy.
- Bundling all six retained backend entry points without Next request context.
- Neutral/browser import checks, including rejection of server/database/protocol
  imports in browser builds and absence of environment validation in backend bundles.
- Wrangler 4.148.0 local `deploy --dry-run` compilation of the foundation Worker:
  3673.24 KiB uncompressed / 618.84 KiB gzip. No deployment occurred.
- The local workerd/Miniflare fixture loads actual selected library imports,
  applies the three existing SQL migrations, reads users through the injected D1
  factory, and executes workspace/member/invite batch writes. Ten checks pass.
- Changed source/config formatting, targeted ESLint syntax/safety rules on 67
  changed source files, and `git diff --check`. The targeted lint configuration is
  recorded in JSON; it is not the repository's full lint gate.
- No remaining Infisical executable/configuration references, and no editor-source
  changes. The evidence documents the removed integration by name.

**Fail:**

- Complete credential-free workspace install: private Tiptap HTTP 403.
- `packages/data` type check: 16 diagnostics in the existing stale thread-test
  imports and `make-movement.ts` union/identifier handling. These match baseline
  B-05/B-07; no new D1 factory diagnostic remains. See [baseline](baseline.md).

**Unverified:**

- Complete workspace install with lifecycle scripts, full web build/type/lint
  gates, Next/OpenNext deployment compatibility, and integrated browser journeys.
- Production PartyServer routing/lifecycle migration, existing backend-to-web API
  calls, deployed D1 binding wiring, and application permission regression tests.
  The production router is still PartyKit; the new Worker is a local compatibility
  fixture, not a production migration. Continue through the production backend and retained web adapter migrations.
- Auth sessions, MCP OAuth/discovery/authorization, Yjs persistence/reconnect/viewer
  denial, provider behavior, and resource/budget acceptance. Importability is not
  proof of those feature criteria.

The local fixture uses synthetic records in an isolated local database. It tests
real shared code and real Worker/D1 execution, but is supporting foundation evidence
only; it does not replace milestone or feature acceptance.

Initial runtime attempts were blocked by sandbox loopback `EPERM`, then by an
incorrect temporary module root. The final run used permitted loopback access and
an explicit temporary module root and passed. Earlier failed attempts are not
reported as successful runs.

## Historical reproduction commands

These commands describe the captured checkout. The superseded foundation build
configuration has since been removed; use the current [backend commands](../../apps/backend/README.md#development)
for the maintained Worker build and compatibility checks.

With a working pinned pnpm 9.4.0 and Node >=22.19:

```sh
pnpm install --frozen-lockfile
pnpm --filter backend build:foundation
pnpm --filter backend test:foundation
pnpm exec tsc -p apps/backend/tsconfig.json --incremental false --pretty false
pnpm exec tsc -p packages/backend-protocol/tsconfig.json --incremental false --pretty false
pnpm exec tsc -p packages/data/tsconfig.json --incremental false --pretty false
```

The first command still requires authorized access to the retained premium
registry. `build:foundation` performs a dry run; the tests create and dispose an
isolated local Worker/D1 runtime and need loopback port access. The fixture's D1
identifier is a local placeholder. No command here provisions production resources.
