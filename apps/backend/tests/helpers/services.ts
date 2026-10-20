import { UserService } from "@wodge/core/user/services/memberships";
import { UserWorkspaceRepository } from "@wodge/core/user/repositories/workspaces";
import { UserRecordRepository } from "@wodge/core/user/repositories/records";
import { vi } from "vitest";
import { attachSql } from "./sqlite";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import { PageRepository } from "@wodge/core/pages/repositories/page";
import { PageService } from "@wodge/core/pages/services/page";
import { RoomRecordRepository } from "@wodge/core/rooms/repositories/records";
import { RoomRepository } from "@wodge/core/rooms/repositories/messages";
import { RoomService } from "@wodge/core/rooms/services/messages";
import { DiscussionRecordRepository } from "@wodge/core/discussions/repositories/records";
import { DiscussionRepository } from "@wodge/core/discussions/repositories/posts";
import { DiscussionService } from "@wodge/core/discussions/services/posts";
import { PollRepository } from "@wodge/core/polls/repositories/polls";
import type { Db } from "@wodge/domain/pages/models";
import type { Message } from "@wodge/domain/rooms/models";
import type { ThreadPost } from "@wodge/domain/discussions/models";

function fixtureStorage(key: string, value: unknown) {
  const legacy = new Map([[key, value]]);
  const storage = attachSql({
    get: vi.fn(async (name: string) => structuredClone(legacy.get(name))),
    list: vi.fn(async () => new Map()),
    put: vi.fn(async () => {
      throw new Error("Unexpected runtime KV write");
    }),
  }) as unknown as DurableObjectStorage;
  return { storage, db: createObjectDatabase(storage) };
}
const record = <T>(data: T) => ({
  data,
  lastModifiedVersion: 0,
  deleted: false,
});
export function pageServiceFixture(data: Db = { columns: [], tasks: [] }) {
  const { storage, db } = fixtureStorage("db", record(data));
  const state = {
    state: { record: record(data) },
    versions: new Map([["globalVersion", 0]]),
  };
  const records = new PageRecordRepository(
    storage,
    db,
    new ObjectSyncRepository(storage, db, "page"),
  );
  const repository = new PageRepository(records, state, db);
  return {
    service: new PageService(repository),
    repository,
    state,
    storage,
    db,
    records,
  };
}
export function roomServiceFixture(data: Message[] = []) {
  const { storage, db } = fixtureStorage("messages", record(data));
  const state = {
    messages: record(data),
    versions: new Map([["globalVersion", 0]]),
  };
  const records = new RoomRecordRepository(
    storage,
    db,
    new ObjectSyncRepository(storage, db, "room"),
  );
  const repository = new RoomRepository(
    records,
    state,
    db,
    new PollRepository(db),
  );
  return {
    service: new RoomService(repository),
    repository,
    state,
    storage,
    db,
    records,
  };
}
export function discussionServiceFixture(data: ThreadPost[] = []) {
  const { storage, db } = fixtureStorage("posts", record(data));
  const state = {
    threadPosts: record(data),
    versions: new Map([["globalVersion", 0]]),
  };
  const records = new DiscussionRecordRepository(
    storage,
    db,
    new ObjectSyncRepository(storage, db, "thread"),
  );
  const repository = new DiscussionRepository(
    records,
    state,
    db,
    new PollRepository(db),
  );
  return {
    service: new DiscussionService(repository),
    repository,
    state,
    storage,
    db,
    records,
  };
}

export function userServiceFixture() {
  const { storage, db } = fixtureStorage("workspaces", new Set());
  const state = {
    workspacesStore: new Set<string>(),
    versions: new Map([["globalVersion", 0]]),
  };
  const records = new UserRecordRepository(
    storage,
    db,
    new ObjectSyncRepository(storage, db, "user"),
  );
  return {
    service: new UserService(new UserWorkspaceRepository(records, state, db)),
    state,
    storage,
  };
}
