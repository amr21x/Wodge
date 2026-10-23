import { isTeamMember } from "@wodge/auth/authorization/access";
import { discussionInputSchemas } from "@wodge/domain/discussions/validation";
import { createEntityId } from "@wodge/domain/identifiers";
import { pageInputSchemas } from "@wodge/domain/pages/validation";
import { roomInputSchemas } from "@wodge/domain/rooms/validation";
import { workspaceInputSchemas } from "@wodge/domain/workspace/validation";
export const browserContracts = {
  createEntityId,
  workspaceInputSchemas,
  roomInputSchemas,
  pageInputSchemas,
  discussionInputSchemas,
  isTeamMember,
};
