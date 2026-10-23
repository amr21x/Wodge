import { optimisticError } from "../../error";
import type { PageErrorCode } from "@wodge/domain/pages/errors";
export function pagesError(
  code: PageErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return optimisticError(code, message, details);
}
