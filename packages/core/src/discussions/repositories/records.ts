import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import type { ThreadPost } from "@wodge/domain/discussions/models";
import {
  thread_comments,
  thread_posts,
} from "@wodge/domain/discussions/schema/object";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";
import { inject, injectable } from "tsyringe";
import {
  ThreadPostSchema,
  ThreadMessageSchema,
} from "@wodge/domain/discussions/validation";
import type { ThreadPartyInterface } from "@wodge/domain/sync/state";
import type { LegacyRecordStorage } from "@wodge/infra/durable-objects/storage";
import { reconcileRows } from "@wodge/infra/database/durable-sql";
import {
  loadRecordMetadata,
  saveRecordMetadata,
} from "@wodge/core/sync/repositories/metadata";
import { loadPolls, savePolls } from "@wodge/core/polls/repositories/polls";

@injectable()
export class DiscussionRecordRepository {
  constructor(
    @inject("storage") private readonly legacyStorage: LegacyRecordStorage,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
    @inject(ObjectSyncRepository) private readonly sync: ObjectSyncRepository,
  ) {}
  private initialization?: Promise<void>;
  initialize() {
    return (this.initialization ??= this.loadThread().then(() => {}));
  }
  private prepare() {
    return prepareObjectDatabase(this.db, "thread");
  }
  async loadThread(): Promise<ThreadPartyInterface> {
    await this.prepare();
    if (!loadRecordMetadata(this.db, "posts")) {
      const legacy =
        await this.legacyStorage.get<ThreadPartyInterface["threadPosts"]>(
          "posts",
        );
      await this.savePosts(
        legacy ?? { data: [], lastModifiedVersion: 0, deleted: false },
      );
    }
    return {
      threadPosts: this.readPosts(),
      versions: await this.sync.loadVersions(),
    };
  }
  readPosts() {
    const polls = loadPolls(this.db);
    const comments = new Map<
      string,
      ReturnType<typeof ThreadMessageSchema.parse>[]
    >();
    for (const row of this.db
      .select()
      .from(thread_comments)
      .orderBy(thread_comments.position)
      .all()) {
      const id = String(row.post_id);
      const list = comments.get(id) ?? [];
      list.push(
        ThreadMessageSchema.parse({
          id: row.id,
          author: row.author,
          content: row.content,
          createdAt: row.created_at,
          type: row.type,
          isEdited: row.is_edited === null ? undefined : row.is_edited === 1,
        }),
      );
      comments.set(id, list);
    }
    const data = this.db
      .select()
      .from(thread_posts)
      .orderBy(thread_posts.position)
      .all()
      .map((row) =>
        ThreadPostSchema.parse({
          id: row.id,
          author: row.author,
          content: row.content,
          createdAt: row.created_at,
          type: row.type,
          isResolved:
            row.is_resolved === null ? undefined : row.is_resolved === 1,
          isEdited: row.is_edited === null ? undefined : row.is_edited === 1,
          isVoteOpen:
            row.is_vote_open === null ? undefined : row.is_vote_open === 1,
          ...polls.get(String(row.id)),
          comments: comments.get(String(row.id)) ?? [],
        }),
      );
    return {
      ...(loadRecordMetadata(this.db, "posts") ?? {
        lastModifiedVersion: 0,
        deleted: false,
      }),
      data,
    };
  }

  async savePosts(record: ThreadPartyInterface["threadPosts"]) {
    await this.prepare();
    this.db.transaction(() => {
      reconcileRows(this.db, thread_posts, ["id"], record.data.map(postRow));
      reconcileRows(
        this.db,
        thread_comments,
        ["post_id", "id"],
        record.data.flatMap((post) =>
          (post.comments ?? []).map((comment, position) => ({
            post_id: post.id,
            id: comment.id,
            position: position,
            author: comment.author,
            content: comment.content,
            created_at: comment.createdAt,
            type: comment.type,
            is_edited:
              comment.isEdited === undefined ? null : Number(comment.isEdited),
          })),
        ),
      );
      savePolls(this.db, record.data);
      saveRecordMetadata(this.db, "posts", record);
    });
  }
}

export function postRow(post: ThreadPost, position: number) {
  return {
    id: post.id,
    position: position,
    author: post.author,
    content: post.content,
    created_at: post.createdAt,
    type: post.type,
    is_resolved: post.isResolved === undefined ? null : Number(post.isResolved),
    is_edited: post.isEdited === undefined ? null : Number(post.isEdited),
    is_vote_open:
      post.isVoteOpen === undefined ? null : Number(post.isVoteOpen),
  };
}
