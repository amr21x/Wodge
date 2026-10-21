# Local and deployed environments

[Docs home](../README.md) · [Operate Wodge](README.md)

The backend implementation uses a Hono Worker, PartyServer Durable Objects, Better
Auth and D1. Authentication can start fresh. Existing application data is not deleted
or silently relinked. No remote deployment or resource migration was performed.

## Local configuration

Copy the public root `.env.example` to `apps/web/.env.local`. Backend secrets
named in `apps/backend/.dev.vars.example` come from Bitwarden Secrets Manager
through the OS credential store and `pnpm secrets run`; see [local secrets](../../README.md#local-secrets). Production and
local Worker bindings are defined in `apps/backend/wrangler.jsonc`; the separate
foundation configuration remains a compatibility fixture. Web has no D1 binding
or backend secrets. See [setup](../development/setup.md).

## Deployment boundary

The web UI remains Next-on-Pages. Backend now owns authentication, application
APIs, billing and scoped collaboration. Supabase and the PartyKit CLI have been
removed from active application code. Provider credentials, callback registrations,
web-origin API routes and existing Durable Object/Yjs data cutover remain external
setup work. The manually triggered deployment workflow uses Wrangler.

Secrets belong in Cloudflare-managed bindings. The backend uses `BETTER_AUTH_SECRET`
for sessions and `SECRET_KEY` for internal calls and signed, session-bound tickets.
Google/GitHub credentials and payment/storage credentials stay out of web.
The production public auth base URL is `APP_DOMAIN` with `/api/auth/*` routed to
the Worker. Existing PartySocket hosts can keep using the backend hostname.

## Verification limits

Actual local Worker compilation and D1 fixture results do not validate production
sessions, MCP authorization, collaboration persistence, browser journeys, usage,
or operating cost. The current project requires bounded operating cost, but this
page does not adopt numerical budgets or dates from unrelated project records.

Production validation, deployment permission, and any recovery plan must be recorded
for the actual reviewed deployment. A build pass does not authorize deployment.
