import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Context } from "hono";
import { getS3Client } from "../../lib/get-s3-client";
import WorkspaceParty from "../workspace-party";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getBucketAddress } from "@wodge/data";

export async function downloadFile(party: WorkspaceParty, c: Context) {
  if (!c.req.param("path") || !c.req.param("teamId"))
    return c.json({ message: "Path and teamId are required" }, 400);

  const s3Client = getS3Client(party.room);
  const bucket = getBucketAddress(party.room.id);

  const path = atob(c.req.param("path"));

  const isRedirect = !!c.req.query("redirect");

  const teamId = c.req.param("teamId");

  if (!teamId) return c.json({ message: "TeamId is required" }, 400);

  let key = teamId + "/";

  if (path && path.includes(teamId))
    return c.json({ error: "Invalid path" }, 400);

  const channelId = c.req.param("channelId");

  if (channelId) {
    key = "private_" + key + channelId + "/" + path;
  } else {
    key = key + path;
  }

  const checkFile = await getSignedUrl(
    s3Client,
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 }
  );
  let checkFileResponse = await fetch(checkFile, {
    method: "HEAD",
  });
  if (checkFileResponse.statusText === "Not Found") {
    return c.json({ message: "File does not exist" }, 400);
  } else {
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: "attachment",
      }),
      { expiresIn: isRedirect ? 24 * 60 * 60 * 7 : 3600 }
    );

    if (isRedirect) return c.redirect(downloadUrl, 302);

    return c.json({ downloadUrl }, 200);
  }
}
