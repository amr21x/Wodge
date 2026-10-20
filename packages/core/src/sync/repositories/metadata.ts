import { eq } from "drizzle-orm";
import { record_metadata } from "@wodge/domain/sync/schema/object";
import type { VersionedRecord } from "@wodge/domain/sync/records";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";

export function loadRecordMetadata(db: ObjectDatabase, name: string) {
  const row = db
    .select()
    .from(record_metadata)
    .where(eq(record_metadata.name, name))
    .get();
  return (
    row && { lastModifiedVersion: row.revision, deleted: row.deleted === 1 }
  );
}

export function saveRecordMetadata(
  db: ObjectDatabase,
  name: string,
  record: Pick<VersionedRecord<unknown>, "lastModifiedVersion" | "deleted">,
) {
  const row = {
    name,
    revision: record.lastModifiedVersion,
    deleted: Number(record.deleted),
  };
  db.insert(record_metadata)
    .values(row)
    .onConflictDoUpdate({ target: record_metadata.name, set: row })
    .run();
}
