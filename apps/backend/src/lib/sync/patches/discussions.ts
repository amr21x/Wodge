import { PatchOperation } from "replicache";
import ThreadServer from "../../../servers/thread";
import { PatcherParams } from "../replicache";

export function createThreadPatch(party: ThreadServer, userId: string) {
  return async function ({ fromVersion }: PatcherParams) {
    const patch: PatchOperation[] = [];

    if (party.threadPosts.lastModifiedVersion > fromVersion) {
      patch.push({
        op: "put",
        key: "posts",
        value: party.threadPosts.data,
      });
    }

    return patch;
  };
}
