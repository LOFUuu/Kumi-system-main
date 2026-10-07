import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase the body size limit for API routes to handle base64 receipt uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
