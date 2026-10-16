//@ts-nocheck

const { setupDevPlatform } = require("@cloudflare/next-on-pages/next-dev");

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const jiti = require("jiti")(__filename);

jiti("./node_modules/@wodge/env/index.ts");

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({}) || {};

/**
 * Add Cloudflare bindings for Next.js development mode.
 */

(async () => {
  if (process.env.NODE_ENV === "development") {
    await setupDevPlatform();
  }
})();

module.exports = nextConfig;
