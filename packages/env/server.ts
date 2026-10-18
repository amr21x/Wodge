import type { D1Database } from "@cloudflare/workers-types";

/** Shared server configuration. Cloudflare supplies the complete environment at runtime. */
export interface ServerEnvironment {
  DB: D1Database;
  APP_DOMAIN: string;
  AVATARS_URL: string;
  BACKEND_DOMAIN: string;
  BETTER_AUTH_SECRET: string;
  SECRET_KEY: string;
  RESEND_API_KEY: string;
  RESEND_EMAIL_FROM: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
  R2_ENDPOINT: string;
  R2_ACCESS_KEY: string;
  R2_SECRET_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WH_SECRET: string;
  STRIPE_LOOKUP_KEY: string;
}
