import {
  PullRequest,
  PullerResult,
  PushRequest,
  PusherResult,
  Replicache,
} from "replicache";

import { env } from "@wodge/env/client";
import { replicacheWrapper } from "@/client/sync/transport";
import { userMutators } from "@/client/sync/user/mutators";

import { useAppStore } from "./store";

export function createUserRep(userId: string) {
  useAppStore.setState({
    userStore: new Replicache<typeof userMutators>({
      name: userId,
      licenseKey: env.NEXT_PUBLIC_REPLICACHE_KEY,
      pusher: replicacheWrapper<PushRequest, PusherResult>(
        "push",
        "user",
        userId,
      ),
      puller: replicacheWrapper<PullRequest, PullerResult>(
        "pull",
        "user",
        userId,
      ),
      pullInterval: null,
      mutators: { ...userMutators },
    }),
  });
}
