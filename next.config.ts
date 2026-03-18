import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "192.168.29.222",
        port: "9000",
        pathname: "/escort-images/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
