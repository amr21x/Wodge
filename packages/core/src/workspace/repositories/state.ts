import { and, eq, inArray, notInArray, max, count } from "drizzle-orm";
import {
  workspace_teams,
  workspace_team_members,
  workspace_members,
  workspace_folders,
  workspace_channels,
} from "@wodge/domain/workspace/schema/object";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import type { Channel } from "@wodge/domain/channels/index";
import type { Folder, Team } from "@wodge/domain/workspace/models";
import {
  loadRecordMetadata,
  saveRecordMetadata,
} from "@wodge/core/sync/repositories/metadata";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import type { WorkspacePartyInterface } from "@wodge/domain/sync/state";
import type {
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";
import { inject, injectable } from "tsyringe";

@injectable()
export class WorkspaceStateRepository {
  constructor(
    @inject(WorkspaceRecordRepository)
    protected readonly records: WorkspaceRecordRepository,
    @inject("workspace") protected readonly state: WorkspacePartyInterface,
    @inject("objectDatabase") protected readonly db: ObjectDatabase,
  ) {}

  get members() {
    return this.state.workspaceMembers.data;
  }

  set members(data: WorkspaceMembers) {
    this.state.workspaceMembers = { ...this.state.workspaceMembers, data };
  }

  get structure() {
    return this.state.workspaceStructure.data;
  }

  set structure(data: WorkspaceStructure) {
    this.state.workspaceStructure = { ...this.state.workspaceStructure, data };
  }

  private markStructure(revision: number) {
    this.state.workspaceStructure = {
      ...this.state.workspaceStructure,
      lastModifiedVersion: revision,
    };
  }

  async saveStructure(
    revision = this.state.versions.get("globalVersion")! + 1,
  ) {
    this.markStructure(revision);

    await this.records.saveStructure(this.state.workspaceStructure);
  }
  async change(revision: number | undefined, operation: () => void) {
    await this.records.initialize();
    const next = this.db.transaction(() => {
      operation();
      saveRecordMetadata(this.db, "structure", {
        lastModifiedVersion:
          revision ?? this.state.versions.get("globalVersion")! + 1,
        deleted: loadRecordMetadata(this.db, "structure")?.deleted ?? false,
      });
      return this.records.readState().workspaceStructure;
    });
    this.state.workspaceStructure = next;
  }
  team(id: string) {
    return this.db
      .select()
      .from(workspace_teams)
      .where(eq(workspace_teams.id, id))
      .get();
  }
  teamCount() {
    return this.db.select({ value: count() }).from(workspace_teams).get()!
      .value;
  }
  folder(teamId: string, id: string) {
    return this.db
      .select()
      .from(workspace_folders)
      .where(
        and(
          eq(workspace_folders.team_id, teamId),
          eq(workspace_folders.id, id),
        ),
      )
      .get();
  }
  channel(teamId: string, kind: string, id: string) {
    return this.db
      .select()
      .from(workspace_channels)
      .where(
        and(
          eq(workspace_channels.team_id, teamId),
          eq(workspace_channels.kind, kind),
          eq(workspace_channels.id, id),
        ),
      )
      .get();
  }
  workspaceMember(id: string) {
    return this.db
      .select({ id: workspace_members.id })
      .from(workspace_members)
      .where(eq(workspace_members.id, id))
      .get();
  }
  insertTeam(team: Team) {
    const position =
      (this.db
        .select({ value: max(workspace_teams.position) })
        .from(workspace_teams)
        .get()?.value ?? -1) + 1;
    this.db
      .insert(workspace_teams)
      .values({
        id: team.id,
        position,
        name: team.name,
        avatar: team.avatar ?? null,
        created_by: team.createdBy,
        is_default: Number(team.default),
      })
      .run();
    for (const userId of team.members)
      this.addTeamMember(team.id, "member", userId);
    for (const userId of team.moderators)
      this.addTeamMember(team.id, "moderator", userId);
    for (const folder of team.folders) this.insertFolder(team.id, folder);
    for (const room of team.rooms) this.insertChannel(team.id, "room", room);
    for (const thread of team.threads)
      this.insertChannel(team.id, "thread", thread);
  }
  updateTeam(id: string, input: { name: string; avatar?: string }) {
    this.db
      .update(workspace_teams)
      .set({ name: input.name, avatar: input.avatar ?? null })
      .where(eq(workspace_teams.id, id))
      .run();
  }
  deleteTeam(id: string) {
    this.db.delete(workspace_teams).where(eq(workspace_teams.id, id)).run();
  }
  teamMembers(teamId: string, kind: "member" | "moderator") {
    return this.db
      .select()
      .from(workspace_team_members)
      .where(
        and(
          eq(workspace_team_members.team_id, teamId),
          eq(workspace_team_members.kind, kind),
        ),
      )
      .orderBy(workspace_team_members.position)
      .all()
      .map((row) => row.user_id);
  }
  addTeamMember(teamId: string, kind: "member" | "moderator", userId: string) {
    const position =
      (this.db
        .select({ value: max(workspace_team_members.position) })
        .from(workspace_team_members)
        .where(
          and(
            eq(workspace_team_members.team_id, teamId),
            eq(workspace_team_members.kind, kind),
          ),
        )
        .get()?.value ?? -1) + 1;
    this.db
      .insert(workspace_team_members)
      .values({ team_id: teamId, kind, position, user_id: userId })
      .run();
  }
  removeTeamMembers(
    teamId: string,
    kind: "member" | "moderator",
    ids: readonly string[],
  ) {
    if (ids.length)
      this.db
        .delete(workspace_team_members)
        .where(
          and(
            eq(workspace_team_members.team_id, teamId),
            eq(workspace_team_members.kind, kind),
            inArray(workspace_team_members.user_id, [...ids]),
          ),
        )
        .run();
  }
  insertFolder(teamId: string, folder: Folder) {
    const position =
      (this.db
        .select({ value: max(workspace_folders.position) })
        .from(workspace_folders)
        .where(eq(workspace_folders.team_id, teamId))
        .get()?.value ?? -1) + 1;
    this.db
      .insert(workspace_folders)
      .values({
        team_id: teamId,
        id: folder.id,
        position,
        name: folder.name,
        parent_folder: folder.parentFolder ?? null,
      })
      .run();
    for (const channel of folder.channels)
      this.insertChannel(teamId, "page", channel, folder.id);
  }
  updateFolder(teamId: string, folder: Folder) {
    this.db
      .update(workspace_folders)
      .set({ name: folder.name, parent_folder: folder.parentFolder ?? null })
      .where(
        and(
          eq(workspace_folders.team_id, teamId),
          eq(workspace_folders.id, folder.id),
        ),
      )
      .run();
    const scope = and(
      eq(workspace_channels.team_id, teamId),
      eq(workspace_channels.kind, "page"),
      eq(workspace_channels.folder_id, folder.id),
    );
    this.db
      .delete(workspace_channels)
      .where(
        folder.channels.length
          ? and(
              scope,
              notInArray(
                workspace_channels.id,
                folder.channels.map((page) => page.id),
              ),
            )
          : scope,
      )
      .run();
    for (const [position, channel] of folder.channels.entries())
      this.db
        .insert(workspace_channels)
        .values({
          team_id: teamId,
          kind: "page",
          id: channel.id,
          folder_id: folder.id,
          position,
          name: channel.name,
          avatar: channel.avatar ?? null,
        })
        .onConflictDoUpdate({
          target: [
            workspace_channels.team_id,
            workspace_channels.kind,
            workspace_channels.id,
          ],
          set: {
            folder_id: folder.id,
            position,
            name: channel.name,
            avatar: channel.avatar ?? null,
          },
        })
        .run();
  }
  deleteFolder(teamId: string, id: string) {
    this.db
      .delete(workspace_channels)
      .where(
        and(
          eq(workspace_channels.team_id, teamId),
          eq(workspace_channels.kind, "page"),
          eq(workspace_channels.folder_id, id),
        ),
      )
      .run();
    this.db
      .delete(workspace_folders)
      .where(
        and(
          eq(workspace_folders.team_id, teamId),
          eq(workspace_folders.id, id),
        ),
      )
      .run();
  }
  insertChannel(
    teamId: string,
    kind: "page" | "room" | "thread",
    channel: Channel,
    folderId?: string,
  ) {
    const scope = and(
      eq(workspace_channels.team_id, teamId),
      eq(workspace_channels.kind, kind),
      folderId ? eq(workspace_channels.folder_id, folderId) : undefined,
    );
    const position =
      (this.db
        .select({ value: max(workspace_channels.position) })
        .from(workspace_channels)
        .where(scope)
        .get()?.value ?? -1) + 1;
    this.db
      .insert(workspace_channels)
      .values({
        team_id: teamId,
        kind,
        id: channel.id,
        folder_id: folderId ?? null,
        position,
        name: channel.name,
        avatar: channel.avatar ?? null,
      })
      .run();
  }
  updateChannel(
    teamId: string,
    kind: "page" | "room" | "thread",
    channel: Channel,
  ) {
    this.db
      .update(workspace_channels)
      .set({ name: channel.name, avatar: channel.avatar ?? null })
      .where(
        and(
          eq(workspace_channels.team_id, teamId),
          eq(workspace_channels.kind, kind),
          eq(workspace_channels.id, channel.id),
        ),
      )
      .run();
  }
  deleteChannel(teamId: string, kind: string, id: string, folderId?: string) {
    this.db
      .delete(workspace_channels)
      .where(
        and(
          eq(workspace_channels.team_id, teamId),
          eq(workspace_channels.kind, kind),
          eq(workspace_channels.id, id),
          folderId ? eq(workspace_channels.folder_id, folderId) : undefined,
        ),
      )
      .run();
  }
}
