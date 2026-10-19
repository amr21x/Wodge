import { expect, test } from "vitest";
import { toUserProfile } from "@wodge/core/user/profile";

const identity = {
  id: "existing-user",
  email: "user@example.test",
  name: "Display name",
  createdAt: new Date(1700000000000),
  updatedAt: new Date(1700000010000),
};

test("canonical auth users map to the existing profile DTO without changing identity or timestamps", () => {
  expect(
    toUserProfile({
      ...identity,
      image: "https://example.test/avatar",
      username: "member",
    }),
  ).toEqual({
    id: identity.id,
    email: identity.email,
    displayName: identity.name,
    avatar: "https://example.test/avatar",
    username: "member",
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
  });
});

test("optional session profile fields normalize to null", () => {
  expect(toUserProfile(identity)).toMatchObject({
    avatar: null,
    username: null,
  });
});

test("auth-only fields are not exposed in the profile DTO", () => {
  const source = { ...identity, emailVerified: true, internalField: "private" };
  const profile = toUserProfile(source);
  expect(profile).not.toHaveProperty("emailVerified");
  expect(profile).not.toHaveProperty("internalField");
});
