import type { NextConfig } from "next";

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

export default nextConfig;
