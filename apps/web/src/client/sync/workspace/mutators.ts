import type {
  TeamUpdateArgs,
  NewPageArgs,
  NewRoomArgs,
  NewFolderArgs,
  NewThreadArgs,
  DeleteChannelArgs,
} from "@wodge/domain/workspace/dto";
import { WriteTransaction } from "replicache";
import {
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";
import {
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";

import { teamUpdateRunner } from "./mutations/team-update-runner";
import { createTeamMutation } from "./mutations/create-team";
import { deleteTeamMutation } from "./mutations/delete-team";
import { createPageMutation } from "./mutations/create-page";
import { createRoomMutation } from "./mutations/create-room";
import { createThreadMutation } from "./mutations/create-thread";

import { Team } from "@wodge/domain/workspace/models";

import { deleteChannelMutation } from "./mutations/delete-channel";
import { updatePageMutation } from "./mutations/update-page";
import { updateRoomMutation } from "./mutations/update-room";
import { updateThreadMutation } from "./mutations/update-thread";
import { updateFolderMutation } from "./mutations/update-folder";
import { deleteFolderMutation } from "./mutations/delete-folder";

export type WorkspaceMutators = ReturnType<typeof createWorkspaceMutators>;

/** Keep optimistic identity tied to this replica, independent of profile cache timing. */
export function createWorkspaceMutators(userId: string) {
  return {
    async createTeam(
      tx: WriteTransaction,
      data: Pick<Team, "id" | "name" | "avatar">,
    ) {
      // 1. Create the team

      const structure = await tx.get<WorkspaceStructure>(
        makeWorkspaceStructureKey(),
      );

      if (!structure) {
        throw new Error("Bad data");
      }

      const newStructure = createTeamMutation({
        team: data,
        structure,
        currentUserId: userId,
      });

      // 2. Persist the mutation

      await tx.set(makeWorkspaceStructureKey(), newStructure);
    },

    async updateTeam(tx: WriteTransaction, update: TeamUpdateArgs) {
      const structure = (await tx.get<WorkspaceStructure>(
        makeWorkspaceStructureKey(),
      ))!;

      const members = await tx.get<WorkspaceMembers>(makeWorkspaceMembersKey());

      if (!members) {
        throw new Error("Bad data");
      }

      if (!structure) {
        throw new Error("Bad data");
      }

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
        makeWorkspaceStructureKey(),
      )) as WorkspaceStructure;

      if (!structure) {
        throw new Error("Bad data");
      }

      const newStructure = deleteTeamMutation({
        structure,
        teamId,
      });

      await tx.set(makeWorkspaceStructureKey(), newStructure);
    },

    async createPage(tx: WriteTransaction, data: NewPageArgs) {
      const structure = (await tx.get<WorkspaceStructure>(
        makeWorkspaceStructureKey(),
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
        makeWorkspaceStructureKey(),
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
        makeWorkspaceStructureKey(),
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
        makeWorkspaceStructureKey(),
      )) as WorkspaceStructure;

      const { teamId, ...thread } = data;

      const newStructure = updateThreadMutation({
        thread,
        teamId,
        structure,
        userId,
      });

      await tx.set(makeWorkspaceStructureKey(), newStructure);
    },
    async updateFolder(tx: WriteTransaction, data: NewFolderArgs) {
      const structure = (await tx.get<WorkspaceStructure>(
        makeWorkspaceStructureKey(),
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
        makeWorkspaceStructureKey(),
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
        makeWorkspaceStructureKey(),
      )) as WorkspaceStructure;

      const { teamId, ...thread } = data;

      const newStructure = createThreadMutation({
        thread,
        curUserId: userId,
        teamId,
        structure,
      });

      await tx.set(makeWorkspaceStructureKey(), newStructure);
    },

    async deleteChannel(tx: WriteTransaction, data: DeleteChannelArgs) {
      const structure = (await tx.get<WorkspaceStructure>(
        makeWorkspaceStructureKey(),
      )) as WorkspaceStructure;

      const newStructure = deleteChannelMutation({
        channelId: data.channelId,
        folderId: data?.folderId,
        structure,
        teamId: data.teamId,
        type: data.type,
        isAdmin: true,
        userId,
      });

      await tx.set(makeWorkspaceStructureKey(), newStructure);
    },

    async deleteFolder(
      tx: WriteTransaction,
      data: { teamId: string; folderId: string },
    ) {
      const structure = (await tx.get<WorkspaceStructure>(
        makeWorkspaceStructureKey(),
      )) as WorkspaceStructure;

      const newStructure = deleteFolderMutation({
        folderId: data.folderId,
        structure,
        teamId: data.teamId,
      });

      await tx.set(makeWorkspaceStructureKey(), newStructure);
    },
  };
}
