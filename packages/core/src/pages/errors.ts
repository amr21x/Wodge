import { ApplicationError } from "@wodge/core/errors";
import type { PageErrorCode } from "@wodge/domain/pages/errors";
export function pagesError(
  code: PageErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return new ApplicationError(code, message, details);
}
