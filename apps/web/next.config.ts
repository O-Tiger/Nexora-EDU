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
    // Suprimir warnings de dynamic require do OpenTelemetry (vem do Sentry)
    config.ignoreWarnings = [
      { module: /@opentelemetry\/instrumentation/ },
    ];
    return config;
  },
};

export default nextConfig;
