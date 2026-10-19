# Security cleanup evidence

[Docs home](../README.md) · [Develop Wodge](README.md)

This is historical checkpoint evidence. The later owner-approved editor migration
uses public Tiptap v2.27.3 packages and removes the private registry mapping.
See the [current test inventory](testing-strategy.md) for validation.

Verified on 2026-10-16 against owner-selected baseline
`51d921d8a03d5808df8df7c75d521ab920a870bb`.

## Final implementation

The original premium editor extensions, integrations, package manifest, lockfile,
and scoped registry mapping are preserved byte-for-byte. No replacement packages
or new dependencies were added. The attempted extension removal was reverted
because a synthetic Yjs test demonstrated deletion of unsupported emoji nodes.

The baseline already removed the hardcoded registry authentication assignment.
Current `.npmrc` retains only the registry mapping and a comment. No token was
restored, logged, or reused. `.env.*` files are now ignored while the public
`.env.example` remains eligible for tracking.

## Verification

- **Pass:** 804 existing tracked files scanned; zero matches for the stated secret
  patterns. Patterns cover private-key headers, AWS access IDs, GitHub tokens,
  Stripe secret prefixes, quoted literal secret/token/password/key assignments,
  and npm authentication assignments. A pattern scan is not exhaustive proof that
  every possible secret format is absent.
- **Pass:** editor source, web manifest, lockfile, and `.npmrc` match the reviewed
  baseline byte-for-byte. No application behavior or dependency versions changed.
- **Pass:** ignore rules cover root and application `.env.*` files and retain
  `.env.example`.
- **Pass:** final diff whitespace check and evidence-document formatting.
- **Owner confirmed:** the exposed Tiptap token was explicitly revoked.
- **Owner-directed assumption:** the historical Cloudflare token is treated as
  deleted. The separate historical finding is recorded in the external execution
  tracker.

Issuer state was not independently inspected. The earlier installation/type-check
results were obtained with the reverted extension-removal trial and are not
acceptance evidence for the final revision. The final revision retains the private
registry dependency under the owner's instruction to preserve the existing editor.
No application runtime or fresh-install pass is claimed for this revision.

## Redacted history audit

The history scan examined 5,432 unique blobs reachable through local Git refs
using `git rev-list --objects --all` and `git cat-file --batch`. Only paths, object
IDs, line numbers, and classifications were printed.

- Historical registry authentication: `.npmrc:3`, blob
  `261e6d64ff542e0697bf49a95948e19d52b3c103`, present in commits
  `414f002579f7697471810d786b4330e4f6acbdb4` and
  `30e15006ef03bcb5e67fbea80d49d4f30c192864`.
- Historical Cloudflare token candidate: removed
  `apps/file-system/src/index.ts:26`, commit
  `fc3426d9803b488bee452192c819e1a51db04b4d`, blob
  `6f18ea8aa526935ca8aba6467e1b1b415c2ec5f9`.

Unreachable objects, remote-only refs, ignored local files, and provider account
state were outside this scan. Git history was not rewritten.

Final retained lockfile SHA-256:
`cf71a8e093b29bd9483208498feafde4a193a197776667efc4a3d6dd522af3ca`.
