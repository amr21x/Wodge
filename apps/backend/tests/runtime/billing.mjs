import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

/** @param {any} fixture */
export async function verifyBilling({
  request,
  json,
  database,
  workspace,
  structure,
  ownerId,
  memberCookie,
  polar,
}) {
  /** Polar's current subscription state, returned by the mocked sandbox API. */
  /** @param {Record<string, any>} [changes] */
  const subscription = (changes = {}) => ({
    id: "sub_runtime",
    created_at: "2026-10-01T00:00:00.000Z",
    modified_at: "2026-10-01T00:00:01.000Z",
    status: "active",
    product_id: "product_runtime",
    metadata: { referenceId: workspace.id },
    customer: { id: "cus_runtime", external_id: ownerId },
    ...changes,
  });
  let sequence = 0;
  /** Payload contents are untrusted; only the subscription ID and reference are used. */
  /** @param {Record<string, any>} [data] */
  const event = (data = subscription(), type = "subscription.updated") => ({
    type,
    timestamp: new Date().toISOString(),
    data,
  });
  /** @param {any} value @param {boolean} [valid] @param {string} [id] */
  const deliver = (value, valid = true, id = `msg_runtime_${++sequence}`) => {
    const body = JSON.stringify(value);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "polar_whs_runtime")
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64");
    // Polar deliveries carry no session cookie.
    return request(
      "/api/auth/polar/webhooks",
      {
        method: "POST",
        body,
        headers: {
          "content-type": "application/json",
          "webhook-id": id,
          "webhook-timestamp": String(timestamp),
          "webhook-signature": `v1,${valid ? signature : "aW52YWxpZA=="}`,
        },
      },
      false,
    );
  };
  const state = () =>
    database
      .prepare(
        "SELECT is_premium, customer_id FROM auth_organizations WHERE id = ?",
      )
      .bind(workspace.id)
      .first();
  const cursor = () =>
    database
      .prepare("SELECT * FROM billing_subscriptions WHERE workspace_id = ?")
      .bind(workspace.id)
      .first();
  const team = structure.teams[0];
  const room = team.rooms[0];
  const headers = { "x-workspace-id": workspace.id, "x-team-id": team.id };
  const assertCallsDisabled = async () => {
    for (const path of [
      `/api/rooms/${room.id}/token`,
      `/parties/room/${room.id}/token`,
    ]) {
      const response = await request(path, { headers });
      assert.equal(response.status, 403, await response.clone().text());
      assert.equal((await response.json()).error.code, "CALLS_DISABLED");
    }
    const pull = await request("/api/replicache/pull", {
      ...json({ clientGroupID: "calls-disabled", cookie: null }),
      headers: {
        ...headers,
        "content-type": "application/json",
        domain: "room",
        id: room.id,
      },
    });
    assert.equal(pull.status, 200, await pull.clone().text());
  };
  await assertCallsDisabled();

  // Direct browser access to the plugin's checkout and customer endpoints is blocked.
  for (const path of [
    "/api/auth/checkout",
    "/api/auth/customer/portal",
    "/api/auth/customer/state",
    "/api/auth/usage/ingest",
  ]) {
    const response = await request(path, json({ reference_id: workspace.id }));
    assert.equal(response.status, 403, await response.clone().text());
  }
  assert.equal(
    (
      await request(`/api/workspaces/${workspace.id}/billing/checkout`, {
        headers: { cookie: memberCookie },
      })
    ).status,
    403,
  );
  assert.equal(polar.checkouts.length, 0);
  const checkout = await request(
    `/api/workspaces/${workspace.id}/billing/checkout`,
  );
  assert.equal(checkout.status, 200, await checkout.clone().text());
  assert.equal(
    (await checkout.json()).url,
    "https://sandbox.polar.sh/checkout",
  );
  assert.equal(polar.checkouts.length, 1);
  assert.equal(polar.checkouts[0].external_customer_id, ownerId);
  assert.deepEqual(polar.checkouts[0].products, ["product_runtime"]);
  assert.deepEqual(polar.checkouts[0].metadata, { referenceId: workspace.id });
  assert.match(
    polar.checkouts[0].success_url,
    /\/billing\/success\?checkout_id=\{CHECKOUT_ID\}$/,
  );
  // The checkout redirect is not payment evidence.
  assert.equal((await state()).is_premium, 0);
  assert.equal(
    (await request(`/api/workspaces/${workspace.id}/billing/portal`)).status,
    400,
  );

  assert.equal(
    (await request("/api/auth/polar/webhooks", json({}), false)).status,
    403,
  );
  polar.subscriptions.set("sub_runtime", subscription());
  assert.equal((await deliver(event(), false)).status, 403);
  assert.equal(await cursor(), null);
  // An untrusted payload claiming a canceled subscription still yields Polar's active state.
  const created = await deliver(
    event(subscription({ status: "canceled" }), "subscription.created"),
  );
  assert.equal(created.status, 200, await created.clone().text());
  assert.deepEqual(await state(), { is_premium: 1, customer_id: ownerId });
  await assertCallsDisabled();
  const beforeDuplicate = await cursor();
  // Redelivery of the same message and a different event for the same state are idempotent.
  assert.equal((await deliver(event(), true, "msg_runtime_1")).status, 200);
  assert.equal((await deliver(event(), true)).status, 200);
  assert.equal((await cursor()).event_id, beforeDuplicate.event_id);
  assert.equal((await state()).is_premium, 1);

  const portal = await request(
    `/api/workspaces/${workspace.id}/billing/portal`,
  );
  assert.equal(portal.status, 200, await portal.clone().text());
  assert.equal((await portal.json()).url, "https://sandbox.polar.sh/portal");
  assert.equal(polar.portals.at(-1).external_customer_id, ownerId);

  // Foreign products and mismatched references never change entitlements.
  polar.subscriptions.set(
    "sub_foreign",
    subscription({
      id: "sub_foreign",
      product_id: "another_product",
      status: "canceled",
    }),
  );
  assert.equal(
    (await deliver(event(subscription({ id: "sub_foreign" })))).status,
    200,
  );
  polar.subscriptions.set(
    "sub_other",
    subscription({
      id: "sub_other",
      metadata: { referenceId: "another" },
      status: "canceled",
    }),
  );
  assert.equal(
    (await deliver(event(subscription({ id: "sub_other" })))).status,
    200,
  );
  assert.equal((await state()).is_premium, 1);

  // Scheduled cancellation keeps access until Polar reports the subscription as canceled.
  polar.subscriptions.set(
    "sub_runtime",
    subscription({
      modified_at: "2026-10-02T00:00:00.000Z",
      cancel_at_period_end: true,
    }),
  );
  assert.equal((await deliver(event(), true)).status, 200);
  assert.equal((await state()).is_premium, 1);
  polar.subscriptions.set(
    "sub_runtime",
    subscription({
      modified_at: "2026-10-03T00:00:00.000Z",
      status: "canceled",
    }),
  );
  assert.equal((await deliver(event(), true)).status, 200);
  assert.deepEqual(await state(), { is_premium: 0, customer_id: null });
  // A canceled subscription is never restored.
  polar.subscriptions.set("sub_runtime", subscription());
  assert.equal((await deliver(event())).status, 500);
  assert.equal((await state()).is_premium, 0);

  // A newer subscription replaces the ended one; events for the older one are ignored.
  const replacement = subscription({
    id: "sub_replacement",
    created_at: "2026-10-05T00:00:00.000Z",
    modified_at: "2026-10-05T00:00:01.000Z",
  });
  polar.subscriptions.set("sub_replacement", replacement);
  assert.equal((await deliver(event(replacement))).status, 200);
  assert.equal((await state()).is_premium, 1);
  polar.subscriptions.set(
    "sub_runtime",
    subscription({
      modified_at: "2026-10-06T00:00:00.000Z",
      status: "canceled",
    }),
  );
  assert.equal((await deliver(event())).status, 200);
  assert.equal((await state()).is_premium, 1);

  const responses = await Promise.all(
    [1, 2].map(() => deliver(event(replacement))),
  );
  for (const response of responses)
    assert.ok(
      [200, 500].includes(response.status),
      await response.clone().text(),
    );
  if (responses.some((response) => response.status === 500))
    assert.equal((await deliver(event(replacement))).status, 200);
  assert.equal((await state()).is_premium, 1);

  // A response fetched before a newer change must not overwrite the newer plan.
  let releaseStale = () => {};
  let signalStarted = () => {};
  const started = new Promise((resolve) => {
    signalStarted = () => resolve(undefined);
  });
  const released = new Promise((resolve) => {
    releaseStale = () => resolve(undefined);
  });
  let firstRead = true;
  const pastDue = {
    ...replacement,
    modified_at: "2026-10-07T00:00:00.000Z",
    status: "past_due",
  };
  polar.subscriptions.set("sub_replacement", async () => {
    if (firstRead) {
      firstRead = false;
      signalStarted();
      await released;
      return replacement;
    }
    return pastDue;
  });
  const slowDelivery = deliver(event(replacement));
  await started;
  const newer = await deliver(event(replacement));
  assert.equal(newer.status, 200, await newer.clone().text());
  assert.equal((await state()).is_premium, 0);
  releaseStale();
  assert.equal((await slowDelivery).status, 500);
  assert.equal((await state()).is_premium, 0);
  assert.equal((await deliver(event(replacement))).status, 200);
  assert.equal((await state()).is_premium, 0);
  const activeAgain = {
    ...replacement,
    modified_at: "2026-10-08T00:00:00.000Z",
  };
  polar.subscriptions.set("sub_replacement", activeAgain);
  assert.equal((await deliver(event(replacement))).status, 200);
  assert.equal((await state()).is_premium, 1);
  const beforeFailure = await cursor();

  // An organization-write failure must roll back the cursor too, allowing the identical event to retry.
  await database
    .prepare(
      "CREATE TRIGGER fail_billing_plan BEFORE UPDATE OF is_premium ON auth_organizations BEGIN SELECT RAISE(ABORT, 'test plan failure'); END",
    )
    .run();
  polar.subscriptions.set("sub_replacement", {
    ...replacement,
    modified_at: "2026-10-09T00:00:00.000Z",
    status: "canceled",
  });
  assert.equal(
    (await deliver(event(replacement), true, "msg_retry")).status,
    500,
  );
  assert.deepEqual(await cursor(), beforeFailure);
  assert.equal((await state()).is_premium, 1);
  await database.prepare("DROP TRIGGER fail_billing_plan").run();
  assert.equal(
    (await deliver(event(replacement), true, "msg_retry")).status,
    200,
  );
  assert.equal((await state()).is_premium, 0);
  assert.equal(
    (await deliver(event(replacement), true, "msg_retry")).status,
    200,
  );
  assert.equal(
    (await cursor()).event_id,
    `sub_replacement@${Date.parse("2026-10-09T00:00:00.000Z")}`,
  );
  assert.equal(
    (await request(`/api/workspaces/${workspace.id}/members`)).status,
    200,
  );

  // Invalid URL encodings and malformed multipart input are client errors, not leaked runtime exceptions.
  assert.equal((await request("/parties/user/%E0%A4%A")).status, 400);
  const badUpload = await request(
    `/parties/workspace/${workspace.id}/file/${team.id}/${team.rooms[0].id}/file`,
    {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=broken" },
      body: "not a multipart body",
    },
  );
  assert.equal(badUpload.status, 400, await badUpload.clone().text());
}
