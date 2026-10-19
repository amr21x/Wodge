import { authorizationError } from "@wodge/core/authorization/errors";
import { RoomRecordRepository } from "@wodge/core/rooms/repositories/records";
import type { RoomAuthorizationScope } from "@wodge/domain/authorization/models";
import { inject, injectable } from "tsyringe";

@injectable()
export class RoomScope {
  constructor(
    @inject(RoomRecordRepository)
    private readonly repository: Pick<
      RoomRecordRepository,
      "loadRoomScope" | "saveRoomScope" | "hasRoomRecords"
    >,
  ) {}

  loadRoomScope() {
    return this.repository.loadRoomScope();
  }

  async bindRoomScope(scope: RoomAuthorizationScope) {
    const previous = await this.repository.loadRoomScope();
    if (
      previous &&
      (previous.workspaceId !== scope.workspaceId ||
        previous.teamId !== scope.teamId ||
        previous.roomId !== scope.roomId)
    ) {
      throw authorizationError(
        "AUTHORIZATION_CONFLICT",
        "Room is already bound to a different workspace or team",
      );
    }
    if (!previous) {
      if (await this.repository.hasRoomRecords()) {
        throw authorizationError(
          "AUTHORIZATION_CONFLICT",
          "Existing room data needs an explicit ownership migration before scope binding",
        );
      }
      await this.repository.saveRoomScope(scope);
    }
  }
}
