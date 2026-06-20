import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

import { validateClientEnvForNextConfig } from "@lunchlink/env/client";

// Next.js has not loaded .env* yet when next.config.ts is evaluated
loadEnvConfig(process.cwd());

/** next.config.ts is loaded by `next lint`; skip env validation in that context */
validateClientEnvForNextConfig(process.env);

const nextConfig: NextConfig = {
  transpilePackages: ["@lunchlink/ui", "@lunchlink/types", "@lunchlink/env"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
