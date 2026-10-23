import { expect, test } from "vitest";
import { httpFeatures, partyFeatures } from "@wodge/core/features/policy";

test("avatar uploads require the avatars flag alongside their owner capability", () => {
  expect(httpFeatures("/api/users/avatar", "POST")).toEqual([
    "profiles",
    "avatars",
  ]);
  expect(httpFeatures("/api/users/user-1/avatar", "DELETE")).toEqual([
    "profiles",
    "avatars",
  ]);
  expect(httpFeatures("/api/workspaces/ws-1/avatar", "POST")).toEqual([
    "workspaceSettings",
    "avatars",
  ]);
  expect(partyFeatures("user", "/avatar", "POST")).toEqual([
    "profiles",
    "avatars",
  ]);
  expect(partyFeatures("workspace", "/avatar", "POST")).toEqual([
    "workspaceSettings",
    "avatars",
  ]);
});

test("profile and workspace edits stay independent of avatar storage", () => {
  expect(httpFeatures("/api/workspaces/ws-1/update", "POST")).toEqual([
    "workspaceSettings",
  ]);
  expect(partyFeatures("workspace", "/update", "POST")).toEqual([
    "workspaceSettings",
  ]);
  expect(partyFeatures("user", "/update", "POST")).toEqual([]);
});
