import { RunnerParams } from "../lib/replicache";
import { produce } from "immer";
import PageParty from "./page-party";
import { CreateTaskArgs } from "@wodge/domain/pages";
import { deleteTaskMutation } from "@wodge/domain/pages";

export async function deleteTask(party: PageParty, params: RunnerParams) {
  const args = params.mutation.args as CreateTaskArgs;
  const newTasks = deleteTaskMutation({
    task: args.task,
    tasks: party.db.data.tasks,
  });

  party.db = produce(party.db, (draft) => {
    draft.data.tasks = newTasks;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("db", party.db);
}
