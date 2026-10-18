import type { AuthorizationErrorCode } from "@wodge/domain/authorization/errors";
import type { BillingErrorCode } from "@wodge/domain/billing/errors";
import type { DiscussionErrorCode } from "@wodge/domain/discussions/errors";
import type { PageErrorCode } from "@wodge/domain/pages/errors";
import type { RoomErrorCode } from "@wodge/domain/rooms/errors";
import type { WorkspaceErrorCode } from "@wodge/domain/workspace/errors";

export const applicationErrorStatus = {
  AUTHORIZATION_FORBIDDEN: 403,
  AUTHORIZATION_CONFLICT: 409,
  AUTHORIZATION_NOT_FOUND: 404,
  AUTHORIZATION_INVALID_INPUT: 400,
  AUTHORIZATION_UNAVAILABLE: 503,
  WORKSPACE_CONFLICT: 409,
  WORKSPACE_DEPENDENCY_FAILURE: 502,
  WORKSPACE_FORBIDDEN: 403,
  WORKSPACE_INVALID_INPUT: 400,
  WORKSPACE_NOT_FOUND: 404,
  ROOM_CONFLICT: 409,
  ROOM_FORBIDDEN: 403,
  ROOM_INVALID_INPUT: 400,
  ROOM_NOT_FOUND: 404,
  DISCUSSION_CONFLICT: 409,
  DISCUSSION_FORBIDDEN: 403,
  DISCUSSION_INVALID_INPUT: 400,
  DISCUSSION_NOT_FOUND: 404,
  PAGE_FORBIDDEN: 403,
  BILLING_FORBIDDEN: 403,
  BILLING_WORKSPACE_NOT_FOUND: 404,
  BILLING_ALREADY_PREMIUM: 400,
  BILLING_NOT_PREMIUM: 400,
  BILLING_PRICE_NOT_FOUND: 404,
  BILLING_CHECKOUT_URL_MISSING: 400,
} satisfies Record<
  | AuthorizationErrorCode
  | WorkspaceErrorCode
  | RoomErrorCode
  | DiscussionErrorCode
  | PageErrorCode
  | BillingErrorCode,
  number
>;
