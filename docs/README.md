# Wodge documentation

Wodge is a local-first collaborative workspace for team conversations, shared pages, and task coordination, created as a graduation project and now being revived as a portfolio showcase.

## Start here

| Read                                   | What you will find                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| [Explore Wodge](product/README.md)     | Understand the product, collaboration model, and portfolio context.                |
| [Develop Wodge](development/README.md) | Start locally and find architecture, design, specifications, and testing guidance. |
| [Operate Wodge](operations/README.md)  | Find environment, deployment, debugging, and maintenance guidance.                 |

Only [AMR21 / Wodge Revival & Enhancements](https://linear.app/amr21/project/wodge-revival-and-enhancements-ee86a6345a5d) governs active delivery. The [current project scope](development/documentation.md) distinguishes retained behavior, necessary migrations, and deferred work.

Retain the existing Next.js/Tailwind/Radix application and product behavior. Backend PartyServer/Better Auth/D1 and minimal member-controlled MCP are current migration goals. Calls and hosted generation are to be disabled; broader framework/tooling/UI redesign and call restoration are deferred. See the [backend foundation record](development/backend-foundation.md) and [baseline](development/baseline.md) for actual observations and limits.

## Features

Browse the current portfolio scope and retained UI for each capability. Specifications describe intended behavior; they are not proof of integrated acceptance or deployment.

| Feature                                                                 | Requirements                                   | Design                                             | Delivery approach                             |
| ----------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| [Workspace Setup & Membership](features/workspace-membership/README.md) | [spec](features/workspace-membership/spec.md)  | [design](features/workspace-membership/design.md)  | Existing Linear issues + shared process       |
| [Teams & Shared Spaces](features/teams-shared-spaces/README.md)         | [spec](features/teams-shared-spaces/spec.md)   | [design](features/teams-shared-spaces/design.md)   | Existing Linear issues + shared process       |
| [Team Roles & Access](features/team-roles-access/README.md)             | [spec](features/team-roles-access/spec.md)     | [design](features/team-roles-access/design.md)     | Existing Linear issues + shared process       |
| [Agent Access](features/agent-access/README.md)                         | [spec](features/agent-access/spec.md)          | [design](features/agent-access/design.md)          | [plan](features/agent-access/plan.md)         |
| [Discussions & Messaging](features/discussions-messaging/README.md)     | [spec](features/discussions-messaging/spec.md) | [design](features/discussions-messaging/design.md) | Existing Linear issues + shared process       |
| [Room Calls](features/room-calls/README.md)                             | [spec](features/room-calls/spec.md)            | [design](features/room-calls/design.md)            | [plan](features/room-calls/plan.md)           |
| [Pages & Embedded Tasks](features/pages-embedded-tasks/README.md)       | [spec](features/pages-embedded-tasks/spec.md)  | [design](features/pages-embedded-tasks/design.md)  | [plan](features/pages-embedded-tasks/plan.md) |
| [Demo Billing & Limits](features/demo-billing-limits/README.md)         | [spec](features/demo-billing-limits/spec.md)   | [design](features/demo-billing-limits/design.md)   | Existing Linear issues + shared process       |

## Engineering references

- [Architecture and data](architecture/README.md)
- [Shared design](design/README.md)
- [Engineering decisions](decisions/README.md)
- [Documentation workflow and historical evidence](development/documentation-workflow.md)

Detailed implementation, deployment, and maintenance work stays in Linear.

Read these pages directly in GitHub. To propose an edit, use the page’s pencil button and the repository review process; see the [documentation workflow](development/documentation-workflow.md).

- [Database-controlled feature flags](operations/runbooks/feature-flags.md) — capability coverage, propagation, and recovery.
