import { RunnerParams } from "../lib/replicache";
import { produce } from "immer";
import PageParty from "./page-party";
import { CreateColumnArgs } from "@wodge/domain/pages";
import { deleteColumnMutation } from "@wodge/domain/pages";

export async function deleteColumn(party: PageParty, params: RunnerParams) {
  const args = params.mutation.args as CreateColumnArgs;
  const { newColumns, newTasks } = deleteColumnMutation({
    col: {
      id: args.id,
      title: args.title,
    },
    columns: party.db.data.columns,
    tasks: party.db.data.tasks,
  });

  party.db = produce(party.db, (draft) => {
    draft.data.columns = newColumns;
    draft.data.tasks = newTasks;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("db", party.db);
}
