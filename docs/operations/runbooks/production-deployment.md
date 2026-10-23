# Production deployment: wodge.amr21.dev

[Docs home](../../README.md) · [Operate Wodge](../README.md)

The showcase runs on Cloudflare under the `amr21.dev` zone. Every deployment still
needs owner approval for the exact reviewed commit; see
[deployment authorization](revival-deployment.md). Calls stay disabled and do not
need LiveKit settings.

## Topology

One public origin, `https://wodge.amr21.dev`, serves both applications:

| Path                   | Served by                                                              |
| ---------------------- | ---------------------------------------------------------------------- |
| `/api/*`, `/parties/*` | Worker `wodge-backend` through routes in `apps/backend/wrangler.jsonc` |
| `/health`              | Worker `wodge-backend` (JSON liveness check)                           |
| Everything else        | Pages project `wodge` (Next-on-Pages build of `apps/web`)              |

Worker routes run before the Pages custom domain, so auth cookies, OAuth callbacks
and WebSockets stay first-party. The web middleware fetches `/api/users/me` on the
same hostname; `global_fetch_strictly_public` in `apps/web/wrangler.toml` sends that
subrequest through the zone so the Worker route handles it. `workers_dev` is off.

Avatars are public objects in the R2 bucket `avatars`, served from the R2 custom
domain `https://wodge-avatars.amr21.dev`. Workspace files use private per-workspace
buckets that the backend creates through the S3 API.

R2 is not provisioned yet (it requires a payment method). Until it is, deploy with
`INTEGRATION_MODE:partial` and leave the `R2_*` secrets unset. Migration
`0010_feature_flag_registry.sql` and the seed start the `attachments` and `avatars`
flags disabled, so the UI shows uploads as disabled and the backend refuses them. To
enable storage, add the `R2_*` secrets, deploy with `INTEGRATION_MODE:ready`, and run
in the D1 console:

```sql
UPDATE feature_flags SET enabled = 1 WHERE key IN ('attachments', 'avatars');
```

## Resources

| Resource                   | Name / value                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| D1 database (binding `DB`) | `wodge`; its ID is checked into `apps/backend/wrangler.jsonc`                                |
| SQLite Durable Objects     | `UserServer`, `WorkspaceServer`, `RoomServer`, `ThreadServer`, `PageServer` (migration `v1`) |
| R2                         | `avatars` (public custom domain) plus backend-created workspace buckets                      |
| Pages project              | `wodge`, production branch `main`, custom domain `wodge.amr21.dev`                           |

The production database and objects started empty. No data was migrated from the
earlier PartyKit or Supabase deployment.

## Configuration

Public Worker variables are passed with `wrangler deploy --var`. The web build
receives the same values as `NEXT_PUBLIC_*` at build time.

| Worker variable    | Web build variable           | Production value                               |
| ------------------ | ---------------------------- | ---------------------------------------------- |
| `APP_DOMAIN`       | `NEXT_PUBLIC_APP_DOMAIN`     | `https://wodge.amr21.dev`                      |
| `BACKEND_DOMAIN`   | `NEXT_PUBLIC_BACKEND_DOMAIN` | `https://wodge.amr21.dev`                      |
| `AVATARS_URL`      | `NEXT_PUBLIC_AVATARS_URL`    | `https://wodge-avatars.amr21.dev`              |
| `INTEGRATION_MODE` | —                            | `partial` until R2 is configured, then `ready` |

Worker secrets (names and purposes are in `apps/backend/.dev.vars.example`):

- `BETTER_AUTH_SECRET`, `SECRET_KEY`: production-only random values (32+ characters,
  different from each other and from development).
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`: redirect URI
  `https://wodge.amr21.dev/api/auth/callback/google`.
- `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`: a production GitHub OAuth app with callback
  `https://wodge.amr21.dev/api/auth/callback/github`.
- `R2_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`), `R2_ACCESS_KEY`,
  `R2_SECRET_KEY`: an R2 API token with Object Read & Write and bucket creation.
- `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`: Polar **sandbox** organization token and
  Pro product.
- `POLAR_WEBHOOK_SECRET`: from a sandbox webhook endpoint
  `https://wodge.amr21.dev/api/auth/polar/webhooks` (Raw format, `subscription.*`).

The Worker validates this configuration on its first request. A missing or malformed
value returns errors naming the setting, never its value.

### GitHub Actions

`Production Deploy` (`.github/workflows/deploy.yml`) runs from the `production`
environment. Configure required reviewers on it so each run waits for approval.

| Kind     | Name                                          | Value                                                           |
| -------- | --------------------------------------------- | --------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_ACCOUNT_ID`                       | Cloudflare account ID                                           |
| Secret   | `CLOUDFLARE_API_TOKEN`                        | Workers Scripts/Routes, D1, Pages: Edit; Account Settings: Read |
| Secret   | `BACKEND_SECRETS`                             | JSON object holding the Worker secrets listed above             |
| Variable | `APP_DOMAIN`, `BACKEND_DOMAIN`, `AVATARS_URL` | Production values above                                         |

## Continuous integration

`Code Quality` (`.github/workflows/quality.yml`) runs on pull requests and pushes to
`main`/`dev`:

- `quality`: lint and format checks on every change, including documentation.
- `scope`: decides whether the change is documentation-only (every path, including
  both sides of a rename, under `docs/`).
- `application`: boundaries, type checks, API contract, Vitest suites (including the
  feature-flag suite), local Worker
  runtime checks, the backend dry-run build and the Pages build. Skipped for
  documentation-only changes.
- `result`: the stable required check; it passes when the jobs above pass or are
  skipped.

The deploy workflow calls the same workflow first, then applies D1 migrations, sets
Worker secrets, deploys the Worker, builds and deploys Pages, and checks `/health`
and `/login`.

## Cloudflare Git integration (dashboard)

The owner-preferred setup builds both units in Cloudflare from the production branch.

**Pages** (`Workers & Pages → Create → Pages → Connect to Git`): project `wodge`, root
directory `apps/web`, build command `pnpm pages:build`, output `.vercel/output/static`,
and production variables `NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_BACKEND_DOMAIN`,
`NEXT_PUBLIC_AVATARS_URL`, `NODE_VERSION=24.19.0` and `PNPM_VERSION=12.15.0`. Add the
custom domain `wodge.amr21.dev` after the first successful build.

**Worker** (`Workers & Pages → Create → Workers → Import a repository`): name
`wodge-backend`, root directory `apps/backend`, no build command, build variables
`NODE_VERSION=24.19.0` and `PNPM_VERSION=12.15.0`, and this deploy command:

```sh
pnpm exec wrangler d1 migrations apply wodge --remote && pnpm exec wrangler deploy --var APP_DOMAIN:https://wodge.amr21.dev --var BACKEND_DOMAIN:https://wodge.amr21.dev --var AVATARS_URL:https://wodge-avatars.amr21.dev --var INTEGRATION_MODE:partial
```

Pass the public variables on the command line: each deploy replaces dashboard
variables with the local defaults in `wrangler.jsonc`, while secrets persist. Add the
secrets under `wodge-backend → Settings → Variables and Secrets` as type Secret, then
redeploy. Routes come from `wrangler.jsonc`.

## Manual deployment

For a first deployment or when Git builds are unavailable, run the following from a
clean checkout of the reviewed commit, logged in with `wrangler login`:

```sh
pnpm install --frozen-lockfile
pnpm --filter backend db:migration:cloud
cd apps/backend
pnpm exec wrangler secret bulk secrets.json
pnpm exec wrangler deploy \
  --var APP_DOMAIN:https://wodge.amr21.dev --var BACKEND_DOMAIN:https://wodge.amr21.dev \
  --var AVATARS_URL:https://wodge-avatars.amr21.dev --var INTEGRATION_MODE:partial
cd ../web
NEXT_PUBLIC_APP_DOMAIN=https://wodge.amr21.dev NEXT_PUBLIC_BACKEND_DOMAIN=https://wodge.amr21.dev \
  NEXT_PUBLIC_AVATARS_URL=https://wodge-avatars.amr21.dev pnpm pages:build
pnpm exec wrangler pages deploy .vercel/output/static --project-name wodge --branch main
```

Delete `secrets.json` afterwards. Run the web build from a regular clone: Vercel CLI
33 cannot read a git worktree's `.git` file. `apps/web/scripts/build-pages.mjs` runs the
pinned `vercel` CLI itself, so next-on-pages does not download a newer, incompatible one.

## Smoke checks

1. `curl https://wodge.amr21.dev/health` returns `{"ok":true}`.
2. Sign in with Google and with GitHub; complete onboarding.
3. Create a workspace, open a room and a page in two browsers, and confirm live updates.
4. Upload an avatar; it loads from `wodge-avatars.amr21.dev`.
5. Start a sandbox checkout, pay with a Polar test card, and confirm the webhook
   delivery succeeds and the workspace shows the Pro plan.

## Recovery

- **Web:** in Pages → `wodge` → Deployments, roll back to the previous production
  deployment. Static output has no state.
- **Worker:** `pnpm exec wrangler rollback` from `apps/backend` (or Workers → `wodge-backend` → Deployments). A code rollback does
  not reverse D1 migrations or Durable Object state.
- **D1:** migrations are forward-only. Before a risky migration, note the time; Time
  Travel can restore the database:
  `wrangler d1 time-travel restore wodge --timestamp <RFC3339>` (30-day window). Then
  redeploy the Worker that matches the restored schema.
- **Durable Objects:** state is stored inside each object and cannot be restored with D1.
  Deploy a fix forward instead of rolling back past a storage format change.
- **Secrets:** rotate with `wrangler secret put <NAME>`. Rotating `BETTER_AUTH_SECRET`
  signs everyone out; rotating `SECRET_KEY` invalidates outstanding realtime tickets.
- **Routing outage:** delete the Worker routes to fall back to Pages only (the app
  then shows its unavailable page) while the backend is fixed.
