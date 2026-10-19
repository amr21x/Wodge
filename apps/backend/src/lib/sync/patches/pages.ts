import { PatchOperation } from "replicache";
import PageServer from "../../../servers/page";
import { PatcherParams } from "../replicache";

export function createPagePatch(party: PageServer, _userId: string) {
  return async function ({ fromVersion }: PatcherParams) {
    const patch: PatchOperation[] = [];

    if (party.state.record.lastModifiedVersion > fromVersion) {
      patch.push({
        op: "put",
        key: "columns",
        value: party.state.record.data.columns,
      });
      patch.push({
        op: "put",
        key: "tasks",
        value: party.state.record.data.tasks,
      });
    }

    return patch;
  };
}
