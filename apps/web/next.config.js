//@ts-nocheck

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const jiti = require("jiti")(__filename);

jiti("./node_modules/@wodge/env/client.ts");

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({}) || {};

// In development Next forwards API traffic; production routes these paths to the backend Worker.

nextConfig.rewrites = async () =>
  process.env.NODE_ENV === "development"
    ? [
        {
          source: "/api/:path*",
          destination: `${process.env.NEXT_PUBLIC_BACKEND_DOMAIN || "http://localhost:8787"}/api/:path*`,
        },
      ]
    : [];

module.exports = nextConfig;
