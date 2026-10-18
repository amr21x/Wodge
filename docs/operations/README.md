# Operate Wodge

[Docs home](../README.md)

Use the existing environment and release guidance to prepare operational work. These pages describe procedures and readiness requirements; they do not establish that a live revival deployment exists.

| Read                                                              | What you will find                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Environments and runtime topology](environments.md)              | Environment responsibilities and runtime topology.                   |
| [CI/CD and deployment gates](ci-cd.md)                            | Recorded pipeline behavior, approved gates, and gaps in enforcement. |
| [Release policy](release-policy.md)                               | Release readiness, approval evidence, and rollback expectations.     |
| [Revival deployment coordination](runbooks/revival-deployment.md) | Additional deployment coordination for the revival.                  |
| [Observability](observability.md)                                 | Operational visibility, diagnostics, and observability gaps.         |
| [Maintenance and feedback](maintenance.md)                        | Maintenance expectations and the feedback process.                   |

## Troubleshoot and verify

- [Observability](observability.md) — diagnostics and visibility.
- [Failure inventory](../development/failure-inventory.md) — failure boundaries and current error contracts.
- [Smoke-test matrix](../development/smoke-test-matrix.md) — checks for retained journeys and recovery.
- [Local setup](../development/setup.md) — reproduce the application environment.
- [Execution project](https://linear.app/amr21/project/wodge-revival-and-enhancements-ee86a6345a5d) — operational delivery work.

Follow the applicable approval gates before provisioning, deployment, recovery, or other production actions.
