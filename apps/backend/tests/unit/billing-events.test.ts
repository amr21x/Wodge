import { BillingService } from "@wodge/core/billing/services/billing";
import type {
  SubscriptionEvent,
  SubscriptionState,
} from "@wodge/domain/billing/dto";
import { expect, test, vi } from "vitest";

const event = (
  changes: Partial<SubscriptionEvent> = {},
): SubscriptionEvent => ({
  workspaceId: "workspace",
  eventId: "event",
  eventCreated: 100,
  subscriptionId: "subscription",
  subscriptionCreated: 10,
  customerId: "customer",
  status: "active",
  ...changes,
});
const state = (
  changes: Partial<SubscriptionState> = {},
): SubscriptionState => ({
  ...event(),
  isPremium: true,
  ended: false,
  changeId: "previous",
  ...changes,
});
function fixture() {
  const commit = vi.fn(
    async (
      _next: SubscriptionState,
      _expected: string | undefined,
      _plan: { isPremium: boolean; customerId: string | null },
    ) => true,
  );
  const service = new BillingService(
    { getWorkspaceById: async () => ({ id: "workspace" }) } as never,
    { get: async () => undefined, commit },
  );
  return { service, commit };
}

test("repeated provider snapshots preserve entitlement and use conditional writes", async () => {
  const f = fixture();
  await f.service.applySubscription(event(), state());
  await f.service.applySubscription(event({ eventCreated: 50 }), state());
  for (const call of f.commit.mock.calls) {
    expect(call[1]).toBe("previous");
    expect(call[2]).toEqual({ isPremium: true, customerId: "customer" });
  }
  // Event timestamps never substitute for the current provider snapshot.
  expect(f.commit).toHaveBeenCalledTimes(2);
});

test("an old subscription cannot downgrade its replacement or revive a canceled subscription", async () => {
  const f = fixture();
  await f.service.applySubscription(
    event({ status: "canceled" }),
    state({ subscriptionId: "replacement", subscriptionCreated: 20 }),
  );
  expect(f.commit).not.toHaveBeenCalled();
  await expect(
    f.service.applySubscription(
      event(),
      state({ ended: true, isPremium: false }),
    ),
  ).rejects.toMatchObject({ code: "BILLING_EVENT_CONFLICT" });
});

test("ambiguous replacement order fails safely instead of guessing entitlement", async () => {
  const f = fixture();
  await expect(
    f.service.applySubscription(event({ subscriptionId: "other" }), state()),
  ).rejects.toMatchObject({ code: "BILLING_EVENT_CONFLICT" });
  expect(f.commit).not.toHaveBeenCalled();
});

test("concurrent changes retry the complete provider read instead of reusing a stale snapshot", async () => {
  const f = fixture();
  f.commit.mockResolvedValue(false);
  await expect(
    f.service.applySubscription(event(), state()),
  ).rejects.toMatchObject({ code: "BILLING_EVENT_CONFLICT" });
  expect(f.commit).toHaveBeenCalledOnce();
});
