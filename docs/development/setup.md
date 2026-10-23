# Local setup and recovery

[Docs home](../README.md) · [Develop Wodge](README.md)

Use Node >=22.19 (`.node-version`: 24.19.0) and pnpm 12.15.0. The frontend is Next.js 15, built for Workers with OpenNext. The backend is a Hono Worker with five SQLite-backed PartyServer objects. See the [source verification record](documentation-verification.md) for what was actually checked.

## Configure and start

1. Run `pnpm install --frozen-lockfile`.
2. Copy root `.env.example` to `apps/web/.env.local`. It contains public origins only; never put provider secrets there.
3. Create a Bitwarden Secrets Manager project with the keys listed in [the backend example](../../apps/backend/.dev.vars.example), and a read-only machine account limited to that project. Run `pnpm secrets setup` once per machine.
4. Set `BETTER_AUTH_SECRET` and `SECRET_KEY` to different strong values of at least 32 characters. Set all four Google/GitHub OAuth values. Both providers are mandatory in partial and ready modes. Register callbacks at `http://localhost:3000/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/github` for local development.
5. Run `pnpm init:app` to apply local D1 migrations.
6. Run `pnpm secrets run -- pnpm dev`, or separately `pnpm secrets run -- pnpm --filter backend dev` and `pnpm --filter web dev`.

Local web runs on port 3000 and backend on 8787. Next forwards `/api/*` to the Worker. Backend public values/bindings are in `apps/backend/wrangler.jsonc`; `APP_DOMAIN` and `BACKEND_DOMAIN` must be HTTP(S) origins without paths/trailing slashes. `AVATARS_URL` must be a URL even when uploads are disabled. Keep local and production OAuth apps/secrets separate.

`INTEGRATION_MODE=partial` allows storage and billing to be unconfigured. The corresponding operations fail as unavailable. `ready` additionally requires every R2 and Polar setting. It validates presence/configuration, not provider connectivity or production acceptance. Email sign-in is disabled; Resend and LiveKit are not prerequisites. `pnpm livekit` only starts a retained local server and does not enable calls.

## Local secrets

`pnpm secrets setup` prompts for the Bitwarden project ID and machine-account token.
The script stores the token and downloaded secrets in macOS Keychain, Windows
Credential Manager (WSL/Git Bash) or a Linux Secret Service keyring. Clones and
worktrees share these entries. A supported, available OS credential store is required.

`scripts/secrets.sh` is self-contained and application-neutral:

| Command                         | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `pnpm secrets setup`            | Store or replace the project ID and token, then refresh        |
| `pnpm secrets refresh`          | Download the current secrets from Bitwarden into the store     |
| `pnpm secrets list`             | List stored secret names, never values                         |
| `pnpm secrets run -- <command>` | Run a command with the stored secrets as environment variables |
| `pnpm secrets forget`           | Delete the stored token and secrets                            |

Only `setup` and `refresh` contact Bitwarden; they install a checksum-pinned
`bws` CLI when it is missing. `run` needs neither `bws` nor network access. After
changing a secret in Bitwarden, run `pnpm secrets refresh` and restart the
command. Secrets are base64-encoded `KEY=VALUE` records inside the credential
store and are never written to files.

Entries are named `bws/<package.json name>/token` and `.../secrets`, with
numbered `#n` continuation entries for large values; set `BWS_APP` to choose
another name, `BWS_CREDENTIAL_STORE` (`macos`, `windows` or `secret-service`) to
override detection, `BWS_INSTALL_DIR` to change where `bws` is installed
(default `~/.local/bin`), and `BWS_SERVER_URL` for EU or self-hosted Bitwarden.

`run` sets `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` so Wrangler reads the secrets
from the environment, and refuses to start while a `.dev.vars` file exists
because Wrangler would silently prefer it. Wrangler then exposes the whole local
process environment to the Worker in local development only; deployments are
unaffected. The access token is removed from the launched process environment.

Machine-account access tokens are valid until they expire or are revoked. An
expired token only affects `refresh`, which stops with an explanation: create a
new token for the machine account, then run `pnpm secrets setup`. Failed
refreshes, including network or server errors, leave the stored secrets
unchanged, so `run` keeps working.

## Optional storage and sandbox billing

For uploads, configure `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY` and the avatar public origin. The backend creates private workspace buckets through the S3 API. Workspaces created without storage credentials need their buckets provisioned before enabling uploads. Both `attachments` and `avatars` flags default to disabled; configure storage before enabling them through the [flag runbook](../operations/runbooks/feature-flags.md). Flags and credentials are independent requirements.

For billing, create a Polar sandbox organization/product and set `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID` and `POLAR_WEBHOOK_SECRET`. The backend always selects the sandbox. Configure a Raw-format webhook for `subscription.*` at `<APP_DOMAIN>/api/auth/polar/webhooks`; local delivery needs a public tunnel to the backend. Apply all D1 migrations, including the Polar cutover, before accepting events. Use sandbox test payments only.

Workspace administrators can start checkout. Only the purchasing administrator can open the customer portal. A checkout redirect does not grant Pro: the signed webhook triggers a fresh Polar subscription read and an authoritative entitlement update. Duplicate/conflicting deliveries are handled by the backend; unresolved same-millisecond subscription replacements need explicit reconciliation. There is no automated reconciliation queue. [Backend billing details](../../apps/backend/README.md#billing-event-processing) explain retry behavior.

No MCP clients are supported. MCP transport/tools are deferred to milestone 2. Calls, hosted generation and standalone resource libraries remain unavailable even if their database flags are set to enabled.

## Verification and commands

```sh
pnpm lint
pnpm format:check
pnpm check:boundaries
pnpm --filter web typecheck
pnpm --filter backend test:api
pnpm --filter backend test
pnpm --filter backend test:foundation
pnpm --filter backend test:runtime
pnpm --filter backend build
pnpm --filter web workers:build
```

These are commands to run, not a claim they all passed at this revision. Runtime suites exercise local Workers/D1/objects with mocked provider boundaries. A dry-run build does not deploy. Use [the walkthrough](showcase-walkthrough.md) for manual checks and [testing strategy](testing-strategy.md) for the full inventory.

`pnpm generate` generates migrations; `pnpm init:app` applies existing local migrations. `pnpm reset:app` deletes both apps' local Wrangler state and local data. Do not use it to repair a shared or production database.

## Limits and recovery

- Configuration errors name invalid fields without values. Correct settings in Bitwarden, refresh and restart. Missing OAuth settings prevent startup even in partial mode.
- For missing tables, apply local migrations. For a provider outage, keep user input/pending edits, retry after recovery and check authoritative state before repeating a write. Do not clear IndexedDB to fix a routine sync failure: it may contain unacknowledged work.
- Replicache pending edits are not confirmed saves. On session expiry, sign in again through the recovery action. Backend permissions still decide whether queued mutations can apply. Revoked access must not be bypassed to recover an edit.
- Flag read failures retain a last-known-good snapshot for at most 60 seconds from the successful read, then close product capabilities. Restore D1 access and allow refresh; do not bypass the guard. A flag does not revoke already downloaded data or erase local copies.
- Free/Pro member limits are 10/50. Downgrades preserve existing members and limit new joins. Full storage quotas and a monetary cost ceiling are not implemented. Provider budgets, alerts and spend review are operator responsibilities; sandbox billing does not make Cloudflare usage free.
- Calls/generation are unavailable, and uploads default off to bound exposure. Permission polling, D1-backed flag checks, WebSockets and object activity still consume resources. There is no verified public-load or operating-cost result for this revision.
- Code rollback does not restore D1 or object state. Yjs supports current-state recovery, not document history; a D1 restore cannot restore object SQLite. Preserve data and use a schema-compatible forward fix where required. Never revert to stale KV-only code after SQL import.

## Deployment boundary

Follow the [production runbook](../operations/runbooks/production-deployment.md) for authorized deployment. Cloudflare Workers Builds deploys the application from `main`; GitHub Actions runs CI only. Backend deployment applies remote D1 migrations before publishing. Production secrets stay in Cloudflare. The docs Worker has its own build/watch settings. Local setup never performs those production actions.

Cloudflare Git integration can deploy independently of GitHub Actions. Use the supported `[skip ci]` commit prefix or confirm automatic builds are paused before a push that must not deploy; see [CI/CD skip controls](../operations/ci-cd.md#pushes-without-cicd). Arbitrary external automation still needs its own verification. There is no live demo link here until deployment verification is recorded. Historical baseline/browser records retain their original revision-specific limits.
