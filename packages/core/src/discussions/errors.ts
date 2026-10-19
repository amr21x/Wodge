import { ApplicationError } from "@wodge/core/errors";
import type { DiscussionErrorCode } from "@wodge/domain/discussions/errors";
export function discussionsError(
  code: DiscussionErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return new ApplicationError(code, message, details);
}
