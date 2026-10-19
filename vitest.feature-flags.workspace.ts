import { defineWorkspace } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineWorkspace([
  {
    resolve: {
      alias: {
        "reflect-metadata": fileURLToPath(
          new URL(
            "./apps/backend/node_modules/reflect-metadata/Reflect.js",
            import.meta.url,
          ),
        ),
        "@wodge/domain": fileURLToPath(
          new URL("./packages/domain/src", import.meta.url),
        ),
        "@wodge/core": fileURLToPath(
          new URL("./packages/core/src", import.meta.url),
        ),
        "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
        react: fileURLToPath(
          new URL("./apps/web/node_modules/react", import.meta.url),
        ),
        "react-dom": fileURLToPath(
          new URL("./apps/web/node_modules/react-dom", import.meta.url),
        ),
      },
    },
    esbuild: { jsx: "automatic" },
    test: {
      include: ["tests/feature-flags/*.test.{ts,tsx}"],
      environment: "node",
      cache: false,
    },
  },
]);
