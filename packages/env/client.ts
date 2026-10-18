import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_BACKEND_DOMAIN: z.string(),
    NEXT_PUBLIC_REPLICACHE_KEY: z.string(),
    NEXT_PUBLIC_LIVEKIT_URL: z.string(),
    NEXT_PUBLIC_AVATARS_URL: z.string(),
    NEXT_PUBLIC_APP_DOMAIN: z.string(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_BACKEND_DOMAIN: process.env.NEXT_PUBLIC_BACKEND_DOMAIN,
    NEXT_PUBLIC_REPLICACHE_KEY: process.env.NEXT_PUBLIC_REPLICACHE_KEY,
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    NEXT_PUBLIC_AVATARS_URL: process.env.NEXT_PUBLIC_AVATARS_URL,
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
  },
});
