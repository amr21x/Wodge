# Deployment authorization and evidence boundary

[Docs home](../../README.md) · [Operate Wodge](../README.md)

The owner has authorized deployment to `wodge.amr21.dev` and automatic deployment
from `main` through Cloudflare Workers Builds. Required PR checks protect merges. Documentation-only changes skip deployment. Pull requests
and `dev` never deploy to production. See the [production runbook](production-deployment.md)
for the workflow and credential configuration.

Each deployment must identify its reviewed code/build, actual binding and secret
configuration, validated application journeys, unresolved failures, and the authorizing merge into `main` or manual Cloudflare build. Recovery must account for actual schema/state compatibility;
rolling back code does not reverse a database or Durable Object state change.

The [foundation evidence](../../development/backend-foundation.md) is local supporting
evidence only. Production routing, deployed bindings, full auth/MCP/collaboration
acceptance, and operating cost remain unverified. Calls and hosted generation are
to be disabled for the portfolio milestone; restored calls are not a release gate.
No numerical budget, delivery date, monitoring provider, or maintenance allocation
is adopted here from an unrelated project record.
