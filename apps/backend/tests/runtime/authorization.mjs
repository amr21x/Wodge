import assert from "node:assert/strict";

/** @param {any} fixture */
export async function verifyAuthorization({
  request,
  json,
  database,
  workspace,
  structure,
  memberCookie,
}) {
  const root = `/api/workspaces/${workspace.id}/authorization`;
  const listed = await request(root + "/roles");
  assert.equal(listed.status, 200, await listed.clone().text());
  const initial = await listed.json();
  const team = structure.teams[0];
  const room = team.rooms[0];

  const headers = { cookie: memberCookie };
  const profile = await request("/api/users/me", { headers });
  assert.equal(profile.status, 200, await profile.clone().text());
  const member = await profile.json();
  const organization = await database
    .prepare("SELECT id FROM auth_organizations WHERE id = ?")
    .bind(workspace.id)
    .first();
  assert.ok(organization);
  assert.ok(
    await database
      .prepare(
        "SELECT id FROM auth_members WHERE organization_id = ? AND user_id = ?",
      )
      .bind(organization.id, member.id)
      .first(),
  );

  const otherResponse = await request(
    "/api/workspaces/new",
    json({ name: "Other workspace", slug: "other-authz-workspace" }),
  );
  assert.equal(otherResponse.status, 201, await otherResponse.clone().text());
  const otherWorkspace = (await otherResponse.json()).workspace;
  const otherPull = await request("/api/replicache/pull", {
    ...json({ clientGroupID: "other-workspace", cookie: null }),
    headers: {
      "content-type": "application/json",
      domain: "workspace",
      id: otherWorkspace.id,
    },
  });
  assert.equal(otherPull.status, 200, await otherPull.clone().text());
  const otherStructure = (await otherPull.json()).patch.find(
    (/** @type {any} */ patch) => patch.key === "workspace/structure",
  ).value;
  const crossTenant = await request(
    `/parties/room/${otherStructure.teams[0].rooms[0].id}/replicache-pull`,
    {
      ...json({ clientGroupID: "cross-tenant", cookie: null }),
      headers: {
        ...headers,
        "content-type": "application/json",
        "x-workspace-id": workspace.id,
        "x-owner": "true",
      },
    },
  );
  assert.equal(crossTenant.status, 403, await crossTenant.text());

  const escalation = await request(root + "/roles", {
    ...json({ name: "Escalation", permissions: { role: ["assign"] } }),
    headers: {
      ...headers,
      "content-type": "application/json",
      "x-owner": "true",
    },
  });
  assert.equal(escalation.status, 403, await escalation.text());
  const unknown = await request(
    root + "/roles",
    json({ name: "Unknown", permissions: { message: ["invented"] } }),
  );
  assert.equal(unknown.status, 400);

  // Remove the imported editor grant. Existing team-reader access remains.
  const editor = initial.roles.find(
    (/** @type {any} */ role) => role.system === "editor",
  );
  for (const assignment of initial.assignments.filter(
    (/** @type {any} */ item) => item.roleId === editor.id,
  )) {
    const removed = await request(root + "/assignments/" + assignment.id, {
      method: "DELETE",
    });
    assert.equal(removed.status, 204, await removed.text());
  }
  const created = await request(
    root + "/roles",
    json({
      name: "Scoped sender",
      permissions: { message: ["send", "editOwn", "deleteOwn"] },
    }),
  );
  assert.equal(created.status, 201, await created.clone().text());
  const role = await created.json();
  assert.match(role.id, /^[0-9a-f-]{14}7/);
  const assigned = await request(
    root + "/assignments",
    json({
      roleId: role.id,
      subject: { type: "user", id: member.id },
      scope: { type: "room", id: room.id },
    }),
  );
  assert.equal(assigned.status, 201, await assigned.clone().text());
  let assignment = await assigned.json();

  /** @param {number} id */
  const push = (id) =>
    request(`/parties/room/${room.id}/replicache-push`, {
      ...json({
        clientGroupID: "authorization-group",
        mutations: [
          {
            id,
            clientID: "authorization-client",
            name: "sendMessage",
            args: {
              id: "authorization-message-" + id,
              sender: member.id,
              content: "Scoped message " + id,
              date: new Date().toISOString(),
            },
          },
        ],
      }),
      headers: {
        ...headers,
        "content-type": "application/json",
        "x-workspace-id": "untrusted-workspace",
        "x-owner": "true",
      },
    });
  let response = await push(1);
  assert.equal(response.status, 200, await response.text());
  response = await push(2);
  assert.equal(response.status, 200, await response.text());

  const ownerMessage = {
    id: "authorization-owner-message",
    sender: workspace.owner,
    content: "Owner message",
    date: new Date().toISOString(),
  };
  const ownerPush = await request(
    `/parties/room/${room.id}/replicache-push`,
    json({
      clientGroupID: "authorization-owner-group",
      mutations: [
        {
          id: 1,
          clientID: "authorization-owner-client",
          name: "sendMessage",
          args: ownerMessage,
        },
      ],
    }),
  );
  assert.equal(ownerPush.status, 200, await ownerPush.text());
  for (const name of ["editMessage", "deleteMessage"]) {
    const forged = { ...ownerMessage, sender: member.id };
    const denied = await request(`/parties/room/${room.id}/replicache-push`, {
      ...json({
        clientGroupID: "authorization-group",
        mutations: [
          {
            id: 3,
            clientID: "authorization-client",
            name,
            args:
              name === "editMessage"
                ? { message: forged, newContent: "Forged edit" }
                : forged,
          },
        ],
      }),
      headers: { ...headers, "content-type": "application/json" },
    });
    assert.equal(denied.status, 403, await denied.text());
  }

  const foreign = await request(root + "/check", {
    ...json({
      scope: { type: "room", id: "foreign-room" },
      permissions: { message: ["send"] },
    }),
    headers: { ...headers, "content-type": "application/json" },
  });
  assert.equal(foreign.status, 200, await foreign.clone().text());
  assert.equal((await foreign.json()).success, false);

  const revoked = await request(root + "/assignments/" + assignment.id, {
    method: "DELETE",
  });
  assert.equal(revoked.status, 204, await revoked.text());
  response = await push(3);
  assert.equal(response.status, 403, await response.text());
  const pull = await request(`/parties/room/${room.id}/replicache-pull`, {
    ...json({ clientGroupID: "authorization-group", cookie: null }),
    headers: { ...headers, "content-type": "application/json" },
  });
  assert.equal(pull.status, 200, await pull.clone().text());
  const data = await pull.json();
  assert.equal(data.lastMutationIDChanges["authorization-client"], 2);
  assert.equal(
    data.patch
      .find((/** @type {any} */ patch) => patch.key === "messages")
      .value.filter(
        (/** @type {any} */ message) => message.sender === member.id,
      ).length,
    2,
  );

  const again = await request(
    root + "/assignments",
    json({
      roleId: role.id,
      subject: { type: "user", id: member.id },
      scope: { type: "room", id: room.id },
    }),
  );
  assert.equal(again.status, 201, await again.clone().text());
  assignment = await again.json();
  response = await push(3);
  assert.equal(response.status, 200, await response.text());
  const removed = await request(
    `/api/workspaces/${workspace.id}/members/${member.id}`,
    { method: "DELETE" },
  );
  assert.equal(removed.status, 204, await removed.text());
  assert.equal(
    await database
      .prepare(
        "SELECT id FROM auth_members WHERE organization_id = ? AND user_id = ?",
      )
      .bind(organization.id, member.id)
      .first(),
    null,
  );
  response = await push(4);
  assert.equal(response.status, 403, await response.text());

  const invite = await database
    .prepare("SELECT token FROM invites WHERE workspace_id = ?")
    .bind(workspace.id)
    .first();
  const rejoined = await request(
    `/api/workspaces/${workspace.id}/join/${invite.token}`,
    { method: "POST", headers },
  );
  assert.equal(rejoined.status, 200, await rejoined.text());
  response = await push(4);
  assert.equal(response.status, 403, await response.text());

  // Concurrent policy edits must not silently overwrite one another.
  const names = ["Concurrent one", "Concurrent two"];
  const attempts = await Promise.all(
    names.map((name) =>
      request(root + "/roles", json({ name, permissions: { room: ["read"] } })),
    ),
  );
  for (let index = 0; index < attempts.length; index++) {
    assert.ok(
      [201, 409].includes(attempts[index].status),
      await attempts[index].clone().text(),
    );
    if (attempts[index].status === 409) {
      const retry = await request(
        root + "/roles",
        json({ name: names[index], permissions: { room: ["read"] } }),
      );
      assert.equal(retry.status, 201, await retry.text());
    }
  }
  const finalRoles = await (await request(root + "/roles")).json();
  for (const name of names)
    assert.ok(
      finalRoles.roles.some((/** @type {any} */ item) => item.name === name),
    );

  const updated = await request(
    `/api/workspaces/${workspace.id}/update`,
    json({
      name: "Renamed runtime workspace",
      slug: "renamed-workspace",
    }),
  );
  assert.equal(updated.status, 204, await updated.text());
  const synchronizedOrganization = await database
    .prepare("SELECT name, slug FROM auth_organizations WHERE id = ?")
    .bind(workspace.id)
    .first();
  assert.equal(synchronizedOrganization.name, "Renamed runtime workspace");
  assert.equal(synchronizedOrganization.slug, "renamed-workspace");

  // Direct identity writes cannot bypass backend projection coordination.
  const bypass = await request(
    "/api/auth/organization/create",
    json({ name: "Bypass", slug: "bypass" }),
  );
  assert.equal(bypass.status, 403, await bypass.text());
  assert.equal(
    await database
      .prepare("SELECT id FROM auth_organizations WHERE slug = ?")
      .bind("bypass")
      .first(),
    null,
  );
}
