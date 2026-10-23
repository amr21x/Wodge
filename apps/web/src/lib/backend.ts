import { getCloudflareContext } from "@opennextjs/cloudflare";
import { env } from "@wodge/env/client";

// Same-zone Worker routes cannot be called with fetch; production uses a service binding.
export function fetchBackend(path: string, init?: RequestInit) {
  const url = new URL(path, env.NEXT_PUBLIC_BACKEND_DOMAIN);
  if (process.env.NODE_ENV === "development") return fetch(url, init);
  return getCloudflareContext().env.BACKEND.fetch(url, init);
}
