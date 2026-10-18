import { ApplicationError } from "@wodge/core/errors";
import type { RoomErrorCode } from "@wodge/domain/rooms/errors";
export function roomsError(
  code: RoomErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return new ApplicationError(code, message, details);
}
