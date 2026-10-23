import type { ServerEnvironment } from "@wodge/env/server";

/** Complete local configuration; tests override only values relevant to their scenario. */
export function createTestEnvironment(
  overrides: Partial<ServerEnvironment> = {},
): ServerEnvironment {
  return {
    DB: {} as ServerEnvironment["DB"],
    APP_DOMAIN: "http://localhost",
    AVATARS_URL: "http://localhost/avatars",
    BACKEND_DOMAIN: "http://localhost",
    BETTER_AUTH_SECRET:
      "foundation-test-secret-more-than-thirty-two-characters",
    SECRET_KEY: "test-only-ticket-signing-key-more-than-32-characters",
    GOOGLE_CLIENT_ID: "test-google-client",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    GITHUB_CLIENT_ID: "test-github-client",
    GITHUB_CLIENT_SECRET: "test-github-secret",
    RESEND_API_KEY: "test-email-key",
    RESEND_EMAIL_FROM: "test@example.test",
    LIVEKIT_API_KEY: "local-key",
    LIVEKIT_API_SECRET: "local-secret",
    R2_ENDPOINT: "https://objects.example.test",
    R2_ACCESS_KEY: "local-key",
    R2_SECRET_KEY: "local-secret",
    POLAR_ACCESS_TOKEN: "polar_oat_local_only",
    POLAR_WEBHOOK_SECRET: "polar_whs_local_only",
    POLAR_PRODUCT_ID: "product_local",
    ...overrides,
  };
}
