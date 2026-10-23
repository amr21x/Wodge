import { HttpClient } from "@wodge/infra/http/client";
import { IntegrationUnavailableError } from "@wodge/infra/integration-unavailable";
import { ResendEmail } from "@wodge/infra/email/resend";
import { LiveKitCallTokens } from "@wodge/infra/calls/livekit";
import { PolarPayments } from "@wodge/infra/payments/polar";
import { S3ObjectStorage } from "@wodge/infra/storage/object-storage";
import { expect, test, vi } from "vitest";
import { BackendApplication } from "../../src/application";
import { createRuntimeContainer } from "../../src/container";
import { backendApplication } from "../../src/di/runtime";
import { handleError } from "../../src/errors/handler";
import type { WorkerEnvironment } from "../../src/types/worker-environment";
import { createTestEnvironment } from "../helpers/environment";

const environment = () =>
  createTestEnvironment({
    RESEND_API_KEY: undefined,
    RESEND_EMAIL_FROM: undefined,
    R2_ENDPOINT: undefined,
    R2_ACCESS_KEY: undefined,
    R2_SECRET_KEY: undefined,
    POLAR_ACCESS_TOKEN: undefined,
    POLAR_WEBHOOK_SECRET: undefined,
    POLAR_PRODUCT_ID: undefined,
    LIVEKIT_API_KEY: undefined,
    LIVEKIT_API_SECRET: undefined,
  });

test("the application starts and keeps session protection with OAuth configured and other providers absent", async () => {
  const env = environment() as WorkerEnvironment;
  const container = createRuntimeContainer(env);
  try {
    const router = container.resolve(BackendApplication).router;
    const health = await router.request("http://localhost/health", {}, env);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });
    const account = await router.request(
      "http://localhost/api/users/me",
      {},
      env,
    );
    expect(account.status).toBe(401);
  } finally {
    await container.dispose();
  }
});

test("unconfigured providers reject before any outbound request", async () => {
  const env = environment();
  const http = new HttpClient();
  const request = vi.spyOn(http, "request");
  await expect(
    new ResendEmail(env, http).send({
      to: "a@example.test",
      subject: "Code",
      text: "Code",
    }),
  ).rejects.toBeInstanceOf(IntegrationUnavailableError);
  expect(request).not.toHaveBeenCalled();
  const storage = new S3ObjectStorage(env);
  expect(storage.configured).toBe(false);
  expect(() => storage.downloadUrl({ Bucket: "avatars", Key: "key" })).toThrow(
    IntegrationUnavailableError,
  );
  storage.dispose();
  const payments = new PolarPayments(env);
  expect(payments.configured).toBe(false);
  expect(() => payments.client).toThrow(IntegrationUnavailableError);
  expect(() => payments.productId).toThrow(IntegrationUnavailableError);
  await expect(payments.subscription("subscription")).rejects.toBeInstanceOf(
    IntegrationUnavailableError,
  );
  await expect(
    new LiveKitCallTokens(env).issue({
      room: "room",
      identity: "user",
      name: "User",
      ttl: "10m",
      canPublish: true,
      canSubscribe: true,
    }),
  ).rejects.toBeInstanceOf(IntegrationUnavailableError);
});

test("unavailable capabilities have a safe HTTP response", async () => {
  const response = handleError(new IntegrationUnavailableError("File storage"));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    ok: false,
    error: {
      code: "INTEGRATION_UNAVAILABLE",
      message: "File storage is not configured",
    },
  });
});

test("missing signing secrets never enable a development authentication bypass", () => {
  expect(() =>
    backendApplication(
      createTestEnvironment({ BETTER_AUTH_SECRET: "" }) as WorkerEnvironment,
    ),
  ).toThrow("Invalid backend configuration");
  expect(() =>
    backendApplication(
      createTestEnvironment({ SECRET_KEY: "" }) as WorkerEnvironment,
    ),
  ).toThrow("Invalid backend configuration");
});
