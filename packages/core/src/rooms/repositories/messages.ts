import { eq, max } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import { room_messages } from "@wodge/domain/rooms/schema/object";
import type { Message } from "@wodge/domain/rooms/models";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import type { RoomPartyInterface } from "@wodge/domain/sync/state";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { RoomRecordRepository, messageRow } from "./records";
import { PollRepository } from "@wodge/core/polls/repositories/polls";
import {
  loadRecordMetadata,
  saveRecordMetadata,
} from "@wodge/core/sync/repositories/metadata";

@injectable()
export class RoomRepository {
  constructor(
    @inject(RoomRecordRepository)
    private readonly records: RoomRecordRepository,
    @inject("room") private readonly state: RoomPartyInterface,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
    @inject(PollRepository) private readonly polls: PollRepository,
  ) {}
  async change(revision: number | undefined, operation: () => void) {
    await this.records.initialize();
    const next = this.db.transaction(() => {
      operation();
      saveRecordMetadata(this.db, "messages", {
        deleted: loadRecordMetadata(this.db, "messages")?.deleted ?? false,
        lastModifiedVersion:
          revision ?? this.state.versions.get("globalVersion")! + 1,
      });
      return this.records.readMessages();
    });
    this.state.messages = next;
  }
  find(id: string) {
    const row = this.db
      .select()
      .from(room_messages)
      .where(eq(room_messages.id, id))
      .get();
    return (
      row &&
      MessageSchema.parse({
        id: row.id,
        sender: row.sender,
        content: row.content,
        date: row.date,
        type: row.type,
        isEdited: row.is_edited === null ? undefined : row.is_edited === 1,
        isVoteOpen:
          row.is_vote_open === null ? undefined : row.is_vote_open === 1,
        ...this.polls.get(id),
      })
    );
  }
  insert(message: Message) {
    const position =
      (this.db
        .select({ value: max(room_messages.position) })
        .from(room_messages)
        .get()?.value ?? -1) + 1;
    this.db.insert(room_messages).values(messageRow(message, position)).run();
    this.polls.insert(message);
  }
  updateContent(id: string, content: string) {
    this.db
      .update(room_messages)
      .set({ content })
      .where(eq(room_messages.id, id))
      .run();
  }
  delete(id: string) {
    this.polls.delete(id);
    this.db.delete(room_messages).where(eq(room_messages.id, id)).run();
  }
  castVote(id: string, userId: string, option: number) {
    this.polls.cast(id, userId, option);
  }
  removeVote(id: string, userId: string, option: number) {
    this.polls.remove(id, userId, option);
  }
}
