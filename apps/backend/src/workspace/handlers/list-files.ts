import { Context } from "hono";
import WorkspaceParty from "../workspace-party";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getBucketAddress } from "@wodge/data";
import { getS3Client } from "../../lib/get-s3-client";
import { unauthorized } from "@/lib/http-utils";

export async function listFiles(party: WorkspaceParty, c: Context) {
  const s3Client = getS3Client(party.room);

  const teamId = c.req.param("teamId");

  const input = {
    Bucket: getBucketAddress(party.room.id),
    Prefix: teamId,
  };

  const command = new ListObjectsV2Command(input);
  const response = await s3Client.send(command);

  const keys = response.Contents?.map((content) => content.Key);

  return c.json(keys, 200);
}
