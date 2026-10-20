import type { z } from "zod";
import type { workspaceInputSchemas } from "./validation";

export type WorkspaceInputs = {
  [Operation in keyof typeof workspaceInputSchemas]: z.output<
    (typeof workspaceInputSchemas)[Operation]
  >;
};

export type TeamUpdateArgs = WorkspaceInputs["updateTeam"];

export type NewPageArgs = WorkspaceInputs["createPage"];

export type NewRoomArgs = WorkspaceInputs["createRoom"];

export type NewThreadArgs = WorkspaceInputs["createThread"];

export type NewFolderArgs = WorkspaceInputs["updateFolder"];

export type DeleteChannelArgs = WorkspaceInputs["deleteChannel"];

export interface JoinPreviewDto {
  data?: {
    invites: import("./models").Invite;
    users: import("../user/models").UserType;
  };
  workspace?: import("./models").Workspace;
  membership?: { userId: string; workspaceId: string };
}
