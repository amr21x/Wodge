# Hosted generation removal

[Docs home](../README.md) · [Develop Wodge](README.md)

Hosted AI generation is fully removed at the owner's instruction. This supersedes
plans to temporarily disable or quota it. Member-controlled MCP access remains a
separate feature and does not introduce a hosted model provider.

Removed the two workspace generation API handlers, writer/image extensions,
selection and slash-menu actions, message-editor prompt commands, shared action
schema, generation types/constants, node styles, and upgrade-page AI benefit.
There is no legacy disabled endpoint or writer placeholder. Previously generated
ordinary rich text remains ordinary document content.

Removed `@ai-sdk/openai`, `ai`, and `partykit-ai` from both application manifests,
their unused lockfile dependency closure, the example provider key, and the unused
Cloudflare AI binding declaration. No deployed provider secrets were inspected or
changed.

## Local verification

Recorded 2026-10-16 using Node 24.19.0 and the cached pnpm 9.4.0 CLI:

- Pass: source/configuration audit across 656 files found no hosted generation
  references; both route files are absent.
- Pass: TypeScript parsing across 625 files found no syntax errors or stale imports
  of removed generation modules. This is not a full type check.
- Pass: parsed lockfile validation confirmed every retained package record and
  snapshot matches the starting checkout, all dependency references resolve, and
  the application dependency specifiers match the manifests.
- Pass: `pnpm install --lockfile-only --frozen-lockfile --offline --ignore-scripts`
  with a temporary writable store. This validates lockfile consistency; it does
  not install application dependencies.
- Pass: `git diff --check`.

Full build and integrated browser/HTTP checks remain unverified. This worktree has
no installed dependencies; the existing installation lacks premium editor packages
and differs from the locked editor versions, as recorded in the
[baseline](baseline.md). The [smoke matrix](smoke-test-matrix.md) retains the
integrated editor and former-endpoint checks for a working application setup.
