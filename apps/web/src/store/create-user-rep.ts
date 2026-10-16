import {
  PullRequest,
  PullerResult,
  PushRequest,
  PusherResult,
  Replicache,
} from "replicache";

import { env } from "@wodge/env";
import { replicacheWrapper } from "@wodge/data/browser";
import { userMutators } from "@wodge/data/models/user/user-mutators";

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
