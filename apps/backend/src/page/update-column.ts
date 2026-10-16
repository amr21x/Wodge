import { RunnerParams } from "../lib/replicache";
import { produce } from "immer";
import PageParty from "./page-party";
import { CreateColumnArgs } from "@wodge/domain/pages";
import { updateColumnMutation } from "@wodge/domain/pages";

export async function updateColumn(party: PageParty, params: RunnerParams) {
  const args = params.mutation.args as CreateColumnArgs;
  const newColumns = updateColumnMutation({
    col: {
      id: args.id,
      title: args.title,
    },
    columns: party.db.data.columns,
  });

  party.db = produce(party.db, (draft) => {
    draft.data.columns = newColumns;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("db", party.db);
}
