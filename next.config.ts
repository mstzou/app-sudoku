import type { NextConfig } from "next";
// next.config.ts
// const isProd = process.env.NODE_ENV === "production";
// const repoName = "app-sudoku"; // <-- set your repo name

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  // basePath: isProd ? `/${repoName}` : undefined,
  // assetPrefix: isProd ? `/${repoName}/` : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
