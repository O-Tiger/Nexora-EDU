import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  transpilePackages: ["@nexora/ui", "@nexora/auth", "@nexora/db", "@nexora/validators"],
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  webpack(config) {
    config.ignoreWarnings = [
      // Dynamic require do OpenTelemetry (vem do Sentry)
      { module: /@opentelemetry\/instrumentation/ },
      // jose usa CompressionStream/DecompressionStream (Node-only) mas o middleware
      // só usa getToken (Edge-safe) — este warning é transitivo e inofensivo.
      { module: /jose\/dist\/webapi\/lib\/deflate/ },
    ];
    return config;
  },
};

export default nextConfig;
