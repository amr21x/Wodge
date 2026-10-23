# Production deployment: wodge.amr21.dev

[Docs home](../../README.md) · [Operate Wodge](../README.md)

The configured showcase topology targets Cloudflare under the `amr21.dev` zone.
Live readiness at the currently reviewed source revision is Unverified; see the
[source verification record](../../development/documentation-verification.md). Every deployment still
needs owner approval for the exact reviewed commit; see
[deployment authorization](revival-deployment.md). Calls stay disabled and do not
need LiveKit settings.

## Topology

One public origin, `https://wodge.amr21.dev`, serves both applications:

| Path                   | Served by                                                              |
| ---------------------- | ---------------------------------------------------------------------- |
| `/api/*`, `/parties/*` | Worker `wodge-backend` through routes in `apps/backend/wrangler.jsonc` |
| `/health`              | Worker `wodge-backend` (JSON liveness check)                           |
| Everything else        | Worker `wodge-web` (OpenNext build of `apps/web`)                      |

Backend routes run before the frontend Worker custom domain, so auth cookies, OAuth callbacks
and WebSockets stay first-party. The web middleware fetches `/api/users/me` on the
same hostname in the browser. Server-side middleware and invite rendering use the
`BACKEND` service binding to `wodge-backend`: same-zone Worker routes cannot be
reached using ordinary `fetch`. Local Next.js development uses HTTP to the backend.
`workers_dev` is off for both production Workers.

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
| Frontend Worker            | `wodge-web`, production branch `main`, custom domain `wodge.amr21.dev`                       |

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
environment for deployment credentials. Configure required reviewers on it so each
deploy job waits for approval before remote migrations or deployment. The reusable
checks job runs validation/builds before this approval. Public origin variables
may be set at repository scope for CI and in the production environment for deployment.
If unset, the workflows use the production URLs listed above.

| Kind     | Name                                          | Value                                                    |
| -------- | --------------------------------------------- | -------------------------------------------------------- |
| Secret   | `CLOUDFLARE_ACCOUNT_ID`                       | Cloudflare account ID                                    |
| Secret   | `CLOUDFLARE_API_TOKEN`                        | Workers Scripts/Routes, D1: Edit; Account Settings: Read |
| Secret   | `BACKEND_SECRETS`                             | JSON object holding the Worker secrets listed above      |
| Variable | `APP_DOMAIN`, `BACKEND_DOMAIN`, `AVATARS_URL` | Production values above                                  |

## Continuous integration

`Code Quality` (`.github/workflows/quality.yml`) runs on pull requests and pushes to
`main`/`dev`:

- `validate`: detects documentation-only changes and always runs lint and formatting.
  For application changes it also runs boundaries, type checks, API contract tests,
  Vitest suites (including feature flags), and local Worker runtime checks.
- `build`: builds the backend and frontend Workers after validation, with cached
  pnpm downloads and Next.js build data. Skipped for documentation-only changes.
- `quality` (job ID `result`): preserves the existing required check name. Validation must pass; builds must
  pass for application changes and be skipped for documentation-only changes.

A documentation-only change means every changed path is under `docs/`, including
both sides of renames. Root Markdown, workflow changes and moves out of `docs/`
still run the full checks. Detection is a step in `validate`, not a separate job.

The manual deploy workflow calls these same jobs for the selected ref, always
running full validation and builds even if that ref only changes documentation.
After production approval, deployment builds the frontend Worker using the production variables,
applies D1 migrations, configures Worker secrets, builds and deploys the Worker
through Wrangler, deploys the frontend Worker, then checks `/health` and `/login`. Deployment
repeats builds deliberately so there are no artifact archives, transfers or workflow
outputs to coordinate.

## Cloudflare Git integration (dashboard)

The owner-preferred setup builds both units in Cloudflare from the production branch.

**Frontend Worker** (`Workers & Pages → Create → Import a repository`): name
`wodge-web`, repository `amr21x/Wodge`, production branch `main`, root directory
`apps/web`, build command `pnpm workers:build`, deploy command
`pnpm exec opennextjs-cloudflare deploy`. There is no dashboard output directory.
Set these **build variables**:

```text
NODE_VERSION=24.19.0
PNPM_VERSION=12.15.0
NEXT_PUBLIC_APP_DOMAIN=https://wodge.amr21.dev
NEXT_PUBLIC_BACKEND_DOMAIN=https://wodge.amr21.dev
NEXT_PUBLIC_AVATARS_URL=https://wodge-avatars.amr21.dev
```

Deploy the backend first so the `BACKEND` service binding can resolve. The frontend
Wrangler configuration declares its custom domain, assets and service bindings.
Authentication-driven pages remain dynamic; no R2 cache bucket is required for
this deployment. Existing PWA/service-worker behavior is retained.

If a Pages project already owns `wodge.amr21.dev`, first validate the Worker build,
then detach that custom domain from Pages and remove its existing CNAME before
attaching the Worker custom domain. Cloudflare cannot attach a Worker custom domain
over an existing CNAME. Disable the old Pages project's automatic deployments after
cutover. Keep the old project available for rollback until the Worker is verified.

**Backend Worker** (`Workers & Pages → Create → Import a repository`): name
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
  NEXT_PUBLIC_AVATARS_URL=https://wodge-avatars.amr21.dev pnpm workers:build
pnpm exec opennextjs-cloudflare deploy
```

Delete `secrets.json` afterwards. The frontend uses standard Next.js and OpenNext
CLI commands. It no longer depends on Pages, Vercel CLI, placeholder Vercel project
settings or custom build scripts. Builds work from normal clones and git worktrees.

## Smoke checks

1. `curl https://wodge.amr21.dev/health` returns `{"ok":true}`.
2. Sign in with Google and with GitHub; complete onboarding.
3. Create a workspace, open a room and a page in two browsers, and confirm live updates.
4. In partial mode, verify upload controls report disabled. Only after storage and
   flags are configured, upload an avatar and verify the configured public origin.
5. With Polar sandbox configured, start a sandbox checkout, use test payment data,
   and confirm the webhook
   delivery succeeds and the workspace shows the Pro plan.

## Recovery

- **Web:** in Workers & Pages → `wodge-web` → Deployments, roll back the frontend
  Worker. Its asset versions deploy with the Worker.
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
- **Backend routing outage:** removing the backend routes sends traffic to the
  frontend Worker, which has no backend API. Restore the routes or roll back the
  backend; route removal does not restore application functionality.
