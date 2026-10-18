import { z } from "zod";
import type { D1Database } from "@cloudflare/workers-types";

/** Shared server configuration. Cloudflare supplies the complete environment at runtime. */
export interface ServerEnvironment {
  DB: D1Database;
  INTEGRATION_MODE?: "partial" | "ready";
  APP_DOMAIN: string;
  AVATARS_URL: string;
  BACKEND_DOMAIN: string;
  BETTER_AUTH_SECRET: string;
  SECRET_KEY: string;
  RESEND_API_KEY?: string;
  RESEND_EMAIL_FROM?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY?: string;
  R2_SECRET_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WH_SECRET?: string;
  STRIPE_LOOKUP_KEY?: string;
}

/** Validate once at the Worker boundary; never include configuration values in errors. */
export function validateServerEnvironment(
  environment: ServerEnvironment,
): void {
  const result = serverConfiguration.safeParse(environment);
  if (!result.success) {
    throw new Error(
      "Invalid backend configuration: " +
        result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
    );
  }
}

const optionalSetting = z
  .string()
  .refine(
    (value) => value === "" || value.trim().length > 0,
    "must not be whitespace",
  )
  .optional();
const providerSettings = {
  RESEND_API_KEY: optionalSetting,
  RESEND_EMAIL_FROM: optionalSetting,
  R2_ENDPOINT: optionalSetting,
  R2_ACCESS_KEY: optionalSetting,
  R2_SECRET_KEY: optionalSetting,
  STRIPE_SECRET_KEY: optionalSetting,
  STRIPE_WH_SECRET: optionalSetting,
  STRIPE_LOOKUP_KEY: optionalSetting,
};
const serverConfiguration = z
  .object({
    APP_DOMAIN: z.string().url(),
    BACKEND_DOMAIN: z.string().url(),
    AVATARS_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().trim().min(32),
    SECRET_KEY: z.string().trim().min(32),
    INTEGRATION_MODE: z.enum(["partial", "ready"]).default("partial"),
    GOOGLE_CLIENT_ID: optionalSetting,
    GOOGLE_CLIENT_SECRET: optionalSetting,
    GITHUB_CLIENT_ID: optionalSetting,
    GITHUB_CLIENT_SECRET: optionalSetting,
    ...providerSettings,
  })
  .superRefine((configuration, context) => {
    const require = (key: string, message: string) =>
      context.addIssue({ code: "custom", path: [key], message });
    if (configuration.SECRET_KEY === configuration.BETTER_AUTH_SECRET)
      require("SECRET_KEY", "must differ from BETTER_AUTH_SECRET");
    for (const provider of ["GOOGLE", "GITHUB"] as const) {
      if (
        Boolean(configuration[`${provider}_CLIENT_ID`]) !==
        Boolean(configuration[`${provider}_CLIENT_SECRET`])
      )
        require(`${provider}_CLIENT_ID`, "OAuth client ID and secret must be configured together");
    }
    for (const key of ["APP_DOMAIN", "BACKEND_DOMAIN"] as const) {
      try {
        const url = new URL(configuration[key]);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.origin !== configuration[key]
        )
          require(key, "must be an HTTP(S) origin without a path or trailing slash");
      } catch {
        /* The URL schema reports malformed values. */
      }
    }
    if (configuration.R2_ENDPOINT) {
      try {
        if (
          !["http:", "https:"].includes(
            new URL(configuration.R2_ENDPOINT).protocol,
          )
        )
          throw new Error();
      } catch {
        require("R2_ENDPOINT", "must be an HTTP(S) URL");
      }
    }
    if (
      configuration.RESEND_EMAIL_FROM &&
      !z.string().email().safeParse(configuration.RESEND_EMAIL_FROM).success
    )
      require("RESEND_EMAIL_FROM", "must be a sender email address");
    if (
      configuration.STRIPE_SECRET_KEY &&
      !configuration.STRIPE_SECRET_KEY.startsWith("sk_test_")
    )
      require("STRIPE_SECRET_KEY", "showcase billing requires a Stripe test-mode key");
    if (configuration.INTEGRATION_MODE === "ready")
      for (const key of Object.keys(
        providerSettings,
      ) as (keyof typeof providerSettings)[])
        if (!configuration[key]) require(key, "is required in ready mode");
  });
