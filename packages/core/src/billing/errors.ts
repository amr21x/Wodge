import { ApplicationError } from "@wodge/core/errors";
import type { BillingErrorCode } from "@wodge/domain/billing/errors";
export function billingError(code: BillingErrorCode, message: string) {
  return new ApplicationError(code, message);
}
