import { Replicache } from "replicache";

import { replicacheWrapper } from "@/client/sync/transport";
import { userMutators } from "@/client/sync/user/mutators";

import { useAppStore } from "./store";

export function createUserRep(userId: string) {
  useAppStore.setState({
    userStore: new Replicache<typeof userMutators>({
      name: userId,
      pusher: replicacheWrapper("push", "user", userId),
      puller: replicacheWrapper("pull", "user", userId),
      pullInterval: null,
      mutators: { ...userMutators },
    }),
  });
}
