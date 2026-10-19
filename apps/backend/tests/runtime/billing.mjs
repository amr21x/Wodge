import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

/** @param {any} fixture */
export async function verifyBilling({
  request,
  json,
  database,
  workspace,
  structure,
  memberCookie,
  stripeSubscriptions,
}) {
  let sequence = 0;
  /** @param {Record<string, any>} [changes] */
  const event = (changes = {}) => ({
    id: `evt_runtime_${++sequence}`,
    created: 100,
    type: "customer.subscription.created",
    data: {
      object: {
        id: "sub_runtime",
        created: 10,
        status: "active",
        metadata: { workspaceId: workspace.id },
        customer: "cus_runtime",
      },
    },
    ...changes,
  });
  /** @param {any} value @param {boolean} [valid] */
  const deliver = (value, valid = true) => {
    const body = JSON.stringify(value);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsec_runtime")
      .update(`${timestamp}.${body}`)
      .digest("hex");
    return request("/api/billing/webhook", {
      method: "POST",
      body,
      headers: {
        "stripe-signature": `t=${timestamp},v1=${valid ? signature : "invalid"}`,
      },
    });
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
  assert.equal((await request("/api/billing/webhook", json({}))).status, 400);
  const first = event();
  stripeSubscriptions.set("sub_runtime", {
    ...first.data.object,
    object: "subscription",
  });
  assert.equal((await deliver(first, false)).status, 400);
  assert.equal(await cursor(), null);
  assert.equal((await deliver({ ...first, created: -1 })).status, 400);
  assert.equal((await deliver(first)).status, 200);
  assert.equal((await state()).is_premium, 1);
  await assertCallsDisabled();
  const beforeDuplicate = await cursor();
  assert.equal((await deliver(first)).status, 200);
  assert.equal((await cursor()).event_id, beforeDuplicate.event_id);
  assert.equal((await state()).is_premium, 1);
  assert.equal(
    (
      await deliver(
        event({ created: 99, type: "customer.subscription.deleted" }),
      )
    ).status,
    200,
  );
  assert.equal((await state()).is_premium, 1);
  const canceled = event({
    created: 101,
    type: "customer.subscription.deleted",
  });
  stripeSubscriptions.set("sub_runtime", {
    ...canceled.data.object,
    object: "subscription",
    status: "canceled",
  });
  assert.equal((await deliver(canceled)).status, 200);
  assert.equal((await state()).is_premium, 0);
  assert.equal((await state()).customer_id, null);
  assert.equal((await deliver(first)).status, 200);
  assert.equal((await state()).is_premium, 0);

  const replacement = event({ created: 200 });
  replacement.data.object.id = "sub_replacement";
  replacement.data.object.created = 20;
  stripeSubscriptions.set("sub_replacement", {
    ...replacement.data.object,
    object: "subscription",
  });
  assert.equal((await deliver(replacement)).status, 200);
  assert.equal(
    (
      await deliver(
        event({ created: 300, type: "customer.subscription.deleted" }),
      )
    ).status,
    200,
  );
  assert.equal((await state()).is_premium, 1);

  const updates = [201, 202].map((created) =>
    event({
      ...replacement,
      id: `evt_concurrent_${created}`,
      created,
      type: "customer.subscription.updated",
    }),
  );
  const responses = await Promise.all(updates.map((update) => deliver(update)));
  for (let index = 0; index < responses.length; index++) {
    const response = responses[index];
    assert.ok(
      [200, 503].includes(response.status),
      await response.clone().text(),
    );
    if (response.status === 503)
      assert.equal((await deliver(updates[index])).status, 200);
  }
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
  stripeSubscriptions.set("sub_replacement", async () => {
    if (firstRead) {
      firstRead = false;
      signalStarted();
      await released;
      return { ...replacement.data.object, object: "subscription" };
    }
    return {
      ...replacement.data.object,
      object: "subscription",
      status: "past_due",
    };
  });
  const stale = event({
    ...replacement,
    id: "evt_stale_snapshot",
    created: 205,
  });
  const slowDelivery = deliver(stale);
  await started;
  const newer = await deliver(
    event({ ...replacement, id: "evt_new_snapshot", created: 206 }),
  );
  assert.equal(newer.status, 200, await newer.clone().text());
  assert.equal((await state()).is_premium, 0);
  releaseStale();
  assert.equal((await slowDelivery).status, 503);
  assert.equal((await state()).is_premium, 0);
  assert.equal((await deliver(stale)).status, 200);
  assert.equal((await state()).is_premium, 0);
  stripeSubscriptions.set("sub_replacement", {
    ...replacement.data.object,
    object: "subscription",
  });
  assert.equal(
    (
      await deliver(
        event({ ...replacement, id: "evt_active_again", created: 207 }),
      )
    ).status,
    200,
  );
  assert.equal((await state()).is_premium, 1);
  const beforeFailure = await cursor();

  // An organization-write failure must roll back the cursor too, allowing the identical event to retry.
  await database
    .prepare(
      "CREATE TRIGGER fail_billing_plan BEFORE UPDATE OF is_premium ON auth_organizations BEGIN SELECT RAISE(ABORT, 'test plan failure'); END",
    )
    .run();
  const failed = event({
    ...replacement,
    id: "evt_retry",
    created: 203,
    type: "customer.subscription.deleted",
  });
  stripeSubscriptions.set("sub_replacement", {
    ...replacement.data.object,
    object: "subscription",
    status: "canceled",
  });
  assert.equal((await deliver(failed)).status, 500);
  assert.deepEqual(await cursor(), beforeFailure);
  assert.equal((await state()).is_premium, 1);
  await database.prepare("DROP TRIGGER fail_billing_plan").run();
  assert.equal((await deliver(failed)).status, 200);
  assert.equal((await state()).is_premium, 0);
  assert.equal((await deliver(failed)).status, 200);
  assert.equal((await cursor()).event_id, "evt_retry");
  assert.equal(
    (await request(`/api/workspaces/${workspace.id}/members`)).status,
    200,
  );
  assert.equal(
    (
      await request(`/api/workspaces/${workspace.id}/billing/checkout`, {
        headers: { cookie: memberCookie },
      })
    ).status,
    403,
  );

  // Invalid URL encodings and malformed multipart input are client errors, not leaked runtime exceptions.
  assert.equal((await request("/parties/user/%E0%A4%A")).status, 400);
  const badUpload = await request(
    `/parties/workspace/${workspace.id}/file/${team.id}/channel/file`,
    {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=broken" },
      body: "not a multipart body",
    },
  );
  assert.equal(badUpload.status, 400, await badUpload.clone().text());
}
