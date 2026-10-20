import { and, eq, max, min } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import {
  thread_posts,
  thread_comments,
} from "@wodge/domain/discussions/schema/object";
import type {
  ThreadPost,
  ThreadMessage,
} from "@wodge/domain/discussions/models";
import {
  ThreadPostSchema,
  ThreadMessageSchema,
} from "@wodge/domain/discussions/validation";
import type { ThreadPartyInterface } from "@wodge/domain/sync/state";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { DiscussionRecordRepository, postRow } from "./records";
import { PollRepository } from "@wodge/core/polls/repositories/polls";
import {
  loadRecordMetadata,
  saveRecordMetadata,
} from "@wodge/core/sync/repositories/metadata";

@injectable()
export class DiscussionRepository {
  constructor(
    @inject(DiscussionRecordRepository)
    private readonly records: DiscussionRecordRepository,
    @inject("thread") private readonly state: ThreadPartyInterface,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
    @inject(PollRepository) private readonly polls: PollRepository,
  ) {}
  async change(revision: number | undefined, operation: () => void) {
    await this.records.initialize();
    const next = this.db.transaction(() => {
      operation();
      saveRecordMetadata(this.db, "posts", {
        deleted: loadRecordMetadata(this.db, "posts")?.deleted ?? false,
        lastModifiedVersion:
          revision ?? this.state.versions.get("globalVersion")! + 1,
      });
      return this.records.readPosts();
    });
    this.state.threadPosts = next;
  }
  findPost(id: string) {
    const row = this.db
      .select()
      .from(thread_posts)
      .where(eq(thread_posts.id, id))
      .get();
    return (
      row &&
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
        ...this.polls.get(id),
        comments: [],
      })
    );
  }
  findComment(postId: string, id: string) {
    const row = this.db
      .select()
      .from(thread_comments)
      .where(
        and(eq(thread_comments.post_id, postId), eq(thread_comments.id, id)),
      )
      .get();
    return (
      row &&
      ThreadMessageSchema.parse({
        id: row.id,
        author: row.author,
        content: row.content,
        createdAt: row.created_at,
        type: row.type,
        isEdited: row.is_edited === null ? undefined : row.is_edited === 1,
      })
    );
  }
  insertPost(post: ThreadPost) {
    const position =
      (this.db
        .select({ value: min(thread_posts.position) })
        .from(thread_posts)
        .get()?.value ?? 1) - 1;
    this.db.insert(thread_posts).values(postRow(post, position)).run();
    this.polls.insert(post);
    for (const comment of post.comments) this.insertComment(post.id, comment);
  }
  editPost(id: string, content: string, createdAt: string) {
    this.db
      .update(thread_posts)
      .set({ content, created_at: createdAt, is_edited: 1 })
      .where(eq(thread_posts.id, id))
      .run();
  }
  deletePost(id: string) {
    this.polls.delete(id);
    this.db.delete(thread_posts).where(eq(thread_posts.id, id)).run();
  }
  resolvePost(id: string, isResolved: boolean) {
    this.db
      .update(thread_posts)
      .set({ is_resolved: Number(isResolved) })
      .where(eq(thread_posts.id, id))
      .run();
  }
  insertComment(postId: string, comment: ThreadMessage) {
    const position =
      (this.db
        .select({ value: max(thread_comments.position) })
        .from(thread_comments)
        .where(eq(thread_comments.post_id, postId))
        .get()?.value ?? -1) + 1;
    this.db
      .insert(thread_comments)
      .values({
        post_id: postId,
        id: comment.id,
        position,
        author: comment.author,
        content: comment.content,
        created_at: comment.createdAt,
        type: comment.type,
        is_edited:
          comment.isEdited === undefined ? null : Number(comment.isEdited),
      })
      .run();
  }
  editComment(postId: string, id: string, content: string, createdAt: string) {
    this.db
      .update(thread_comments)
      .set({ content, created_at: createdAt, is_edited: 1 })
      .where(
        and(eq(thread_comments.post_id, postId), eq(thread_comments.id, id)),
      )
      .run();
  }
  deleteComment(postId: string, id: string) {
    this.db
      .delete(thread_comments)
      .where(
        and(eq(thread_comments.post_id, postId), eq(thread_comments.id, id)),
      )
      .run();
  }
  castVote(id: string, userId: string, option: number) {
    this.polls.cast(id, userId, option);
  }
  removeVote(id: string, userId: string, option: number) {
    this.polls.remove(id, userId, option);
  }
}
