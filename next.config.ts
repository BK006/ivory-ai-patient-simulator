import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray ~/package-lock.json makes Turbopack infer the home dir as root; pin it to this repo.
  turbopack: { root: __dirname },
};

export default nextConfig;
