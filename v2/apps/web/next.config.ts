import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // workspace packages ship raw .ts — Next compiles them alongside the app
  transpilePackages: ["@setlistscout/engine", "@setlistscout/clients"],
  // dev runs on 127.0.0.1 (Spotify's loopback redirect-URI rule), not localhost
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
