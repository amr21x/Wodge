import type { SyncClient } from "@wodge/domain/sync/models";
import type { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { ApplicationError } from "@wodge/core/errors";
import {
  extractClientId,
  makeClientGroupKey,
  makeClientKey,
} from "@wodge/domain/sync/index";
import type { Versions } from "@wodge/domain/sync/state";
import type { HonoRequest } from "hono";
import type { PatchOperation, PullResponse } from "replicache";
import type { z } from "zod";
import { readJson } from "../helpers/json";
import {
  badRequest,
  error,
  json,
  ok,
  unauthorized,
} from "../helpers/responses";
import {
  PullRequestSchema,
  PushRequestSchema,
  type MutationSchema,
} from "./validation";

export interface RunnerParams {
  mutation: z.infer<typeof MutationSchema>;
  nextVersion: number;
  userId: string;
}

export interface PatcherParams {
  fromVersion: number;
  versions: Versions;
}

export interface PushProps {
  req: HonoRequest;
  storage: ObjectSyncRepository;
  versions: Versions;
  runner: (params: RunnerParams) => Promise<void>;
}

export interface PullProps {
  req: HonoRequest;
  storage: ObjectSyncRepository;
  versions: Versions;
  patcher: (params: PatcherParams) => Promise<PatchOperation[]>;
}

const authError = {};

const clientStateNotFoundError = {};

export async function repPull({ req, storage, versions, patcher }: PullProps) {
  const userId = req.header("x-user-id");

  if (!userId) {
    return unauthorized();
  }

  const data = await readJson(req);
  const validatedData = PullRequestSchema.safeParse(data);

  if (!validatedData.success) {
    return badRequest();
  }

  try {
    const {
      data: { cookie, clientGroupID: clientGroupId },
    } = validatedData;

    await getClientGroup(clientGroupId, userId, storage, false);

    const globalVersion = versions.get("globalVersion") as number;
    const fromVersion = cookie ?? 0;

    const lastMutationIDChanges: Record<string, number> = {};

    // Return acknowledgements changed since the client's cookie, alongside the same pull patch.

    for (const client of await storage.changedClients(
      makeClientGroupKey(clientGroupId),
      fromVersion,
    ))
      lastMutationIDChanges[extractClientId(client.id)!] =
        client.lastMutationID;

    const patch = await patcher({ fromVersion, versions });

    return json(
      {
        lastMutationIDChanges,
        cookie: globalVersion,
        patch,
      } satisfies PullResponse,
      200,
    );
  } catch (e) {
    switch (e) {
      case authError:
        return unauthorized();
      case clientStateNotFoundError:
        return json({ error: "ClientStateNotFound" }, 200);
      default:
        return error("Internal server error");
    }
  }
}

export async function repPush({ req, storage, versions, runner }: PushProps) {
  const userId = req.header("x-user-id");
  const data = await readJson(req);

  if (!userId) {
    return unauthorized();
  }

  const validatedData = PushRequestSchema.safeParse(data);

  if (!validatedData.success) {
    return badRequest();
  }

  const {
    data: { mutations, clientGroupID },
  } = validatedData;

  try {
    // Client groups belong to one authenticated user, including on retries.
    const clientGroup = await getClientGroup(clientGroupID, userId, storage);

    if (!clientGroup) {
      throw new Error("Client group not found");
    }

    const globalVersion = versions.get("globalVersion") as number;
    let nextVersion = globalVersion + 1;
    // Cache client records only for this batch; each client must still belong to the group.

    const clients = new Map<string, SyncClient>();

    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i]!;

      const { id, clientID } = mutation;

      let client = clients.get(makeClientKey(clientID, clientGroup.id));

      if (!client) {
        client = await getClient(
          clientID,
          clientGroup.id,
          nextVersion,
          id,
          storage,
        );

        clients.set(makeClientKey(clientID, clientGroup.id), client);
      }

      const expectedMutationID = client.lastMutationID + 1;

      // Retries may replay acknowledged commands; skip them without applying their effects twice.

      if (id < expectedMutationID) {
        continue;
      }

      // A gap cannot be acknowledged: earlier commands must arrive first.

      if (id > expectedMutationID) {
        throw new Error("Mutation from the future");
      }

      // Dispatch retains each feature's acknowledgement policy. A thrown failure stops this batch.

      await runner({ mutation, nextVersion, userId });

      client.lastMutationID = expectedMutationID;
      client.lastModifiedVersion = nextVersion;

      clients.set(makeClientKey(clientID, clientGroup.id), client);
    }

    versions.set("globalVersion", nextVersion);

    // Publish acknowledgements after dispatch succeeds; earlier application writes are not rolled back on failure.

    await storage.acknowledge(versions, clients);

    return ok();
  } catch (e) {
    if (e instanceof ApplicationError && e.code === "ROOM_FORBIDDEN") {
      throw e;
    }
    switch (e) {
      case authError:
        return unauthorized();
      case clientStateNotFoundError:
        return json({ error: "ClientStateNotFound" }, 200);
      default:
        return error("Internal server error");
    }
  }
}

async function getClient(
  id: string,
  clientGroupID: string,
  lastModifiedVersion: number,
  mutationId: number,
  storage: ObjectSyncRepository,
) {
  const key = makeClientKey(id, clientGroupID);

  const client = await storage.client(key);

  // If client exists, check if it belongs to the client group and returns it if it does

  if (client) {
    if (client.clientGroupID !== clientGroupID) {
      throw authError;
    }

    return client;
  }

  // If mutationID isn't 1, then this isn't a new client. We should have found
  // the client record.

  if (mutationId !== 1) {
    throw clientStateNotFoundError;
  }

  // Client does not exist, create it and return it

  storage.saveClient(key, {
    id: key,
    clientGroupID: clientGroupID,
    lastMutationID: 0,
    lastModifiedVersion,
  });

  return { id: key, clientGroupID, lastMutationID: 0, lastModifiedVersion };
}

async function getClientGroup(
  clientGroupId: string,
  userId: string,
  storage: ObjectSyncRepository,
  withCreate = true,
) {
  const key = makeClientGroupKey(clientGroupId);

  // Check for existent client group
  const clientGroup = await storage.group(key);

  // If client group exists, check if it belongs to the user and returns it if it does

  if (clientGroup) {
    if (clientGroup.userID !== userId) {
      throw authError;
    }

    return clientGroup;
  }

  if (!withCreate) {
    return null;
  }
  // Client group does not exist, create it and return it

  storage.saveGroup(key, {
    id: key,
    userID: userId,
  });

  return { id: key, userID: userId };
}
