import type { ApplicationFailure } from "../errors";
import type { BillingErrorCode } from "./errors";

export type BillingResult =
  | { url: string | null }
  | { error: ApplicationFailure<BillingErrorCode> };
