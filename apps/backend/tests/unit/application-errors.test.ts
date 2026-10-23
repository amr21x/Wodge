import { pageServiceFixture, roomServiceFixture } from "../helpers/services";
// @vitest-environment node
import { billingError } from "@wodge/core/billing/errors";
import { ApplicationError } from "@wodge/core/errors";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import { expect, test, vi } from "vitest";
import { handleError } from "../../src/errors/handler";
import { dispatchPageMutation } from "../../src/lib/sync/mutations/pages";

const actor = {
  userId: "owner",
  isOwner: false,
  isAdmin: false,
  isTeamModerator: false,
  canEdit: false,
  canView: false,
};

test("core operations accept application DTOs and reject denied access with a serializable error", async () => {
  const { service, state, repository } = pageServiceFixture();
  const save = vi.spyOn(repository, "insertColumn");

  await dispatchPageMutation(
    service,
    {
      mutation: {
        name: "createColumn",
        id: 1,
        clientID: "client",
        args: { id: "column" },
      },
      nextVersion: 1,
      userId: actor.userId,
    },
    actor,
  );
  expect(save).not.toHaveBeenCalled();

  await service.createColumn({ id: "column" }, { ...actor, isOwner: true });
  expect(state.state.record.data.columns).toEqual([{ id: "column" }]);
  expect(save).toHaveBeenCalledOnce();
  expect(
    JSON.parse(
      JSON.stringify(
        new ApplicationError("TEST_CODE", "Message", { resourceId: "page" }),
      ),
    ),
  ).toEqual({
    code: "TEST_CODE",
    message: "Message",
    details: { resourceId: "page" },
  });
});

test("author checks produce feature errors and dependency errors retain their original identity", async () => {
  const failure = new Error("storage unavailable");
  const { service, repository } = roomServiceFixture();
  const save = vi.spyOn(repository, "insert").mockImplementation(() => {
    throw failure;
  });
  const message = MessageSchema.parse({
    id: "message",
    sender: "other",
    content: "Hello",
    date: "2026-10-16T00:00:00Z",
  });

  await expect(
    service.sendMessage(message, { ...actor, isOwner: true }),
  ).rejects.toMatchObject({
    code: "ROOM_FORBIDDEN",
    message: "Invalid authorId",
  });
  expect(save).not.toHaveBeenCalled();

  await expect(
    service.sendMessage(
      { ...message, sender: "owner" },
      { ...actor, isOwner: true },
    ),
  ).rejects.toBe(failure);
});

test.each([
  ["BILLING_FORBIDDEN", 403, "Unauthorized"],
  ["BILLING_WORKSPACE_NOT_FOUND", 404, "Workspace not found"],
  ["BILLING_ALREADY_PREMIUM", 400, "Already premium"],
  ["BILLING_NOT_PREMIUM", 400, "Not premium"],
  ["BILLING_PORTAL_PURCHASER_ONLY", 409, "Purchaser only"],
] as const)(
  "web maps %s to its existing HTTP response",
  async (code, status, message) => {
    const failure = billingError(code, message).toJSON();

    expect(failure).not.toHaveProperty("status");
    const response = handleError(billingError(code, message));

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code, message } });
  },
);
