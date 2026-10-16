import { RunnerParams } from "../lib/replicache";
import { produce } from "immer";
import PageParty from "./page-party";
import { editTaskMutation } from "@wodge/domain/pages";
import { EditTaskArgs } from "@wodge/domain/pages";

export async function editTask(party: PageParty, params: RunnerParams) {
  const args = params.mutation.args as EditTaskArgs;
  const newTasks = editTaskMutation({
    task: args.task,
    tasks: party.db.data.tasks,
  });

  party.db = produce(party.db, (draft) => {
    draft.data.tasks = newTasks;
    draft.lastModifiedVersion = params.nextVersion;
  });

  await party.room.storage.put("db", party.db);
}
