import type { AuthInstance } from "@wodge/auth/server";
import { toUserProfile } from "@wodge/core/user/profile";
import type { AccountService } from "@wodge/core/user/services/account";

export async function verifyCanonicalUserTypes(
  auth: AuthInstance,
  users: AccountService,
) {
  const result = await auth.api.getSession({ headers: new Headers() });
  if (!result) return;
  const profile = toUserProfile(result.user);
  const username: string | null = profile.username;
  const name: string = profile.displayName;
  // @ts-expect-error Authentication fields are not part of the application profile DTO.
  void profile.emailVerified;
  // @ts-expect-error Profile repositories cannot edit verified identity fields.
  users.update(profile.id, { email: "changed@example.test" });
  // @ts-expect-error Profile edits cannot replace the canonical identity ID.
  users.update(profile.id, { id: "replacement" });
  return { username, name };
}
