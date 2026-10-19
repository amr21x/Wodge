import type { RunnerParams } from "../../src/lib/sync/replicache";
import type PageParty from "../../src/servers/page";
import type RoomParty from "../../src/servers/room";
import type ThreadParty from "../../src/servers/thread";
import type WorkspaceParty from "../../src/servers/workspace";
import type { RequestActor } from "../../src/types/actor";
import {
  pageBindings,
  roomBindings,
  threadBindings,
  workspaceBindings,
} from "./bindings";

export async function executePageMutation(
  party: PageParty,
  params: RunnerParams,
  actor: RequestActor,
) {
  const scope = pageBindings(party);

  try {
    await scope.sync.run(params, actor);
  } finally {
    await scope.dispose();
  }
}

export async function executeRoomMutation(
  party: RoomParty,
  params: RunnerParams,
  actor: RequestActor,
) {
  const scope = roomBindings(party);

  try {
    await scope.sync.run(params, actor);
  } finally {
    await scope.dispose();
  }
}

export async function executeDiscussionMutation(
  party: ThreadParty,
  params: RunnerParams,
  actor: RequestActor,
) {
  const scope = threadBindings(party);

  try {
    await scope.sync.run(params, actor);
  } finally {
    await scope.dispose();
  }
}

export async function executeWorkspaceMutation(
  party: WorkspaceParty,
  params: RunnerParams,
  actor: RequestActor,
) {
  const scope = workspaceBindings(party);

  try {
    await scope.sync.run(params, actor);
  } finally {
    await scope.dispose();
  }
}
