# Development and delivery workflow

[Docs home](../README.md) · [Develop Wodge](README.md)

Work is scoped only to [AMR21 / Wodge Revival & Enhancements](documentation.md).
Read the returned project and task membership before using Linear records. Do not
substitute another workspace, standalone document, feature project, or connection
label for that verification.

## Local execution

Use the owner-confirmed checkout and current work description. Implement the
necessary foundation changes, preserve existing frontend UI and domain behavior,
and record the actual code revision/content hashes and Pass/Fail/Unverified results.
Preserve meaningful baseline failures instead of claiming they passed. Broader
modernization remains deferred unless separately approved.

The owner maintains `AGENTS.md`. Documentation and evidence use descriptive names
and must not contain issue identifiers. Local secrets remain ignored; no secret
values are recorded in evidence.

## Validation and delivery

Use appropriate static, build, import, and runtime checks. The
[foundation record](backend-foundation.md) and [baseline](baseline.md) distinguish
executed checks from full application acceptance. The current repository workflow
is implementation evidence, not proof that a desired verification gate exists.
No additional CI/release system is selected by this cleanup.

Pushes, production changes, and named releases require separate authorization.
No remote publication or deployment is implied by successful local checks. The
current project supplies no approved delivery deadline or renewed execution plan
for its deferred modernization milestone.
