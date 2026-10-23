import { eq, gt, lte } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import {
  page_document,
  page_document_updates,
} from "@wodge/domain/pages/schema/object";
import type { LegacyRecordStorage } from "@wodge/infra/durable-objects/storage";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";

/** Latest-state recovery only: one checkpoint plus the binary updates not yet compacted into it. */
@injectable()
export class PageDocumentRepository {
  private ready = false;
  constructor(
    @inject("storage") private readonly legacyStorage: LegacyRecordStorage,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
  ) {}

  async loadDocument() {
    await prepareObjectDatabase(this.db, "page");
    if (
      !this.db.select().from(page_document).where(eq(page_document.id, 1)).get()
    ) {
      const legacy = await this.legacyStorage.get<Uint8Array>("yjs:snapshot");
      this.db
        .insert(page_document)
        .values({
          id: 1,
          sequence: 0,
          snapshot_sequence: 0,
          snapshot: legacy ?? null,
        })
        .onConflictDoNothing()
        .run();
    }
    const document = this.db
      .select()
      .from(page_document)
      .where(eq(page_document.id, 1))
      .get()!;
    const updates = this.db
      .select()
      .from(page_document_updates)
      .where(gt(page_document_updates.sequence, document.snapshot_sequence))
      .orderBy(page_document_updates.sequence)
      .all();
    if (
      document.snapshot_sequence > document.sequence ||
      updates.length !== document.sequence - document.snapshot_sequence
    ) {
      throw new Error("Incomplete page document journal");
    }
    for (let index = 0; index < updates.length; index++) {
      if (updates[index]!.sequence !== document.snapshot_sequence + index + 1)
        throw new Error("Incomplete page document journal");
    }
    this.ready = true;
    return { ...document, updates: updates.map((row) => row.update) };
  }

  // Native DO SQLite writes are synchronous, so appending finishes before the update callback returns.
  appendUpdates(updates: readonly Uint8Array[]) {
    this.assertReady();
    return this.db.transaction((tx) => {
      const document = tx
        .select()
        .from(page_document)
        .where(eq(page_document.id, 1))
        .get()!;
      let sequence = document.sequence;
      for (const update of updates) {
        sequence++;
        if (!Number.isSafeInteger(sequence))
          throw new Error("Page document sequence exhausted");
        tx.insert(page_document_updates).values({ sequence, update }).run();
      }
      if (updates.length)
        tx.update(page_document)
          .set({ sequence })
          .where(eq(page_document.id, 1))
          .run();
      return sequence;
    });
  }

  compact(snapshot: Uint8Array, throughSequence: number) {
    this.assertReady();
    return this.db.transaction((tx) => {
      const document = tx
        .select()
        .from(page_document)
        .where(eq(page_document.id, 1))
        .get()!;
      if (throughSequence < document.snapshot_sequence)
        return document.snapshot_sequence;
      if (
        !Number.isSafeInteger(throughSequence) ||
        throughSequence > document.sequence ||
        throughSequence < 0
      )
        throw new Error("Invalid page document checkpoint");
      tx.update(page_document)
        .set({ snapshot, snapshot_sequence: throughSequence })
        .where(eq(page_document.id, 1))
        .run();
      // A newer appended update must survive compaction of an older captured checkpoint.
      tx.delete(page_document_updates)
        .where(lte(page_document_updates.sequence, throughSequence))
        .run();
      return throughSequence;
    });
  }

  private assertReady() {
    if (!this.ready)
      throw new Error("Page document persistence has not been initialized");
  }
}
