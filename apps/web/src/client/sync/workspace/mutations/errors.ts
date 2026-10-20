import { optimisticError } from "../../error";
import type { WorkspaceErrorCode } from "@wodge/domain/workspace/errors";
export function workspaceError(
  code: WorkspaceErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return optimisticError(code, message, details);
}
