// @vitest-environment node
import { signToken, verifyToken } from "@wodge/auth/tokens";
import { LiveKitCallTokens } from "@wodge/infra/calls/livekit";
import { PolarPayments } from "@wodge/infra/payments/polar";
import { S3ObjectStorage } from "@wodge/infra/storage/object-storage";
import { expect, test, vi } from "vitest";
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

test("payment provider reads sandbox subscriptions and normalizes provider state", async () => {
  const payments = new PolarPayments(createTestEnvironment());
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      id: "subscription",
      created_at: "2026-10-01T00:00:00Z",
      modified_at: "2026-10-02T00:00:00Z",
      status: "active",
      product_id: "product_local",
      metadata: { referenceId: "workspace" },
      customer: { external_id: "owner" },
    }),
  );
  try {
    expect(await payments.subscription("subscription")).toEqual({
      id: "subscription",
      created: Date.parse("2026-10-01T00:00:00Z"),
      modified: Date.parse("2026-10-02T00:00:00Z"),
      status: "active",
      productId: "product_local",
      metadata: { referenceId: "workspace" },
      customerExternalId: "owner",
    });
    const [request] = fetch.mock.calls[0]!;
    const url = new URL(
      request instanceof Request ? request.url : String(request),
    );
    expect(url.origin).toBe("https://sandbox-api.polar.sh");
    expect(url.pathname).toBe("/v1/subscriptions/subscription");
  } finally {
    fetch.mockRestore();
  }
});
