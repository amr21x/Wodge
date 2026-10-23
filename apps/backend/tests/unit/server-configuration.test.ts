import { validateServerEnvironment } from "@wodge/env/server";
import { expect, test } from "vitest";
import { createTestEnvironment } from "../helpers/environment";

test("ready mode requires storage and billing while email login and LiveKit are unnecessary", () => {
  const environment = createTestEnvironment({
    INTEGRATION_MODE: "ready",
    LIVEKIT_API_KEY: undefined,
    LIVEKIT_API_SECRET: undefined,
    RESEND_API_KEY: undefined,
    RESEND_EMAIL_FROM: undefined,
  });
  expect(() => validateServerEnvironment(environment)).not.toThrow();
  expect(() =>
    validateServerEnvironment({ ...environment, R2_SECRET_KEY: undefined }),
  ).toThrow("R2_SECRET_KEY");
});

test("configuration rejects weak/shared signing secrets, incomplete OAuth, unsafe origins and malformed billing tokens", () => {
  for (const changes of [
    { SECRET_KEY: "short" },
    { SECRET_KEY: createTestEnvironment().BETTER_AUTH_SECRET },
    { GOOGLE_CLIENT_SECRET: "" },
    { APP_DOMAIN: "https://example.test/path" },
    { R2_ENDPOINT: "ftp://example.test" },
    { POLAR_ACCESS_TOKEN: "not-an-organization-token" },
    { INTEGRATION_MODE: "invalid" },
  ])
    expect(() =>
      validateServerEnvironment(createTestEnvironment(changes as never)),
    ).toThrow("Invalid backend configuration");
  const sensitive = "never_print_this_billing_value";
  try {
    validateServerEnvironment(
      createTestEnvironment({ POLAR_ACCESS_TOKEN: sensitive }),
    );
  } catch (error) {
    expect(String(error)).not.toContain(sensitive);
  }
});

test.each([
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
] as const)("%s is mandatory in partial and ready modes", (key) => {
  for (const mode of ["partial", "ready"] as const) {
    for (const value of [undefined, "", "   "]) {
      expect(() =>
        validateServerEnvironment(
          createTestEnvironment({ INTEGRATION_MODE: mode, [key]: value }),
        ),
      ).toThrow(key);
    }
  }
});
