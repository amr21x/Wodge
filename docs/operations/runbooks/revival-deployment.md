# Deployment authorization and evidence boundary

[Docs home](../../README.md) · [Operate Wodge](../README.md)

The [current project scope](../../development/documentation.md) authorizes local
preparation and verification, not a production deployment, push, or named release.
No inherited release plan from another project supplies that authorization.

A future deployment must identify its reviewed code/build, actual binding and secret
configuration, validated application journeys, unresolved failures, and explicit
owner authorization. Recovery must account for actual schema/state compatibility;
rolling back code does not reverse a database or Durable Object state change.

The [foundation evidence](../../development/backend-foundation.md) is local supporting
evidence only. Production routing, deployed bindings, full auth/MCP/collaboration
acceptance, and operating cost remain unverified. Calls and hosted generation are
to be disabled for the portfolio milestone; restored calls are not a release gate.
No numerical budget, delivery date, monitoring provider, or maintenance allocation
is adopted here from an unrelated project record.
