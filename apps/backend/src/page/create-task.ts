import { RunnerParams } from "../lib/replicache";
import { produce } from "immer";
import PageParty from "./page-party";
import { CreateTaskArgs } from "@wodge/domain/pages";
import { createTaskMutation } from "@wodge/domain/pages";

export async function createTask(party: PageParty, params: RunnerParams) {
  const args = params.mutation.args as CreateTaskArgs;
  const newTasks = createTaskMutation({
    task: args.task,
    colId: args.col,
    columns: party.db.data.columns,
    tasks: party.db.data.tasks,
  });

  party.db = produce(party.db, (draft) => {
    draft.data.tasks = newTasks;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("db", party.db);
}
