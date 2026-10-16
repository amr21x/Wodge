import { WriteTransaction } from "replicache";
import {
  WorkspaceMembers,
  WorkspaceStructure,
  Workspace,
  Member,
  Group,
} from "../../schemas/workspace.schema";
import {
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "../../lib/keys";

import {
  teamUpdateRunner,
  type TeamUpdate,
} from "./mutators/team-update-runner";
import { createTeamMutation } from "./mutators/create-team";
import { deleteTeamMutation } from "./mutators/delete-team";
import { queryClient } from "../../lib/query-client";
import { PublicUserType } from "../../schemas/user.schema";
import { removeMemberMutation } from "./mutators/remove-member";
import { changeMemberRoleMutation } from "./mutators/change-member-role";
import { createGroupMutation } from "./mutators/create-group";
import { GroupUpdate, groupUpdateRunner } from "./mutators/group-update-runner";
import { deleteGroupMutation } from "./mutators/delete-group";
import { createPageMutation } from "./mutators/create-page";
import { createRoomMutation } from "./mutators/create-room";
import { createThreadMutation } from "./mutators/create-thread";
import { ChannelsTypes } from "@wodge/domain/channels";
import { Folder, Team } from "../../schemas/team.schema";
import { Room } from "../../schemas/room.schema";
import { Thread } from "../../schemas/thread.schema";
import { deleteChannelMutation } from "./mutators/delete-channel";
import { updatePageMutation } from "./mutators/update-page";
import { updateRoomMutation } from "./mutators/update-room";
import { updateThreadMutation } from "./mutators/update-thread";
import { updateFolderMutation } from "./mutators/update-folder";
import { deleteFolderMutation } from "./mutators/delete-folder";
import { Page } from "@wodge/domain/pages";

export interface TeamUpdateArgs {
  teamUpdate: TeamUpdate;
  teamId: string;
}

export interface GroupUpdateArgs {
  groupUpdate: GroupUpdate;
  groupId: string;
}

export interface WorkspaceUpdateArgs {
  update: {
    name: Workspace["name"];
    avatar?: Workspace["avatar"];
  };
}

export interface NewPageArgs extends Page {
  teamId: string;
  folderId: string;
}

export interface NewRoomArgs extends Room {
  teamId: string;
}
export interface NewFolderArgs extends Folder {
  teamId: string;
}

export interface NewThreadArgs extends Thread {
  teamId: string;
}
export interface VoteArgs {
  teamId: string;
  threadId: string;
  option: number;
}

interface RoleUpdateArgs {
  memberId: string;
  role: Member["role"];
}

export const workspaceMutators = {
  async removeMember(tx: WriteTransaction, memberId: string) {
    const workspaceMembers = await tx.get<WorkspaceMembers>(
      makeWorkspaceMembersKey()
    );

    if (!workspaceMembers) throw new Error("Bad data");

    const updateMembers = removeMemberMutation({
      memberId,
      members: workspaceMembers,
    });

    await tx.set(makeWorkspaceMembersKey(), updateMembers);
  },

  async changeMemberRole(tx: WriteTransaction, roleUpdate: RoleUpdateArgs) {
    const workspaceMembers = await tx.get<WorkspaceMembers>(
      makeWorkspaceMembersKey()
    );

    if (!workspaceMembers) throw new Error("Bad data");

    const updateMembers = changeMemberRoleMutation({
      ...roleUpdate,
      members: workspaceMembers,
    });

    await tx.set(makeWorkspaceMembersKey(), updateMembers);
  },

  async createTeam(
    tx: WriteTransaction,
    data: Pick<Team, "id" | "name" | "avatar">
  ) {
    // 1. Create the team
    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) throw new Error("User not found");

    const structure = await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    );

    if (!structure) throw new Error("Bad data");

    const newStructure = createTeamMutation({
      team: data,
      structure,
      currentUserId: user.id,
    });

    // 2. Persist the mutation
    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async updateTeam(tx: WriteTransaction, update: TeamUpdateArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    ))!;

    const members = await tx.get<WorkspaceMembers>(makeWorkspaceMembersKey());

    if (!members) throw new Error("Bad data");
    if (!structure) throw new Error("Bad data");

    const { teamId, teamUpdate } = update;
    const curMembers = members.members.map((m) => m.id);

    const newStructure = teamUpdateRunner({
      structure,
      teamUpdate,
      teamId,
      curMembers,
    });

    // 3. Persist the mutation
    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async deleteTeam(tx: WriteTransaction, teamId: string) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    if (!structure) throw new Error("Bad data");

    const newStructure = deleteTeamMutation({
      structure,
      teamId,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async createGroup(
    tx: WriteTransaction,
    data: Omit<Group, "members" | "createdBy">
  ) {
    // 1. Create the group
    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) throw new Error("User not found");

    const structure = await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    );

    if (!structure) throw new Error("Bad data");

    const newStructure = createGroupMutation({
      group: data,
      structure,
      currentUserId: user.id,
    });

    // 2. Persist the mutation
    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async updateGroup(tx: WriteTransaction, update: GroupUpdateArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    ))!;

    const members = await tx.get<WorkspaceMembers>(makeWorkspaceMembersKey());

    if (!members) throw new Error("Bad data");
    if (!structure) throw new Error("Bad data");

    const { groupId, groupUpdate } = update;
    const curMembers = members.members.map((m) => m.id);

    const newStructure = groupUpdateRunner({
      structure,
      groupUpdate,
      groupId,
      curMembers,
    });

    // 3. Persist the mutation
    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async deleteGroup(tx: WriteTransaction, groupId: string) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    if (!structure) throw new Error("Bad data");

    const newStructure = deleteGroupMutation({
      structure,
      groupId,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async createPage(tx: WriteTransaction, data: NewPageArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const { folderId, teamId, ...page } = data;

    const newStructure = createPageMutation({
      page,
      teamId,
      folderId,
      structure,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async updatePage(tx: WriteTransaction, data: NewPageArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const { folderId, teamId, ...page } = data;

    const newStructure = updatePageMutation({
      page,
      teamId,
      folderId,
      structure,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },
  async updateRoom(tx: WriteTransaction, data: NewRoomArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const { teamId, ...room } = data;

    const newStructure = updateRoomMutation({
      room,
      teamId,
      structure,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },
  async updateThread(tx: WriteTransaction, data: NewThreadArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const { teamId, ...thread } = data;

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) throw new Error("User not found");

    const newStructure = updateThreadMutation({
      thread,
      teamId,
      structure,
      userId: user.id,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },
  async updateFolder(tx: WriteTransaction, data: NewFolderArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const { teamId, ...folder } = data;

    const newStructure = updateFolderMutation({
      folder,
      teamId,
      structure,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },
  async createRoom(tx: WriteTransaction, data: NewRoomArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const { teamId, ...room } = data;

    const newStructure = createRoomMutation({
      room,
      teamId,
      structure,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async createThread(tx: WriteTransaction, data: NewThreadArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const { teamId, ...thread } = data;

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) throw new Error("User not found");

    const newStructure = createThreadMutation({
      thread,
      curUserId: user.id,
      teamId,
      structure,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async deleteChannel(tx: WriteTransaction, data: DeleteChannelArgs) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const user = queryClient.getQueryData<PublicUserType>(["user"]);

    if (!user) throw new Error("User not found");

    const newStructure = deleteChannelMutation({
      channelId: data.channelId,
      folderId: data?.folderId,
      structure,
      teamId: data.teamId,
      type: data.type,
      isAdmin: true,
      userId: user.id,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },

  async deleteFolder(
    tx: WriteTransaction,
    data: { teamId: string; folderId: string }
  ) {
    const structure = (await tx.get<WorkspaceStructure>(
      makeWorkspaceStructureKey()
    )) as WorkspaceStructure;

    const newStructure = deleteFolderMutation({
      folderId: data.folderId,
      structure,
      teamId: data.teamId,
    });

    await tx.set(makeWorkspaceStructureKey(), newStructure);
  },
};

export type DeleteChannelArgs = {
  channelId: string;
  folderId?: string;
  teamId: string;
  type: ChannelsTypes;
};
