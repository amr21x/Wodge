import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { legacyPermissionImports } from "@wodge/core/workspace/legacy-permissions";
import {
  workspace_permission_imports,
  workspace_presence,
  workspace_presence_import,
  workspace_permission_import_state,
} from "@wodge/domain/workspace/schema/object";
import {
  workspace_membership,
  workspace_members,
  workspace_folders,
  workspace_channels,
  workspace_team_members,
  workspace_teams,
} from "@wodge/domain/workspace/schema/object";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";
import { eq } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import {
  defaultWorkspaceMembers,
  defaultWorkspaceStructure,
} from "@wodge/core/workspace/defaults";
import {
  WORKSPACE_PRESENCE_KEY,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";
import type { WorkspacePartyInterface } from "@wodge/domain/sync/state";
import {
  WorkspaceMembersSchema,
  WorkspaceStructureSchema,
} from "@wodge/domain/workspace/validation";
import { ChannelSchema } from "@wodge/domain/channels/index";
import type { LegacyRecordStorage } from "@wodge/infra/durable-objects/storage";
import { reconcileRows } from "@wodge/infra/database/durable-sql";
import {
  loadRecordMetadata,
  saveRecordMetadata,
} from "@wodge/core/sync/repositories/metadata";

@injectable()
export class WorkspaceRecordRepository {
  constructor(
    @inject("storage") private readonly legacyStorage: LegacyRecordStorage,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
    @inject(ObjectSyncRepository) private readonly sync: ObjectSyncRepository,
  ) {}
  private initialization?: Promise<void>;
  initialize() {
    return (this.initialization ??= this.loadWorkspace().then(() => {}));
  }
  private prepare() {
    return prepareObjectDatabase(this.db, "workspace");
  }
  async loadWorkspace(): Promise<WorkspacePartyInterface> {
    await this.prepare();
    const db = this.db;
    if (!loadRecordMetadata(this.db, "members")) {
      await this.saveMembers(
        (await this.legacyStorage.get<
          WorkspacePartyInterface["workspaceMembers"]
        >(makeWorkspaceMembersKey())) ?? {
          data: defaultWorkspaceMembers(),
          lastModifiedVersion: 0,
          deleted: false,
        },
      );
    }
    if (!loadRecordMetadata(this.db, "structure")) {
      const legacy = await this.legacyStorage.get<
        WorkspacePartyInterface["workspaceStructure"]
      >(makeWorkspaceStructureKey());
      if (legacy) this.importPermissions(legacy.data);
      await this.saveStructure(
        legacy ?? {
          data: defaultWorkspaceStructure(),
          lastModifiedVersion: 0,
          deleted: false,
        },
      );
    }

    return {
      ...this.readState(),
      versions: await this.sync.loadVersions(
        new Map([
          ["globalVersion", 0],
          ["workspaceInfo", 0],
        ]),
      ),
      presenceMap: await this.loadPresence(),
    };
  }
  readState() {
    const db = this.db;
    const membership = db
      .select()
      .from(workspace_membership)
      .where(eq(workspace_membership.id, 1))
      .get()!;
    const members = db
      .select()
      .from(workspace_members)
      .orderBy(workspace_members.position)
      .all()
      .map((row) => ({
        id: row.id,
        role: row.role,
        joinInfo: {
          token: row.token,
          createdBy: row.created_by,
          joinedAt: row.joined_at,
        },
      }));
    const folders = db
      .select()
      .from(workspace_folders)
      .orderBy(workspace_folders.position)
      .all();
    const channelRows = db
      .select()
      .from(workspace_channels)
      .orderBy(workspace_channels.position)
      .all();
    const teamMembers = db
      .select()
      .from(workspace_team_members)
      .orderBy(workspace_team_members.position)
      .all();
    const channels = (
      teamId: string,
      kind: string,
      folderId: string | null = null,
    ) =>
      channelRows
        .filter(
          (row) =>
            row.team_id === teamId &&
            row.kind === kind &&
            row.folder_id === folderId,
        )
        .map((row) =>
          ChannelSchema.parse({
            id: row.id,
            name: row.name,
            avatar: row.avatar ?? undefined,
          }),
        );
    const teams = db
      .select()
      .from(workspace_teams)
      .orderBy(workspace_teams.position)
      .all()
      .map((row) => ({
        id: row.id,
        name: row.name,
        avatar: row.avatar ?? undefined,
        createdBy: row.created_by,
        default: row.is_default === 1,
        members: teamMembers
          .filter(
            (member) => member.team_id === row.id && member.kind === "member",
          )
          .map((member) => member.user_id),
        moderators: teamMembers
          .filter(
            (member) =>
              member.team_id === row.id && member.kind === "moderator",
          )
          .map((member) => member.user_id),
        folders: folders
          .filter((folder) => folder.team_id === row.id)
          .map((folder) => ({
            id: folder.id,
            name: folder.name,
            parentFolder: folder.parent_folder ?? undefined,
            channels: channels(row.id, "page", folder.id),
          })),
        rooms: channels(row.id, "room"),
        threads: channels(row.id, "thread"),
      }));
    return {
      workspaceMembers: {
        ...loadRecordMetadata(db, "members")!,
        data: WorkspaceMembersSchema.parse({
          createdBy: membership.created_by,
          members,
        }),
      },
      workspaceStructure: {
        ...loadRecordMetadata(db, "structure")!,
        data: WorkspaceStructureSchema.parse({ teams }),
      },
    };
  }

  private async loadPresence() {
    if (!this.db.select().from(workspace_presence_import).get()) {
      const legacy = await this.legacyStorage.get<Map<string, boolean>>(
        WORKSPACE_PRESENCE_KEY,
      );
      this.db.transaction(() => {
        if (this.db.select().from(workspace_presence_import).get()) return;
        this.writePresence(legacy ?? new Map());
        this.db.insert(workspace_presence_import).values({ id: 1 }).run();
      });
    }
    return new Map(
      this.db
        .select()
        .from(workspace_presence)
        .all()
        .map((row) => [row.user_id, row.online === 1]),
    );
  }
  writePresence(presence: ReadonlyMap<string, boolean>) {
    reconcileRows(
      this.db,
      workspace_presence,
      ["user_id"],
      [...presence].map(([user_id, online]) => ({
        user_id,
        online: Number(online),
      })),
    );
  }
  private importPermissions(data: unknown) {
    this.db.transaction(() => {
      this.db.delete(workspace_permission_imports).run();
      for (const row of legacyPermissionImports(data))
        this.db
          .insert(workspace_permission_imports)
          .values(row)
          .onConflictDoNothing()
          .run();
      this.db
        .insert(workspace_permission_import_state)
        .values({ id: 1, complete: 0 })
        .onConflictDoNothing()
        .run();
    });
  }
  async loadPermissionImports() {
    await this.prepare();
    const state = this.db
      .select()
      .from(workspace_permission_import_state)
      .where(eq(workspace_permission_import_state.id, 1))
      .get();
    return state?.complete === 0
      ? this.db.select().from(workspace_permission_imports).all()
      : null;
  }
  async finishPermissionImport() {
    await this.prepare();
    this.db.transaction(() => {
      this.db.delete(workspace_permission_imports).run();
      this.db
        .update(workspace_permission_import_state)
        .set({ complete: 1 })
        .where(eq(workspace_permission_import_state.id, 1))
        .run();
    });
  }
  async saveMembers(record: WorkspacePartyInterface["workspaceMembers"]) {
    await this.prepare();
    this.writeMembers(record);
  }
  writeMembers(record: WorkspacePartyInterface["workspaceMembers"]) {
    this.db.transaction(() => {
      reconcileRows(
        this.db,
        workspace_membership,
        ["id"],
        [
          {
            id: 1,
            created_by: record.data.createdBy,
          },
        ],
      );
      reconcileRows(
        this.db,
        workspace_members,
        ["id"],
        record.data.members.map((member, position) => ({
          id: member.id,
          position: position,
          role: member.role,
          token: member.joinInfo.token,
          created_by: member.joinInfo.createdBy,
          joined_at: member.joinInfo.joinedAt,
        })),
      );
      saveRecordMetadata(this.db, "members", record);
    });
  }
  async saveStructure(record: WorkspacePartyInterface["workspaceStructure"]) {
    await this.prepare();
    this.writeStructure(record);
  }
  writeStructure(record: WorkspacePartyInterface["workspaceStructure"]) {
    const { teams } = record.data;
    const channels: (typeof workspace_channels.$inferSelect)[] = [];
    for (const team of teams) {
      const collections = [
        ...team.folders.map((folder) => ({
          kind: "page",
          folderId: folder.id,
          channels: folder.channels,
        })),
        { kind: "room", folderId: null, channels: team.rooms },
        { kind: "thread", folderId: null, channels: team.threads },
      ];
      for (const collection of collections)
        collection.channels.forEach((channel, position) => {
          channels.push({
            team_id: team.id,
            kind: collection.kind,
            id: channel.id,
            folder_id: collection.folderId,
            position: position,
            name: channel.name,
            avatar: channel.avatar ?? null,
          });
        });
    }
    this.db.transaction(() => {
      const db = this.db;
      reconcileRows(
        db,
        workspace_teams,
        ["id"],
        teams.map((team, position) => ({
          id: team.id,
          position: position,
          name: team.name,
          avatar: team.avatar ?? null,
          created_by: team.createdBy,
          is_default: Number(team.default),
        })),
      );
      reconcileRows(
        db,
        workspace_team_members,
        ["team_id", "kind", "position"],
        teams.flatMap((team) => [
          ...team.members.map((id, position) => ({
            team_id: team.id,
            kind: "member",
            position: position,
            user_id: id,
          })),
          ...team.moderators.map((id, position) => ({
            team_id: team.id,
            kind: "moderator",
            position: position,
            user_id: id,
          })),
        ]),
      );
      reconcileRows(
        db,
        workspace_folders,
        ["team_id", "id"],
        teams.flatMap((team) =>
          team.folders.map((folder, position) => ({
            team_id: team.id,
            id: folder.id,
            position: position,
            name: folder.name,
            parent_folder: folder.parentFolder ?? null,
          })),
        ),
      );
      reconcileRows(
        db,
        workspace_channels,
        ["team_id", "kind", "id"],
        channels,
      );
      saveRecordMetadata(db, "structure", record);
    });
  }
}
