import type { FlagSnapshot } from "@wodge/domain/features/models";
import { PatchOperation } from "replicache";
import ThreadServer from "../../../servers/thread";
import { PatcherParams } from "../replicache";

export function createThreadPatch(
  party: ThreadServer,
  userId: string,
  readFlags: () => Promise<FlagSnapshot>,
) {
  return async function ({ fromVersion }: PatcherParams) {
    const patch: PatchOperation[] = [];

    const { flags } = await readFlags();
    // Flag-only edits must replace the client view without modifying persisted records.
    {
      patch.push({
        op: "put",
        key: "posts",
        value: party.threadPosts.data.filter(
          (item) =>
            (flags.polls || item.type !== "poll") &&
            (flags.attachments ||
              !["image", "audio", "video", "file"].includes(item.type)),
        ),
      });
    }

    return patch;
  };
}
