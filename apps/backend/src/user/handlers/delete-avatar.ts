import { Context } from "hono";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../../lib/get-s3-client";
import { makeUserAvatarKey, PublicUserType, UserType } from "@wodge/data";
import UserParty from "../user-party";

export async function deleteAvatar(party: UserParty, c: Context) {
  const s3Client = getS3Client(party.room);

  const bucket = "avatars";
  let key = makeUserAvatarKey(party.room.id);

  const checkFile = await getSignedUrl(
    s3Client,
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 }
  );
  let checkFileResponse = await fetch(checkFile, {
    method: "HEAD",
  });
  if (checkFileResponse.statusText === "Not Found") {
    const workspaceParty = party.room.context.parties.workspace!;

    const req = [...party.workspacesStore].map((wid) => {
      return workspaceParty.get(wid).fetch("/service/member-update", {
        method: "POST",
        headers: {
          Authorization: party.room.env.SECRET_KEY as string,
        },
      });
    });

    await Promise.all(req);
    return c.json({ message: "File does not exist" }, 200);
  } else {
    const deleteUrl = await getSignedUrl(
      s3Client,
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 3600 }
    );

    let response = await fetch(deleteUrl, {
      method: "DELETE",
    });

    if (response.status === 204) {
      const workspaceParty = party.room.context.parties.workspace!;

      const req = [...party.workspacesStore].map((wid) => {
        return workspaceParty.get(wid).fetch("/service/member-update", {
          method: "POST",
          headers: {
            Authorization: party.room.env.SECRET_KEY as string,
          },
        });
      });

      await Promise.all(req);

      return c.json({ message: "File deleted successfully" }, 200);
    } else {
      return c.json({ message: "File not deleted" }, 400);
    }
  }
}
