# CI/CD and deployment boundaries

[Docs home](../README.md) · [Operate Wodge](README.md)

## Checked-in automation

[Code Quality](../../.github/workflows/quality.yml) runs on pull requests and pushes to `main`/`dev`. It always installs dependencies and runs lint/format checks. For application changes it also runs boundaries, types, API contracts, tests, local Worker runtime checks and both Worker builds. Its final `quality` job checks the validation/build outcomes.

The implemented documentation exemption applies only when every changed path is under `docs/`, counting both sides of a rename. It skips application type/test/build jobs, while lint/format and the final result still run. Root `README.md` changes are outside this exemption. This describes actual workflow behavior; older policy records requesting a broader exemption are not evidence that it is enforced.

[Production Deploy](../../.github/workflows/deploy.yml) is manually dispatched for a selected ref. It calls the same quality workflow with full validation/builds, then uses the `production` environment for remote migrations, Worker secrets and deployment of both backend and OpenNext frontend. Configure required reviewers on that environment. The checks job runs before environment approval; production mutation steps belong to the environment-gated deploy job. DNS, OAuth provider setup and initial resources remain operator responsibilities.

## Pushes without CI/CD

When the owner requests a push without CI/CD, use a commit message prefixed with `[skip ci]`, push the task branch and do not dispatch a workflow. Creating a pull request can create additional automation events; it is not part of a push-only request. Do not change workflow configuration just to deliver documentation.

Cloudflare Git integration is independent of GitHub Actions. [GitHub skip instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs) cover push/pull-request workflows; [Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#skipping-a-build-via-a-commit-message) documents a `[skip ci]` prefix, and the [Cloudflare Workers SDK maintainer response](https://github.com/cloudflare/workers-sdk/discussions/13216) confirms Workers Builds support. These controls do not stop a manual deployment or arbitrary third-party automation. Confirm branch/build settings where necessary; record unverified external automation separately.

## Approval, verification and recovery

An explicit owner request authorizes its specified push; it does not authorize deployment, remote D1 migration, secret rotation or provider/resource changes. Check remote branch movement and push without force. A production action needs explicit authorization for the reviewed revision and configuration.

See [the production runbook](runbooks/production-deployment.md) for topology, manual procedures and schema-aware recovery. Code rollback does not reverse D1 migrations or Durable Object state. Passing CI/liveness checks does not establish full application acceptance; record the deployed revision and manual journey results separately.

The [source verification record](../development/documentation-verification.md) distinguishes checked-in automation from remotely verified enforcement, deployments and costs.
