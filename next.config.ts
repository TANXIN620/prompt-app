import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出，适合 GitHub Pages 等纯静态托管
  output: "export",
  images: { unoptimized: true },
  // GitHub Pages 仓库路径作 basePath，资源才能正确加载
  // （gh-pages 分支部署到根路径，可不设 basePath；这里用根路径部署）
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "**.svc.cluster.local",
    "**.remote-agent.svc.cluster.local",
    "**.traecontent.cn",
  ],
};

export default nextConfig;
