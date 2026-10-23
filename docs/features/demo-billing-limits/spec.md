# Polar sandbox billing

[Docs home](../../README.md) · [Polar sandbox billing](README.md) · [Design](design.md)

Provide working Polar sandbox Checkout and customer portal behavior for the portfolio demo. Workspace administrators start checkout; the subscription belongs to the purchasing administrator, who alone can open the customer portal. Pro raises the member limit from 10 to 50; downgrades keep existing members and cap new ones. Entitlements follow verified Polar subscription state, never checkout redirects. This scope introduces no live-payment launch, new plan prices, storage quotas, premium-eligibility rules, or call metering.

The [current project scope](../../development/documentation.md) governs delivery.
Use the [application baseline](../../development/baseline.md) and
[smoke matrix](../../development/smoke-test-matrix.md) for recorded behavior and checks.
