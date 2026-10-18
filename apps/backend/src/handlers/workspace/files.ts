import { WorkspaceFiles } from "@wodge/core/workspace/services/files";
import { HttpClient } from "@wodge/infra/http/client";
import { S3ObjectStorage } from "@wodge/infra/storage/object-storage";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { WorkspaceNotifications } from "../../gateways/workspace-notifications";
import { readUpload } from "../../lib/helpers/upload";
import type { WorkspaceContext } from "../../types/hono-context";
import {
  AvatarKey,
  EncodedStoragePath,
  FileParams,
} from "../../validators/files";

@injectable()
export class WorkspaceFilesHandlers {
  constructor(
    @inject(WorkspaceFiles) private readonly files: WorkspaceFiles,
    @inject(S3ObjectStorage) private readonly storage: S3ObjectStorage,
    @inject(HttpClient) private readonly http: HttpClient,
    @inject(WorkspaceNotifications)
    private readonly notifications: WorkspaceNotifications,
  ) {}

  uploadFile = async (c: Context<WorkspaceContext>) => {
    const params = FileParams.parse(c.req.param());
    const encodedPath = c.req.param("path") || c.req.header("x-file-path");
    const path = encodedPath
      ? EncodedStoragePath.parse(encodedPath)
      : undefined;
    const file = await readUpload(c.req);
    const { fileId, ...location } = this.files.newFile({ ...params, path });
    const response = await this.storage.putObject({
      ...location,
      Body: file,
      ContentType: file.type,
    });
    await this.files.changed();
    await this.notifications.notify({
      type: "team-files",
      teamId: params.teamId,
    });
    return c.json({ response, fileId }, 200);
  };

  uploadAvatar = async (c: Context<WorkspaceContext>) => {
    const file = await readUpload(c.req);
    const { key, ...location } = this.files.newAvatar();
    const response = await this.storage.putObject({
      ...location,
      Body: file,
      ContentType: file.type,
    });
    await this.files.changed();
    await this.notifications.notify();
    return c.json({ response, key }, 200);
  };

  listFiles = async (c: Context<WorkspaceContext>) => {
    const { teamId } = FileParams.parse(c.req.param());
    const { Bucket } = this.files.location({ teamId });
    const response = await this.storage.listObjects({ Bucket, Prefix: teamId });
    return c.json(
      response.Contents?.map((content) => content.Key),
      200,
    );
  };

  downloadFile = async (c: Context<WorkspaceContext>) => {
    const params = FileParams.parse(c.req.param());
    const path = EncodedStoragePath.parse(c.req.param("path"));
    const location = this.files.location({ ...params, path });
    const head = await this.http.request(
      await this.storage.headUrl(location, 3600),
      { method: "HEAD" },
    );
    if (head.status === 404)
      return c.json({ message: "File does not exist" }, 400);
    if (!head.ok) throw new Error("Unable to inspect file");
    await head.body?.cancel();
    const redirect = !!c.req.query("redirect");
    const url = await this.storage.downloadUrl(
      { ...location, ResponseContentDisposition: "attachment" },
      redirect ? 604800 : 3600,
    );
    return redirect ? c.redirect(url, 302) : c.json({ downloadUrl: url }, 200);
  };

  deleteFile = async (
    c: Context<WorkspaceContext>,
    type: "file" | "avatar",
  ) => {
    const avatar = type === "avatar";
    const params = avatar ? undefined : FileParams.parse(c.req.param());
    const location = avatar
      ? { Bucket: "avatars", Key: AvatarKey.parse(c.req.query("key")) }
      : this.files.location({
          ...params!,
          path: EncodedStoragePath.parse(c.req.param("path")),
        });
    const head = await this.http.request(
      await this.storage.headUrl(location, 3600),
      { method: "HEAD" },
    );
    if (head.status === 404)
      return c.json({ message: "File does not exist" }, 200);
    if (!head.ok) throw new Error("Unable to inspect file");
    await head.body?.cancel();
    const response = await this.http.request(
      await this.storage.deleteUrl(location, 3600),
      { method: "DELETE" },
    );
    if (response.status !== 204)
      return c.json({ message: "File not deleted" }, 400);
    await response.body?.cancel();
    await this.files.changed();
    await this.notifications.notify(
      avatar ? undefined : { type: "team-files", teamId: params!.teamId },
    );
    return c.json({ message: "File deleted successfully" }, 200);
  };
}
