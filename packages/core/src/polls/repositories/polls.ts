import { and, eq, max, sql } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import {
  poll_options,
  poll_counts,
  poll_voters,
} from "@wodge/domain/polls/schema/object";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import type { Message } from "@wodge/domain/rooms/models";
import { reconcileRows } from "@wodge/infra/database/durable-sql";

type Poll = Pick<Message, "id" | "pollOptions" | "votes" | "pollVoters">;

export function savePolls(db: ObjectDatabase, parents: readonly Poll[]) {
  reconcileRows(
    db,
    poll_options,
    ["parent_id", "position"],
    parents.flatMap((poll) =>
      (poll.pollOptions ?? []).map((label, position) => ({
        parent_id: poll.id,
        position: position,
        label: label,
      })),
    ),
  );
  reconcileRows(
    db,
    poll_counts,
    ["parent_id", "position"],
    parents.flatMap((poll) =>
      (poll.votes ?? []).map((votes, position) => ({
        parent_id: poll.id,
        position: position,
        votes: votes,
      })),
    ),
  );
  reconcileRows(
    db,
    poll_voters,
    ["parent_id", "position"],
    parents.flatMap((poll) =>
      (poll.pollVoters ?? []).map((vote, position) => ({
        parent_id: poll.id,
        position: position,
        voter: vote.voter,
        option: vote.option,
      })),
    ),
  );
}

export function loadPolls(db: ObjectDatabase) {
  const polls = new Map<string, Omit<Poll, "id">>();
  const get = (id: string) => {
    let poll = polls.get(id);
    if (!poll) {
      poll = { pollOptions: [], votes: [], pollVoters: [] };
      polls.set(id, poll);
    }
    return poll;
  };
  for (const row of db
    .select()
    .from(poll_options)
    .orderBy(poll_options.position)
    .all())
    get(row.parent_id).pollOptions.push(row.label);
  for (const row of db
    .select()
    .from(poll_counts)
    .orderBy(poll_counts.position)
    .all())
    get(row.parent_id).votes.push(row.votes);
  for (const row of db
    .select()
    .from(poll_voters)
    .orderBy(poll_voters.position)
    .all())
    get(row.parent_id).pollVoters.push({
      voter: row.voter,
      option: row.option,
    });
  return polls;
}

@injectable()
export class PollRepository {
  constructor(@inject("objectDatabase") private readonly db: ObjectDatabase) {}
  get(parentId: string) {
    return {
      pollOptions: this.db
        .select()
        .from(poll_options)
        .where(eq(poll_options.parent_id, parentId))
        .orderBy(poll_options.position)
        .all()
        .map((row) => row.label),
      votes: this.db
        .select()
        .from(poll_counts)
        .where(eq(poll_counts.parent_id, parentId))
        .orderBy(poll_counts.position)
        .all()
        .map((row) => row.votes),
      pollVoters: this.db
        .select()
        .from(poll_voters)
        .where(eq(poll_voters.parent_id, parentId))
        .orderBy(poll_voters.position)
        .all()
        .map((row) => ({ voter: row.voter, option: row.option })),
    };
  }
  insert(poll: Poll) {
    for (const [position, label] of poll.pollOptions.entries())
      this.db
        .insert(poll_options)
        .values({ parent_id: poll.id, position, label })
        .run();
    for (const [position, votes] of poll.votes.entries())
      this.db
        .insert(poll_counts)
        .values({ parent_id: poll.id, position, votes })
        .run();
    for (const [position, vote] of poll.pollVoters.entries())
      this.db
        .insert(poll_voters)
        .values({ parent_id: poll.id, position, ...vote })
        .run();
  }
  delete(parentId: string) {
    this.db
      .delete(poll_options)
      .where(eq(poll_options.parent_id, parentId))
      .run();
    this.db
      .delete(poll_counts)
      .where(eq(poll_counts.parent_id, parentId))
      .run();
    this.db
      .delete(poll_voters)
      .where(eq(poll_voters.parent_id, parentId))
      .run();
  }
  cast(parentId: string, voter: string, option: number) {
    const position =
      (this.db
        .select({ value: max(poll_voters.position) })
        .from(poll_voters)
        .where(eq(poll_voters.parent_id, parentId))
        .get()?.value ?? -1) + 1;
    this.db
      .insert(poll_voters)
      .values({ parent_id: parentId, position, voter, option })
      .run();
    this.db
      .insert(poll_counts)
      .values({ parent_id: parentId, position: option, votes: 1 })
      .onConflictDoUpdate({
        target: [poll_counts.parent_id, poll_counts.position],
        set: { votes: sql`${poll_counts.votes}+1` },
      })
      .run();
  }
  remove(parentId: string, voter: string, option: number) {
    this.db
      .delete(poll_voters)
      .where(
        and(eq(poll_voters.parent_id, parentId), eq(poll_voters.voter, voter)),
      )
      .run();
    this.db
      .update(poll_counts)
      .set({ votes: sql`${poll_counts.votes}-1` })
      .where(
        and(
          eq(poll_counts.parent_id, parentId),
          eq(poll_counts.position, option),
        ),
      )
      .run();
  }
}
