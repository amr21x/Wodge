import type { ExportedHandler, Fetcher } from "@cloudflare/workers-types";

interface DocsEnvironment {
  ASSETS: Fetcher;
  WEB: Fetcher;
}

export default {
  fetch(request, environment) {
    const { pathname } = new URL(request.url);
    if (pathname === "/docs" || pathname.startsWith("/docs/")) {
      return environment.ASSETS.fetch(request);
    }
    // Cloudflare route matching includes query strings, so /docs* is needed for
    // /docs?query. Preserve other prefix matches through the frontend binding.
    return environment.WEB.fetch(request);
  },
} satisfies ExportedHandler<DocsEnvironment>;
