import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
for (const kind of ["user", "workspace", "room", "thread", "page"]) {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "drizzle-kit",
      "generate",
      "--config",
      `database/drizzle.${kind}.config.ts`,
    ],
    { cwd, stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
await import("./bundle-object-migrations.mjs");
