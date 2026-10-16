import { RunnerParams } from "../lib/replicache";
import { produce } from "immer";
import PageParty from "./page-party";
import { MoveTasksArgs } from "@wodge/domain/pages";
import { moveTasksMutation } from "@wodge/domain/pages";

export async function moveTasks(party: PageParty, params: RunnerParams) {
  const args = params.mutation.args as MoveTasksArgs;
  const newTasks = moveTasksMutation({
    t1: args.t1,
    tOrC2: args.tOrC2,
    isOverColumn: args.isOverColumn,
    columns: party.db.data.columns,
    tasks: party.db.data.tasks,
  });

  party.db = produce(party.db, (draft) => {
    draft.data.tasks = newTasks;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("db", party.db);
}
