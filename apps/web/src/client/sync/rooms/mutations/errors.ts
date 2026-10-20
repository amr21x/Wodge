import { optimisticError } from "../../error";
import type { RoomErrorCode } from "@wodge/domain/rooms/errors";
export function roomsError(
  code: RoomErrorCode,
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
) {
  return optimisticError(code, message, details);
}
