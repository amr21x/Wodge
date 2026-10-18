import { ApplicationError } from "@wodge/core/errors";
import type { AuthorizationErrorCode } from "@wodge/domain/authorization/errors";
export function authorizationError(
  code: AuthorizationErrorCode,
  message: string,
) {
  return new ApplicationError(code, message);
}
