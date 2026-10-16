import "server-only";
import { getRequestContext } from "@cloudflare/next-on-pages";
import {
  createDataModels,
  createDb as createBoundDb,
} from "@wodge/data/server";

export function createDb() {
  return createBoundDb(getRequestContext().env.DB);
}

// The callback reads the active request only when an operation needs its DB.
export const {
  getUserById,
  getUserByUsername,
  updateUserById,
  getUserInfoById,
  createWorkspace,
  getWorkspacesByUserId,
  updateWorkspaceById,
  addWorkspaceMember,
  removeMember,
  deleteWorkspace,
  isWorkspaceMember,
  getWorkspaceById,
  upgradeWorkspace,
  revertWorkspace,
} = createDataModels(createDb);
