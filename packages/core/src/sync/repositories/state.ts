import { and, eq, gt } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import {
  sync_import,
  sync_versions,
  sync_clients,
  sync_client_groups,
} from "@wodge/domain/sync/schema/runtime";
import type { SyncClient, SyncClientGroup } from "@wodge/domain/sync/models";
import type { Versions } from "@wodge/domain/sync/state";
import {
  REPLICACHE_VERSIONS_KEY,
  REPLICACHE_CLIENT_GROUP_PREFIX,
} from "@wodge/domain/sync/index";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";

@injectable()
export class ObjectSyncRepository {
  private ready?: Promise<void>;
  constructor(
    @inject("storage") private readonly legacy: Pick<
      DurableObjectStorage,
      "get" | "list"
    >,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
    @inject("objectKind") private readonly kind:
      | "user"
      | "workspace"
      | "page"
      | "room"
      | "thread",
  ) {}
  initialize() {
    return (this.ready ??= this.importLegacy());
  }
  private async importLegacy() {
    await prepareObjectDatabase(this.db, this.kind);
    if (this.db.select().from(sync_import).get()) return;
    const versions = await this.legacy.get<Versions>(REPLICACHE_VERSIONS_KEY);
    const entries = await this.legacy.list<SyncClient | SyncClientGroup>({
      prefix: REPLICACHE_CLIENT_GROUP_PREFIX,
    });
    this.db.transaction(() => {
      if (this.db.select().from(sync_import).get()) return;
      this.saveVersions(versions ?? new Map([["globalVersion", 0]]));
      for (const [key, entry] of entries) {
        if ("userID" in entry) this.saveGroup(key, entry);
        else this.saveClient(key, entry);
      }
      this.db
        .insert(sync_import)
        .values({ id: 1, legacy_versions: Number(versions !== undefined) })
        .run();
    });
  }
  async loadVersions(defaults: Versions = new Map([["globalVersion", 0]])) {
    await this.initialize();
    const result = new Map(defaults);
    for (const row of this.db.select().from(sync_versions).all())
      result.set(row.name, row.revision);
    return result;
  }
  saveVersions(versions: Versions) {
    for (const [name, revision] of versions)
      this.db
        .insert(sync_versions)
        .values({ name, revision })
        .onConflictDoUpdate({ target: sync_versions.name, set: { revision } })
        .run();
  }
  async group(key: string) {
    await this.initialize();
    const row = this.db
      .select()
      .from(sync_client_groups)
      .where(eq(sync_client_groups.key, key))
      .get();
    return (
      row && {
        id: row.id,
        userID: row.user_id,
        ...(row.client_version !== null
          ? { clientVersion: row.client_version }
          : {}),
      }
    );
  }
  saveGroup(key: string, group: SyncClientGroup) {
    this.db
      .insert(sync_client_groups)
      .values({
        key,
        id: group.id ?? key,
        user_id: group.userID,
        client_version: group.clientVersion ?? null,
      })
      .onConflictDoNothing()
      .run();
  }
  async client(key: string) {
    await this.initialize();
    const row = this.db
      .select()
      .from(sync_clients)
      .where(eq(sync_clients.key, key))
      .get();
    return (
      row && {
        id: row.id,
        clientGroupID: row.group_id,
        lastMutationID: row.last_mutation_id,
        lastModifiedVersion: row.last_modified_version,
      }
    );
  }
  saveClient(key: string, client: SyncClient) {
    this.db
      .insert(sync_clients)
      .values({
        key,
        id: client.id,
        group_id: client.clientGroupID,
        last_mutation_id: client.lastMutationID ?? 0,
        last_modified_version: client.lastModifiedVersion ?? 0,
      })
      .onConflictDoUpdate({
        target: sync_clients.key,
        set: {
          id: client.id,
          group_id: client.clientGroupID,
          last_mutation_id: client.lastMutationID ?? 0,
          last_modified_version: client.lastModifiedVersion ?? 0,
        },
      })
      .run();
  }
  async changedClients(groupId: string, fromVersion: number) {
    await this.initialize();
    return this.db
      .select()
      .from(sync_clients)
      .where(
        and(
          eq(sync_clients.group_id, groupId),
          gt(sync_clients.last_modified_version, fromVersion),
        ),
      )
      .all()
      .map((row) => ({
        id: row.id,
        clientGroupID: row.group_id,
        lastMutationID: row.last_mutation_id,
        lastModifiedVersion: row.last_modified_version,
      }));
  }
  async hasRecords() {
    await this.initialize();
    return (
      !!this.db.select().from(sync_import).get()?.legacy_versions ||
      !!this.db.select().from(sync_clients).limit(1).get() ||
      !!this.db.select().from(sync_client_groups).limit(1).get() ||
      this.db
        .select()
        .from(sync_versions)
        .all()
        .some((row) => row.revision !== 0)
    );
  }
  async acknowledge(
    versions: Versions,
    clients: ReadonlyMap<string, SyncClient>,
  ) {
    await this.initialize();
    this.db.transaction(() => {
      this.saveVersions(versions);
      for (const [key, client] of clients) this.saveClient(key, client);
    });
  }
}
