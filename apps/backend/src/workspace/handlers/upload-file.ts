import WorkspaceParty from "../workspace-party";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { Context } from "hono";
import { getBucketAddress, REPLICACHE_VERSIONS_KEY } from "@wodge/data";
import { getS3Client } from "../../lib/get-s3-client";

export async function uploadFile(party: WorkspaceParty, c: Context) {
  const s3Client = getS3Client(party.room);

  const teamId = c.req.param("teamId");

  if (!teamId) return c.json({ error: "Team ID is required" }, 400);

  let path;

  if (c.req.param("path") || c.req.header("x-file-path"))
    path = atob((c.req.param("path") || c.req.header("x-file-path"))!);

  if (path && path.includes(teamId))
    return c.json({ error: "Invalid path" }, 400);

  const channelId = c.req.param("channelId");

  const fileId = nanoid();

  const body = await c.req.parseBody();

  const file = body["file"] as File;

  let key = teamId + "/";

  if (channelId) {
    key = "private_" + key + channelId + "/" + (path || fileId);
  } else {
    key = key + (path || fileId);
  }

  const bucket = getBucketAddress(party.room.id);

  try {
    const input = {
      Body: file,
      Bucket: bucket,
      Key: key,
      ContentType: file.type,
    };

    const command = new PutObjectCommand(input);
    const response = await s3Client.send(command);

    const nextVersion = party.versions.get("globalVersion")! + 1;

    party.versions.set("workspaceInfo", nextVersion);
    party.versions.set("globalVersion", nextVersion);

    await party.room.storage.put(REPLICACHE_VERSIONS_KEY, party.versions);

    await party.poke({
      type: "team-files",
      teamId,
    });

    return c.json({ response, fileId }, 200);
  } catch (error) {
    return c.json(error, 400);
  }
}
