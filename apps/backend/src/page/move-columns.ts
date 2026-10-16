import { RunnerParams } from "../lib/replicache";
import { produce } from "immer";
import PageParty from "./page-party";
import { MoveColumnsArgs } from "@wodge/domain/pages";
import { moveColumnsMutation } from "@wodge/domain/pages";

export async function moveColumns(party: PageParty, params: RunnerParams) {
  const args = params.mutation.args as MoveColumnsArgs;
  const newColumns = moveColumnsMutation({
    c1: args.c1,
    c2: args.c2,
    columns: party.db.data.columns,
  });

  party.db = produce(party.db, (draft) => {
    draft.data.columns = newColumns;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("db", party.db);
}
