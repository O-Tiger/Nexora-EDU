import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: { disableDevLogs: true },
});

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
      { module: /@opentelemetry\/instrumentation/ },
      { module: /jose\/dist\/webapi\/lib\/deflate/ },
    ];
    return config;
  },
};

export default withPWA(withNextIntl(nextConfig));
