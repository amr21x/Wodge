// Builds the Cloudflare Pages output with the pinned Vercel CLI.
// next-on-pages finds a local Vercel CLI by parsing `pnpm list`, whose output format
// changed in newer pnpm versions. When that lookup fails it downloads the latest CLI,
// whose output next-on-pages 1.x cannot bundle. Run the pinned CLI here and let
// next-on-pages only convert its output.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

// Placeholder project settings, as next-on-pages writes, so the build needs no linked
// Vercel project. Vercel CLI 33 cannot parse the pnpm 12 lockfile and would guess the
// wrong package manager, so skip its install (dependencies are already installed) and
// name the build command explicitly.
mkdirSync(".vercel", { recursive: true });
writeFileSync(
  ".vercel/project.json",
  JSON.stringify({
    projectId: "_",
    orgId: "_",
    settings: {
      framework: "nextjs",
      installCommand: "",
      buildCommand: "pnpm run build",
    },
  }),
);

const run = (command, args) =>
  execFileSync(command, args, { stdio: "inherit" });

// `vercel build` runs the package build script, which generates the API types first.
run("vercel", ["build"]);
run("next-on-pages", ["--skip-build"]);
