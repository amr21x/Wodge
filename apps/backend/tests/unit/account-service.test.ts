import { AccountService } from "@wodge/core/user/services/account";
import { expect, test, vi } from "vitest";

function fixture() {
  const user = {
    id: "user",
    name: "Name",
    email: "user@example.test",
    image: null,
    username: "username",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repository = {
    getUserById: vi.fn(async () => user),
    getUserByUsername: vi.fn(async () => user),
    getUserInfoById: vi.fn(async () => [user]),
    updateUserById: vi.fn(async () => ({
      user,
      updatedUser: { ...user, name: "Changed" },
    })),
  };
  return { repository, service: new AccountService(repository) };
}

test("account service maps profile writes and returns public DTOs without identity-only fields", async () => {
  const { service, repository } = fixture();
  const result = await service.update("user", { displayName: "Changed" });
  expect(repository.updateUserById).toHaveBeenCalledWith("user", {
    name: "Changed",
    image: undefined,
    username: undefined,
    updatedAt: expect.any(Date),
  });
  expect(result.updatedUser).toMatchObject({
    id: "user",
    displayName: "Changed",
    avatar: null,
  });
  expect(result.updatedUser).not.toHaveProperty("emailVerified");
});

test.each([
  [
    new Error("D1_ERROR: UNIQUE constraint failed: auth_users.username"),
    "Dup username",
  ],
  [new Error("database unavailable"), "Failed to update user"],
  ["unexpected failure", "Internal server error"],
])(
  "account service translates persistence failures into application results: %s",
  async (failure, message) => {
    const { service, repository } = fixture();
    repository.updateUserById.mockRejectedValue(failure);
    expect(await service.update("user", { displayName: "Changed" })).toEqual({
      error: message,
    });
  },
);

test("account reads map canonical identity data and preserve the existing unavailable result", async () => {
  const { service, repository } = fixture();
  expect(await service.getUserById("user")).toMatchObject({
    displayName: "Name",
    avatar: null,
  });
  repository.getUserById.mockRejectedValue(new Error("database unavailable"));
  expect(await service.getUserById("user")).toBeNull();
});
