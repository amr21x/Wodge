# CI/CD and deployment gates

[Docs home](../README.md) · [Operate Wodge](README.md)

## Continuous integration

[Code Quality](../../.github/workflows/quality.yml) runs on pull requests and pushes
to `main` and `dev`. It runs lint and formatting, then application type checks,
boundary checks, tests and Worker builds for application changes. The required
`quality` check stays present for documentation-only changes.

A change is documentation-only when every changed path is under `docs/` or ends in
`.md`. CI still checks lint and formatting, but skips application checks and builds.
Both sides of a rename count; moving application code out of `docs/` runs full CI.

## Continuous deployment

Cloudflare Workers Builds owns deployment through its GitHub app. Connect each
existing Worker to `amr21x/Wodge`, use `main` as the production branch, and disable
non-production builds. GitHub Actions does not deploy and needs no Cloudflare secrets.

For both Workers, set build watch paths to include `*` and exclude `docs/*`, `apps/docs/*` and
`*.md`. Documentation-only pushes then skip builds and deployment; mixed changes
still deploy. Cloudflare can bypass path filtering for empty pushes, 20+ commits,
or 3000+ changed files. See [Cloudflare's rules](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/).

Installing the GitHub app alone does not connect the Workers or configure their
build watch paths. The [production runbook](runbooks/production-deployment.md) lists
the exact commands, variables and dashboard settings for both Workers.

## Release and recovery

The owner authorizes automatic deployment from `main`. Cloudflare builds run
independently of GitHub Actions, so retain required PR checks and branch protection
before merging. Each Worker deploys independently; its build must succeed before
its deploy command runs. Backend migrations run before backend deployment.

Production Worker secrets remain in Cloudflare. Code rollback does not reverse D1
or Durable Object state changes. Follow the [production recovery instructions](runbooks/production-deployment.md#recovery).

## Independent documentation Worker

The `wodge-docs` project serves `/docs` from `apps/docs`. Connect this existing
Worker separately when enabling its Git builds. Use production branch `main`,
disable non-production builds, root `apps/docs`, build command
`pnpm test && pnpm typecheck && pnpm build`, and deploy command
`pnpm exec wrangler deploy`.

Its watch paths must include `docs/*`, `apps/docs/*`, `package.json`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml` and `.node-version`, with no Markdown
exclusion. Unlike the application Workers, documentation changes must rebuild this
site. See [docs publication](../development/docs-site.md) for routing and recovery.

## Pushes without CI/CD

A task-branch push requested without CI/CD uses a `[skip ci]` commit prefix and
does not start a build manually. This does not disable future production builds
from ordinary merges into `main`. Cloudflare build connections and path filters
are dashboard/API settings; repository configuration alone does not install them.
