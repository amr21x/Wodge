# Wodge

**A local-first collaborative workspace for team communication, knowledge management, and task coordination.**

Read the [repository documentation and feature index](docs/README.md) for the revival specifications, architecture, engineering guidance, and migration review status. The implementation and walkthrough below describe the capstone baseline; the revival targets are not claimed complete.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Replicache](https://img.shields.io/badge/Replicache-local--first-6E56CF)](https://replicache.dev/)
[![PartyKit](https://img.shields.io/badge/PartyKit-realtime-FF5D01)](https://www.partykit.io/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-auth-black)](https://better-auth.com/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

[![Watch the Wodge walkthrough](https://img.youtube.com/vi/IBZvqOu6Xro/maxresdefault.jpg)](https://youtu.be/IBZvqOu6Xro)

> Watch the [project walkthrough](https://youtu.be/IBZvqOu6Xro) for a complete product tour.

## Overview

Wodge is a collaborative workspace that brings structured team communication, real-time rooms, shared knowledge, and task management into one product. It was built as a five-member engineering capstone and received an **A+ evaluation**.

The project explores a local-first architecture in which users can interact with workspace data through responsive local state while synchronization is coordinated through Replicache and PartyServer Durable Objects. Collaborative documents use Yjs/CRDT-based editing, and live audio/video rooms are powered by LiveKit.

## Highlights

- **Local-first synchronization** using Replicache with separate synchronized models for workspaces, pages, threads, rooms, and users.
- **Real-time collaboration** through PartyServer Durable Objects and presence-aware workspace flows.
- **Collaborative documents** built with Tiptap and Yjs/CRDTs.
- **Team communication** through channels, threaded posts, comments, chat, polls, and audio/video rooms.
- **Embedded task management** with assignees, priorities, table views, and Kanban-style organization.
- **Workspace administration** including teams, groups, invitations, membership roles, and permission-aware interfaces.
- **Monorepo architecture** using Turborepo, pnpm workspaces, shared TypeScript configuration, and shared data models.

## Product Capabilities

### Workspaces and access

- Create and join workspaces through invitation flows.
- Organize members into teams and groups.
- Manage workspace, team, and group settings.
- Apply owner, administrator, moderator, and member-aware behavior.
- Track workspace presence and recently visited resources.

### Communication

- Create channels for threaded discussions and live rooms.
- Publish posts, comments, and Q&A-style content.
- Send, edit, and delete real-time room messages.
- Run polls inside collaborative flows.
- Join LiveKit-powered audio/video conferences with device and track controls.

### Knowledge and task management

- Create hierarchical workspace pages.
- Edit rich collaborative documents with Tiptap and Yjs.
- Add structured tasks directly inside documents.
- Manage task priorities, assignees, columns, table layouts, and Kanban views.
- Reorder tasks and columns through synchronized mutations.

## Architecture

```mermaid
flowchart LR
    U[Browser] --> W[Next.js web application]
    W --> A[Better Auth authentication]

    W --> R[Replicache clients]
    R <--> P[PartyServer Durable Objects]
    P --> E[Workspace, page, thread, room, and user state]

    W <--> Y[Tiptap + Yjs collaborative editor]
    Y <--> P

    W <--> L[LiveKit audio and video]
    W --> D[Drizzle data layer]
    D --> S[(SQLite / Cloudflare D1)]
    D --> D1[(Cloudflare D1)]
```

### Synchronization model

Wodge separates synchronized state by domain rather than treating the whole product as one global document. Workspace structure, threads, pages, rooms, and user state each have their own models and mutation flows. Replicache handles local-first reads and mutations, while PartyServer coordinates real-time synchronization and presence. Yjs is used specifically for collaborative rich-text editing.

## Technology

| Area                    | Technologies                                              |
| ----------------------- | --------------------------------------------------------- |
| Web application         | Next.js, React, TypeScript, Tailwind CSS, Radix UI        |
| Local-first data        | Replicache, shared mutation models, Zod validation        |
| Real-time backend       | PartyServer, WebSockets, presence-aware services          |
| Collaborative editing   | Tiptap, Yjs, y-partykit                                   |
| Audio and video         | LiveKit                                                   |
| Data layer              | Drizzle ORM, SQLite/Cloudflare D1                         |
| Authentication          | Better Auth                                               |
| State and data fetching | TanStack Query, Zustand, Jotai, Immer                     |
| Tooling                 | Turborepo, pnpm, Vitest, ESLint, Prettier, Wrangler       |
| Deployment              | Cloudflare Pages, Workers/Durable Objects, GitHub Actions |

## Repository Structure

```text
.
├── apps/
│   ├── web/          # Next.js application, UI, routes, editor, and API handlers
│   └── backend/      # PartyServer Durable Objects for workspace, room, thread, page, and user sync
├── packages/
│   ├── data/         # Shared schemas, models, mutations, keys, and database utilities
│   ├── env/          # Shared environment configuration
│   └── ts/           # Shared TypeScript configuration
├── config/           # Shared development configuration
└── .github/          # GitHub Actions workflows
```

## Getting Started

### Prerequisites

- Node.js 22.19 or newer (`.node-version` selects 24.19.0)
- pnpm 9
- A Linux-based development environment is recommended
- LiveKit Server for local audio/video development
- Accounts or local substitutes for the external services configured in `.env.example`

### Installation

```bash
git clone https://github.com/AMR-21/Wodge.git
cd Wodge
pnpm install
```

Create the application environment files:

```bash
cp .env.example apps/web/.env.local
cp apps/backend/.dev.vars.example apps/backend/.dev.vars
```

Backend owns the D1 binding in `apps/backend/wrangler.jsonc`. Web has public
configuration only; backend secrets live in its ignored `.dev.vars` file. Better
Auth supports email OTP, Google and GitHub. The web dev server forwards API calls
to the backend Worker. See [backend setup](apps/backend/README.md).

Production uses manually triggered Wrangler deployment. Namespace/data cutover,
provider credentials and web-origin routing must be configured before deployment.

Initialize the local application state and database:

```bash
pnpm init:app
```

Start LiveKit in a separate terminal when testing calls:

```bash
pnpm livekit
```

Start the monorepo:

```bash
pnpm dev
```

You can also run an individual workspace through Turborepo filtering:

```bash
pnpm dev --filter web
pnpm dev --filter backend
```

## Useful Commands

```bash
pnpm dev             # Start development services
pnpm build           # Build all workspaces
pnpm lint            # Run linting across the monorepo
pnpm lint:fix        # Apply safe lint fixes
pnpm format          # Format the monorepo
pnpm format:check    # Check formatting without writing files
pnpm generate        # Generate database artifacts
pnpm migrate:local   # Apply local database migrations
pnpm studio          # Open the database studio
pnpm reset:app       # Reset local generated Wrangler state
```

## Project Status

The public repository contains the capstone version of Wodge and is suitable for architecture review and local exploration. The codebase includes deployment automation for Cloudflare Pages and Workers, but a complete turnkey self-hosting guide is still being consolidated.

Some integrations require third-party credentials, including Better Auth OAuth providers, Resend, LiveKit, Cloudflare, and other optional services represented in `.env.example`.

## Team and Contribution

Wodge was built by a five-member team. **Amr Yasser served as Scrum Master and contributed across the majority of the monorepo**, including frontend development, backend services, synchronization flows, collaborative editing, and deployment tooling.

## License

Wodge is licensed under the [GNU Affero General Public License v3.0](LICENSE).

## Contact

For questions about the project or self-hosting status, contact [Amr Yasser](mailto:amryasseremam@gmail.com).
