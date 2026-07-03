import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // workspace packages ship raw .ts — Next compiles them alongside the app
  transpilePackages: ["@setlistscout/engine", "@setlistscout/clients"],
};

export default nextConfig;
