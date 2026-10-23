import { eq } from "drizzle-orm";
import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import type { Message } from "@wodge/domain/rooms/models";
import { room_messages, room_scope } from "@wodge/domain/rooms/schema/object";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";
import type { RoomAuthorizationScope } from "@wodge/domain/authorization/models";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import type { RoomPartyInterface } from "@wodge/domain/sync/state";
import type { LegacyRecordStorage } from "@wodge/infra/durable-objects/storage";
import { reconcileRows } from "@wodge/infra/database/durable-sql";
import {
  loadRecordMetadata,
  saveRecordMetadata,
} from "@wodge/core/sync/repositories/metadata";
import { loadPolls, savePolls } from "@wodge/core/polls/repositories/polls";
import { inject, injectable } from "tsyringe";

@injectable()
export class RoomRecordRepository {
  constructor(
    @inject("storage") private readonly legacyStorage: LegacyRecordStorage,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
    @inject(ObjectSyncRepository) private readonly sync: ObjectSyncRepository,
  ) {}
  private initialization?: Promise<void>;
  initialize() {
    return (this.initialization ??= this.loadRoom().then(() => {}));
  }
  private prepare() {
    return prepareObjectDatabase(this.db, "room");
  }
  async loadRoom(): Promise<RoomPartyInterface> {
    await this.prepare();
    if (!loadRecordMetadata(this.db, "messages")) {
      await this.loadRoomScope();
      if (this.db.select().from(room_scope).get()?.legacy_records) {
        const legacy =
          await this.legacyStorage.get<RoomPartyInterface["messages"]>(
            "messages",
          );
        // Untouched rooms must remain claimable by the workspace ownership guard.
        if (legacy) await this.saveMessages(legacy);
      }
    }
    return {
      messages: this.readMessages(),
      versions: await this.sync.loadVersions(),
    };
  }
  readMessages() {
    const polls = loadPolls(this.db);
    const data = this.db
      .select()
      .from(room_messages)
      .orderBy(room_messages.position)
      .all()
      .map((row) =>
        MessageSchema.parse({
          id: row.id,
          sender: row.sender,
          content: row.content,
          date: row.date,
          type: row.type,
          isEdited: row.is_edited === null ? undefined : row.is_edited === 1,
          isVoteOpen:
            row.is_vote_open === null ? undefined : row.is_vote_open === 1,
          ...polls.get(String(row.id)),
        }),
      );
    return {
      ...(loadRecordMetadata(this.db, "messages") ?? {
        lastModifiedVersion: 0,
        deleted: false,
      }),
      data,
    };
  }

  async saveMessages(record: RoomPartyInterface["messages"]) {
    await this.prepare();
    this.db.transaction(() => {
      reconcileRows(
        this.db,
        room_messages,
        ["id"],
        record.data.map(messageRow),
      );
      savePolls(this.db, record.data);
      saveRecordMetadata(this.db, "messages", record);
    });
  }
  async loadRoomScope() {
    await this.prepare();
    let row = this.db
      .select()
      .from(room_scope)
      .where(eq(room_scope.id, 1))
      .get();
    if (!row) {
      const legacy = await this.legacyStorage.get<RoomAuthorizationScope>(
        "authorization:room-scope:v1",
      );
      const legacyRecords =
        !!(await this.legacyStorage.get("messages")) ||
        (await this.sync.hasRecords());
      this.db
        .insert(room_scope)
        .values({
          id: 1,
          legacy_records: Number(legacyRecords),
          workspace_id: legacy?.workspaceId ?? null,
          team_id: legacy?.teamId ?? null,
          room_id: legacy?.roomId ?? null,
        })
        .onConflictDoNothing()
        .run();
      row = this.db.select().from(room_scope).where(eq(room_scope.id, 1)).get();
    }
    return row?.workspace_id && row.team_id && row.room_id
      ? {
          workspaceId: row.workspace_id,
          teamId: row.team_id,
          roomId: row.room_id,
        }
      : undefined;
  }
  async saveRoomScope(scope: RoomAuthorizationScope) {
    await this.prepare();
    this.db
      .insert(room_scope)
      .values({
        id: 1,
        workspace_id: scope.workspaceId,
        team_id: scope.teamId,
        room_id: scope.roomId,
      })
      .onConflictDoUpdate({
        target: room_scope.id,
        set: {
          workspace_id: scope.workspaceId,
          team_id: scope.teamId,
          room_id: scope.roomId,
        },
      })
      .run();
  }
  async hasRoomRecords() {
    await this.loadRoomScope();
    return (
      !!loadRecordMetadata(this.db, "messages") ||
      !!this.db.select().from(room_scope).get()?.legacy_records ||
      (await this.sync.hasRecords())
    );
  }
}

export function messageRow(message: Message, position: number) {
  return {
    id: message.id,
    position: position,
    sender: message.sender,
    content: message.content,
    date: message.date,
    type: message.type,
    is_edited: message.isEdited === undefined ? null : Number(message.isEdited),
    is_vote_open:
      message.isVoteOpen === undefined ? null : Number(message.isVoteOpen),
  };
}
