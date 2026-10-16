import { Context } from "hono";
import WorkspaceParty from "../workspace-party";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getBucketAddress } from "@wodge/data";
import { getS3Client } from "../../lib/get-s3-client";

export async function calculateBucketSize(party: WorkspaceParty, c: Context) {
  const s3Client = getS3Client(party.room);
  const teamId = c.req.param("teamId");

  const input: { Bucket: string; Prefix: string; ContinuationToken?: string } =
    {
      Bucket: getBucketAddress(party.room.id),
      Prefix: teamId,
    };

  const command = new ListObjectsV2Command(input);
  let totalSize = 0;
  let continuationToken;

  do {
    if (continuationToken) {
      input.ContinuationToken = continuationToken;
    }

    const response = await s3Client.send(command);
    const contents = response.Contents;

    if (contents) {
      totalSize += contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  const sizeInBytes = totalSize;
  const sizeInGB = sizeInBytes / 1024 ** 3;

  return c.json({ sizeInBytes, sizeInGB }, 200);
}
