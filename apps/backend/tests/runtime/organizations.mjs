import assert from "node:assert/strict";

/** Verify identity writes and local projections through the coordinating backend API.
 * @param {any} fixture
 */
export async function verifyOrganizations({
  request,
  json,
  database,
  memberCookie,
}) {
  const created = await request(
    "/api/workspaces/new",
    json({
      name: "Coordinated organization",
      slug: "coordinated-organization",
    }),
  );
  assert.equal(created.status, 201, await created.clone().text());
  const { workspace } = await created.json();
  const id = workspace.id;
  const memberHeaders = {
    cookie: memberCookie,
    "content-type": "application/json",
  };
  const member = await (
    await request("/api/users/me", { headers: memberHeaders })
  ).json();

  // Better Auth reads and session settings remain available; writes use controllers.
  const selected = await request(
    "/api/auth/organization/set-active",
    json({ organizationId: id }),
  );
  assert.equal(selected.status, 200, await selected.text());
  const updated = await request(
    `/api/workspaces/${id}/update`,
    json({ name: "Coordinated settings", slug: "coordinated-settings" }),
  );
  assert.equal(updated.status, 204, await updated.text());
  const listed = await (await request("/api/users/workspaces")).json();
  assert.equal(
    listed.find((/** @type {any} */ item) => item.id === id).name,
    "Coordinated settings",
  );
  const organization = await database
    .prepare("SELECT name,slug FROM auth_organizations WHERE id = ?")
    .bind(id)
    .first();
  assert.equal(organization.slug, "coordinated-settings");

  const invitation = await request(`/api/workspaces/${id}/invite`);
  assert.equal(invitation.status, 200, await invitation.clone().text());
  const { invites } = await invitation.json();
  const joined = await request(
    `/api/workspaces/${id}/join/${invites[0].token}`,
    { ...json({}), headers: memberHeaders },
  );
  assert.equal(joined.status, 200, await joined.text());

  const pull = (headers = {}) =>
    request("/api/replicache/pull", {
      ...json({ clientGroupID: "coordinated-lifecycle", cookie: null }),
      headers: {
        ...headers,
        "content-type": "application/json",
        domain: "workspace",
        id,
      },
    });
  const pulled = await pull(memberHeaders);
  assert.equal(pulled.status, 200, await pulled.clone().text());
  const patch = (await pulled.json()).patch;
  assert.ok(
    patch
      .find((/** @type {any} */ item) => item.key === "workspace/members")
      .value.members.some((/** @type {any} */ item) => item.id === member.id),
  );
  const room = patch.find(
    (/** @type {any} */ item) => item.key === "workspace/structure",
  ).value.teams[0].rooms[0];
  const roomPull = (headers = {}) =>
    request(`/parties/room/${room.id}/replicache-pull`, {
      ...json({ clientGroupID: "coordinated-room", cookie: null }),
      headers: { ...headers, "content-type": "application/json" },
    });
  assert.equal((await roomPull(memberHeaders)).status, 200);

  const authRoot = `/api/workspaces/${id}/authorization`;
  /** @param {string} role */
  const roleChange = (role) =>
    request(`/api/workspaces/${id}/members/${member.id}/role`, {
      ...json({ role }),
      method: "PATCH",
    });
  const promoted = await roleChange("admin");
  assert.equal(promoted.status, 204, await promoted.text());
  assert.equal(
    (await request(authRoot + "/roles", { headers: memberHeaders })).status,
    200,
  );
  const demoted = await roleChange("member");
  assert.equal(demoted.status, 204, await demoted.text());
  assert.equal(
    (await request(authRoot + "/roles", { headers: memberHeaders })).status,
    403,
  );

  const left = await request(`/api/workspaces/${id}/leave`, {
    ...json({}),
    headers: memberHeaders,
  });
  assert.equal(left.status, 204, await left.text());
  assert.equal(
    await database
      .prepare(
        "SELECT id FROM auth_members WHERE organization_id = ? AND user_id = ?",
      )
      .bind(id, member.id)
      .first(),
    null,
  );
  assert.equal((await roomPull(memberHeaders)).status, 403);
  assert.equal((await pull(memberHeaders)).status, 401);
  assert.equal((await roomPull()).status, 200);

  const deleted = await request(`/api/workspaces/${id}`, { method: "DELETE" });
  assert.equal(deleted.status, 204, await deleted.text());
  assert.equal((await roomPull()).status, 403);
  assert.equal(
    await database
      .prepare("SELECT id FROM auth_organizations WHERE id = ?")
      .bind(id)
      .first(),
    null,
  );

  for (const operation of [
    "create",
    "update",
    "delete",
    "add-member",
    "remove-member",
    "update-member-role",
    "leave",
    "invite-member",
    "accept-invitation",
    "reject-invitation",
    "cancel-invitation",
  ]) {
    const bypass = await request(
      `/api/auth/organization/${operation}`,
      json({}),
    );
    assert.equal(bypass.status, 403, operation);
  }
}
