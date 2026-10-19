import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": fileURLToPath(
        new URL("./tests/helpers/cloudflare.ts", import.meta.url),
      ),
    },
  },
  test: {
    name: "backend",
    setupFiles: ["./tests/helpers/setup.ts"],
    environment: "node",
    include: ["tests/**/*.test.ts"],
    server: {
      deps: { inline: ["partyserver", "y-partyserver", "hono-party"] },
    },
  },
});
