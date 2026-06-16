import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    // 根路径展示官网落地页（静态 public/landing.html）
    return [{ source: "/", destination: "/landing.html" }]
  },
}

export default nextConfig
