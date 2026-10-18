// @vitest-environment node
import { signToken, verifyToken } from "@wodge/auth/tokens";
import { LiveKitCallTokens } from "@wodge/infra/calls/livekit";
import { StripePayments } from "@wodge/infra/payments/payments";
import { S3ObjectStorage } from "@wodge/infra/storage/object-storage";
import { createHmac } from "node:crypto";
import { expect, test } from "vitest";
import { createTestEnvironment } from "../helpers/environment";

test("JWT provider preserves actor claims and rejects wrong keys and expired tokens", async () => {
  const token = await signToken(
    "local-secret",
    { userId: "owner", isUpload: true },
    "5m",
  );

  expect(await verifyToken("local-secret", token)).toMatchObject({
    userId: "owner",
    isUpload: true,
  });

  await expect(verifyToken("wrong-secret", token)).rejects.toThrow();
  await expect(
    verifyToken(
      "local-secret",
      await signToken("local-secret", { userId: "owner" }, "-1s"),
    ),
  ).rejects.toThrow();
});

test("call provider keeps room grants, identity and ten-minute TTL", async () => {
  const token = await new LiveKitCallTokens(createTestEnvironment()).issue({
    room: "room",
    identity: "owner",
    name: "Owner",
    ttl: "10m",
    canPublish: true,
    canSubscribe: true,
  });
  const claims = await verifyToken("local-secret", token);

  expect(claims).toMatchObject({
    sub: "owner",
    name: "Owner",
    video: {
      roomJoin: true,
      room: "room",
      canPublish: true,
      canSubscribe: true,
    },
  });
  expect(claims.exp! - Math.floor(Date.now() / 1000)).toBeGreaterThanOrEqual(
    599,
  );
  expect(claims.exp! - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(600);
});

test("object provider preserves endpoint, object key and signed URL expiry", async () => {
  const objects = new S3ObjectStorage(createTestEnvironment());
  const url = new URL(
    await objects.downloadUrl(
      {
        Bucket: "avatars",
        Key: "folder/object",
        ResponseContentDisposition: "attachment",
      },
      604800,
    ),
  );

  expect(url.href).toContain("folder/object");
  expect(url.searchParams.get("X-Amz-Expires")).toBe("604800");
  expect(url.searchParams.get("response-content-disposition")).toBe(
    "attachment",
  );
  expect(url.hostname).toContain("objects.example.test");
});

test("payment provider verifies raw webhook signatures before returning events", async () => {
  const payments = new StripePayments(createTestEnvironment());
  const body = JSON.stringify({
    id: "evt_local",
    object: "event",
    type: "customer.subscription.deleted",
    data: { object: { metadata: { workspaceId: "workspace" } } },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = "whsec_local_only";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  expect(
    await payments.verifyEvent(body, `t=${timestamp},v1=${signature}`, secret),
  ).toMatchObject({ id: "evt_local", type: "customer.subscription.deleted" });

  await expect(
    payments.verifyEvent(body + " ", `t=${timestamp},v1=${signature}`, secret),
  ).rejects.toThrow();
});
