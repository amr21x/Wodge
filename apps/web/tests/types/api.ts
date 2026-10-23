import type { ApiType } from "backend/api";
import { hc, type InferRequestType, type InferResponseType } from "hono/client";

const client = hc<ApiType>("/");
const workspace = client.api.workspaces[":workspaceId"];

// Compile checks for the frontend Hono client against the backend route types.
const profile: InferRequestType<typeof client.api.users.update.$post> = {
  json: { username: "reader", displayName: "Reader" },
};
const role: InferRequestType<typeof workspace.authorization.roles.$post> = {
  param: { workspaceId: "workspace" },
  json: { name: "Writer", permissions: { message: ["read", "send"] } },
};
const settings: InferRequestType<typeof workspace.update.$post> = {
  param: { workspaceId: "workspace" },
  json: { name: "Workspace", slug: "workspace" },
};
const member = workspace.members[":memberId"];
const promotion: InferRequestType<typeof member.role.$patch> = {
  param: { workspaceId: "workspace", memberId: "member" },
  json: { role: "admin" },
};
const room = client.api.rooms[":channelId"];
const token: InferRequestType<typeof room.token.$get> = {
  param: { channelId: "room" },
};

// @ts-expect-error The API has no such endpoint.
void client.api.users.missing.$get;
// @ts-expect-error Account lookup is GET only.
void client.api.users.me.$post;
const incompleteProfile = { json: { username: "reader" } };
// @ts-expect-error Profile updates require displayName.
const missingName: typeof profile = incompleteProfile;
const nonStringProfile = { json: { username: "reader", displayName: 42 } };
// @ts-expect-error Profile fields retain their types.
const invalidName: typeof profile = nonStringProfile;
const unsupportedPermissions: { message: "teleport"[] } = {
  message: ["teleport"],
};
// @ts-expect-error Custom permissions reject unknown actions.
const invalidPermissions: typeof role.json.permissions = unsupportedPermissions;
const emptyParameters = {};
// @ts-expect-error Workspace-scoped operations require the workspace path parameter.
const missingWorkspace: typeof role.param = emptyParameters;
// @ts-expect-error A forwarded token route exposes channelId, not the internal roomId.
const internalParameter: typeof token.param = { roomId: "room" };

type User = InferResponseType<typeof client.api.users.me.$get, 200>;
const userId: User["id"] = "user";
// @ts-expect-error Account responses have a string identifier.
const invalidUserId: User["id"] = 42;
// @ts-expect-error Backend-only dependencies never appear in the public response.
type Container = User["container"];
type Role = InferResponseType<typeof workspace.authorization.roles.$post, 201>;
const roleId: Role["id"] = "role";
// @ts-expect-error Forwarded object responses retain their DTO types.
const invalidRoleId: Role["id"] = 42;

export type ClientContractChecks = [
  Container,
  typeof profile,
  typeof role,
  typeof token,
  typeof userId,
  typeof roleId,
];

void [
  settings,
  promotion,
  missingName,
  invalidName,
  invalidPermissions,
  missingWorkspace,
  internalParameter,
  invalidUserId,
  invalidRoleId,
];

const assignment: InferRequestType<
  typeof workspace.authorization.assignments.$post
> = {
  param: { workspaceId: "workspace" },
  json: {
    roleId: "writer",
    subject: { type: "user", id: "member" },
    scope: { type: "room", id: "room" },
  },
};
type RoleList = InferResponseType<
  typeof workspace.authorization.roles.$get,
  200
>;
const assignmentId: RoleList["assignments"][number]["id"] = "assignment";
const removal: InferRequestType<
  (typeof workspace.authorization.assignments)[":assignmentId"]["$delete"]
> = {
  param: { workspaceId: "workspace", assignmentId },
};
void [assignment, removal];
