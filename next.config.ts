import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // 静态导出，适合 GitHub Pages 等纯静态托管
  output: "export",
  images: { unoptimized: true },
  // GitHub Pages 部署在子路径 /prompt-app/ 下，资源路径必须带此前缀
  basePath: isProd ? "/prompt-app" : "",
  assetPrefix: isProd ? "/prompt-app/" : undefined,
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "**.svc.cluster.local",
    "**.remote-agent.svc.cluster.local",
    "**.traecontent.cn",
  ],
};

export default nextConfig;
