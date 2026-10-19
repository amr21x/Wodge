import { WorkspaceFileRepository } from "@wodge/core/workspace/repositories/files";
import {
  getBucketAddress,
  makeWorkspaceAvatarKey,
} from "@wodge/domain/files/index";
import { createEntityId } from "@wodge/domain/identifiers";
import { nanoid } from "nanoid";
import { inject, injectable } from "tsyringe";

export interface FileLocation {
  teamId: string;
  channelId?: string;
  path?: string;
}

/** Workspace file naming and local change tracking; provider I/O is coordinated by handlers. */
@injectable()
export class WorkspaceFiles {
  constructor(
    @inject("objectId") private readonly workspaceId: string,
    @inject(WorkspaceFileRepository)
    private readonly changes: Pick<WorkspaceFileRepository, "saveChange">,
  ) {}

  location({ teamId, channelId, path }: FileLocation) {
    return {
      Bucket: getBucketAddress(this.workspaceId),
      Key: channelId
        ? `private_${teamId}/${channelId}/${path}`
        : `${teamId}/${path}`,
    };
  }
  newFile(input: FileLocation) {
    const fileId = createEntityId();
    return {
      fileId,
      ...this.location({ ...input, path: input.path || fileId }),
    };
  }
  newAvatar() {
    const key = btoa(nanoid(12));
    return { key, Bucket: "avatars", Key: makeWorkspaceAvatarKey(key) };
  }
  changed() {
    return this.changes.saveChange();
  }
}
