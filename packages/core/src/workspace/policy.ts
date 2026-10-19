export function workspaceMemberLimit(isPremium: boolean | null | undefined) {
  return isPremium ? 50 : 10;
}
