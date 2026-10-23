import { DrObj } from "@wodge/domain/types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";

export interface WorkspaceTeamMutation {
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
  teamId: string;
}

export interface WorkspaceChannelMutation {
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
  channelId: string;
  folderId?: string;
  teamId: string;
}
