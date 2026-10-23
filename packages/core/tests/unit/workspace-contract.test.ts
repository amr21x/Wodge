import { expect, test } from "vitest";
import {
  NewWorkspaceSchema,
  WorkspaceSchema,
} from "@wodge/domain/workspace/validation";

test("workspace API validation preserves the client shape independently of organization persistence", () => {
  const profile = {
    id: "persisted-workspace",
    owner: "owner",
    name: "Workspace",
    slug: "work-space",
    avatar: "https://example.test/logo.png",
  };
  expect(WorkspaceSchema.parse(profile)).toEqual(profile);
  expect(
    NewWorkspaceSchema.parse({ ...profile, slug: "  work-space  " }),
  ).toEqual({ name: "Workspace", slug: "work-space" });
  for (const slug of [
    "",
    "ab",
    "contains spaces",
    "a".repeat(25),
    "api",
    "parties",
    "docs",
    "API",
    " settings ",
  ]) {
    expect(NewWorkspaceSchema.safeParse({ ...profile, slug }).success).toBe(
      false,
    );
  }
});
