import type { ApiType } from "../../src/types/api-types";
import { hc, type InferRequestType } from "hono/client";
const client = hc<ApiType>("/");
const roles = client.api.workspaces[":workspaceId"].authorization.roles;
const emptyParameters = {};
// @ts-expect-error A workspace-scoped route requires its workspace ID.
const missingWorkspace: InferRequestType<typeof roles.$post>["param"] =
  emptyParameters;

void [missingWorkspace];
