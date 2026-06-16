import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    // 根路径展示官网落地页（静态 public/landing.html）；
    // /workspace 展示文献审核页（静态 public/workspace.html，内容来自 IPSC.html）
    return [
      { source: "/", destination: "/landing.html" },
      { source: "/workspace", destination: "/workspace.html" },
    ]
  },
}

export default nextConfig
