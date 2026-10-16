import { DrObj, WorkspaceStructure } from "../../..";
import { Channel } from "@wodge/domain/channels";

export type UpdateableTeamFields = Omit<Channel, "id">;
