import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act, Simulate } from "react-dom/test-utils";
import { QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RoleSettings } from "../src/features/workspace/settings/role-settings";
import { queryClient } from "../src/client/query";

vi.mock("@/features/workspace/state/workspace-provider", () => ({
  useCurrentWorkspace: () => ({
    workspaceId: "workspace",
    structure: {
      teams: [
        { id: "team", name: "Team", rooms: [{ id: "room", name: "Room" }] },
      ],
    },
    members: { members: [{ id: "member" }] },
  }),
}));
vi.mock("@/features/account/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: "owner" } }),
}));
vi.mock("@/features/workspace/hooks/use-members-info", () => ({
  useMembersInfo: () => ({
    membersInfo: [{ id: "member", email: "member@example.test" }],
  }),
}));
vi.mock("@/features/workspace/settings/settings", () => ({
  SettingsContentHeader: () => null,
  SettingsContentSection: ({ children }: { children: React.ReactNode }) =>
    children,
}));
const writes: { method: string; path: string; body: unknown }[] = [];
let role = {
  id: "writer",
  name: "Writer",
  permissions: { room: ["read"], message: ["send"] },
};
let denyWrite = false;
let assigned = false;
let root: Root;
beforeEach(() => {
  notifyManager.setNotifyFunction((callback) => {
    act(() => callback());
  });
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  queryClient.clear();
  writes.length = 0;
  denyWrite = false;
  assigned = false;
  role = {
    id: "writer",
    name: "Writer",
    permissions: { room: ["read"], message: ["send"] },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (path.endsWith("/check")) return Response.json({ success: true });
      if (method === "GET")
        return Response.json({
          revision: 1,
          roles: [role],
          assignments: assigned
            ? [
                {
                  id: "assignment",
                  roleId: "writer",
                  subject: { type: "user", id: "member" },
                  scope: { type: "room", id: "room" },
                },
              ]
            : [],
        });
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : null;
      writes.push({ path, method, body });
      if (denyWrite)
        return Response.json(
          { error: { code: "AUTHORIZATION_FORBIDDEN" } },
          { status: 403 },
        );
      if (
        method === "PATCH" &&
        body &&
        typeof body === "object" &&
        "name" in body &&
        typeof body.name === "string"
      )
        role.name = body.name;
      if (path.endsWith("/assignments")) assigned = true;
      if (method === "DELETE") assigned = false;
      return Response.json({ success: true });
    }),
  );
  const target = document.createElement("div");
  document.body.replaceChildren(target);
  root = createRoot(target);
});
afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  notifyManager.setNotifyFunction((callback) => callback());
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () =>
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(RoleSettings),
      ),
    ),
  );
  await vi.waitFor(() => expect(document.body.textContent).toContain("Writer"));
}
function namedButton(text: string) {
  const button = [...document.querySelectorAll("button")].find(
    (button) => button.textContent === text,
  );
  if (!button) throw new Error(`Missing ${text}`);
  return button;
}
async function change(selector: string, value: string) {
  const input = document.querySelector(selector);
  if (
    !(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)
  )
    throw new Error("Missing input");
  await act(async () => {
    input.value = value;
    Simulate.change(document.querySelector(selector)!);
  });
}

test("role edits use the existing typed endpoint and preserve entered values after denial", async () => {
  await mount();
  await act(async () => namedButton("Edit Writer").click());
  await change('[aria-label="Role name"]', "Renamed writer");
  denyWrite = true;
  await act(async () => Simulate.submit(document.querySelector("form")!));
  await vi.waitFor(() =>
    expect(document.querySelector('[role="alert"]')?.textContent).toMatch(
      /permission/,
    ),
  );
  expect(writes).toEqual([
    expect.objectContaining({
      path: "/api/workspaces/workspace/authorization/roles/writer",
      method: "PATCH",
      body: expect.objectContaining({ name: "Renamed writer" }),
    }),
  ]);
  expect(
    document.querySelector<HTMLInputElement>('[aria-label="Role name"]')?.value,
  ).toBe("Renamed writer");
  expect(namedButton("Save role").disabled).toBe(false);
});

test("room assignment and removal refresh the server assignment list", async () => {
  await mount();
  await change('[aria-label="Assignment role"]', "writer");
  await change('[aria-label="Assignment member or team"]', "user:member");
  await change('[aria-label="Assignment room"]', "room");
  const form = document.querySelectorAll("form")[1]!;
  await act(async () => Simulate.submit(form));
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain("Remove assignment"),
  );
  expect(writes[0]?.body).toEqual({
    roleId: "writer",
    subject: { type: "user", id: "member" },
    scope: { type: "room", id: "room" },
  });
  await act(async () => namedButton("Remove assignment").click());
  await vi.waitFor(() =>
    expect(
      [...document.querySelectorAll("button")].some(
        (button) => button.textContent === "Remove assignment",
      ),
    ).toBe(false),
  );
  expect(writes[1]).toMatchObject({
    method: "DELETE",
    path: "/api/workspaces/workspace/authorization/assignments/assignment",
  });
});
