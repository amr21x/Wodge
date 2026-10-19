import { ApplicationError } from "@wodge/core/errors";
import type { WorkspaceErrorCode } from "@wodge/domain/workspace/errors";
export function workspaceError(
  code: WorkspaceErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return new ApplicationError(code, message, details);
}
