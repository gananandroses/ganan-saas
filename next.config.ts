import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.10.9'],
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
