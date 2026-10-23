import { optimisticError } from "../../error";
import type { DiscussionErrorCode } from "@wodge/domain/discussions/errors";
export function discussionsError(
  code: DiscussionErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return optimisticError(code, message, details);
}
