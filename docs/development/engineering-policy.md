# Engineering practice for the current scope

[Docs home](../README.md) · [Develop Wodge](README.md)

The [current project scope](documentation.md), direct owner instructions, and
repository `AGENTS.md` govern this work. An organization policy or plugin approval
from another workspace/project is not adopted by this repository.

Preserve existing behavior and authorization while making the necessary foundation
changes. Keep browser configuration separate from server bindings and credentials.
Shared persistence receives explicit D1 bindings and does not read Next request
context. Retained domain schemas remain unchanged unless a reviewed change is needed.

Select deliberate compatible package versions; report peer results and installed
versions. Do not treat installing every latest release or changing the formatter,
linter, compiler, visual system, or web framework as implicitly approved work.

Record actual validation and limitations, distinguish local fixture evidence from
integrated acceptance, and keep secrets out of source/evidence. Use descriptive
artifact names without issue identifiers. No local check authorizes a remote push,
production change, or named release.
