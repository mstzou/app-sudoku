import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// Optionally set this for GitHub Pages project sites: e.g. "/repo-name"
const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: isProd && basePathEnv ? basePathEnv : undefined,
  assetPrefix: isProd && basePathEnv ? `${basePathEnv}/` : undefined,
};

export default nextConfig;
