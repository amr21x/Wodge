export function getBucketAddress(wid: string) {
  return btoa(wid).toLowerCase();
}

export function makeWorkspaceAvatarKey(id: string) {
  return `wrk_${id}`;
}

export function makeUserAvatarKey(id: string) {
  return `usr_${id}`;
}
