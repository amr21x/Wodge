import type { z } from "zod";
import type { invites } from "./schema/d1";
import type * as Validation from "./validation";

export type Workspace = z.infer<typeof Validation.WorkspaceSchema> & {
  id: string;
};

export type Member = z.infer<typeof Validation.MemberSchema>;

export type Group = z.infer<typeof Validation.GroupSchema>;

export type WorkspaceStructure = z.infer<
  typeof Validation.WorkspaceStructureSchema
>;

export type WorkspaceMembers = z.infer<
  typeof Validation.WorkspaceMembersSchema
>;

export type NewWorkspace = z.infer<typeof Validation.NewWorkspaceSchema>;

export type Invite = typeof invites.$inferSelect;

export type Invites = Map<string, Invite>;

export type Team = z.infer<typeof Validation.TeamSchema>;

export type Folder = z.infer<typeof Validation.FolderSchema>;

/** Workspace business state, independent of its host and persistence API. */
export interface WorkspaceState {
  members: WorkspaceMembers;
  structure: WorkspaceStructure;
}
