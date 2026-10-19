import { validateServerEnvironment } from "@wodge/env/server";
import { expect, test } from "vitest";
import { createTestEnvironment } from "../helpers/environment";

test("ready mode requires retained providers but never LiveKit or OAuth", () => {
  const environment = createTestEnvironment({
    INTEGRATION_MODE: "ready",
    LIVEKIT_API_KEY: undefined,
    LIVEKIT_API_SECRET: undefined,
  });
  expect(() => validateServerEnvironment(environment)).not.toThrow();
  expect(() =>
    validateServerEnvironment({ ...environment, R2_SECRET_KEY: undefined }),
  ).toThrow("R2_SECRET_KEY");
  expect(() =>
    validateServerEnvironment({ ...environment, RESEND_API_KEY: "" }),
  ).toThrow("RESEND_API_KEY");
});

test("configuration rejects weak/shared signing secrets, incomplete OAuth, unsafe origins and live billing keys", () => {
  for (const changes of [
    { SECRET_KEY: "short" },
    { SECRET_KEY: createTestEnvironment().BETTER_AUTH_SECRET },
    { GOOGLE_CLIENT_ID: "client" },
    { APP_DOMAIN: "https://example.test/path" },
    { R2_ENDPOINT: "ftp://example.test" },
    { STRIPE_SECRET_KEY: "sk_live_do_not_use" },
    { INTEGRATION_MODE: "invalid" },
  ])
    expect(() =>
      validateServerEnvironment(createTestEnvironment(changes as never)),
    ).toThrow("Invalid backend configuration");
  const sensitive = "sk_live_never_print_this_value";
  try {
    validateServerEnvironment(
      createTestEnvironment({ STRIPE_SECRET_KEY: sensitive }),
    );
  } catch (error) {
    expect(String(error)).not.toContain(sensitive);
  }
});
