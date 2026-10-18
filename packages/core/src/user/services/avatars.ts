import { makeUserAvatarKey } from "@wodge/domain/files/index";
import { nanoid } from "nanoid";
import { inject, injectable } from "tsyringe";

@injectable()
export class UserAvatars {
  constructor(@inject("objectId") private readonly userId: string) {}
  newAvatar(requestedKey?: string) {
    const key = requestedKey || nanoid(12);
    return { key, ...this.location(makeUserAvatarKey(key)) };
  }
  location(key = makeUserAvatarKey(this.userId)) {
    return { Bucket: "avatars", Key: key };
  }
}
