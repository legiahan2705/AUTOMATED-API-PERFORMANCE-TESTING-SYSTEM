import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    eslint: {
    ignoreDuringBuilds: true, // Bỏ qua ESLint errors khi build
  },
  typescript: {
    ignoreBuildErrors: true, // Bỏ qua TypeScript errors khi build
  },
};

export default nextConfig;
