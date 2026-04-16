/** @type {import('next').NextConfig} */
const normalizedBasePath = (() => {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH || "";

  if (!raw || raw === "/") {
    return "";
  }

  return (raw.startsWith("/") ? raw : `/${raw}`).replace(/\/+$/, "");
})();

const nextConfig = {
  ...(normalizedBasePath ? { basePath: normalizedBasePath } : {}),
  
  // 优化环境
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_BASE_PATH: normalizedBasePath,
  },

  // 图片优化
  images: {
    unoptimized: true,
  },

  // 静态生成超时时间
  staticPageGenerationTimeout: 120,

  // 启用 React 严格模式用于开发
  reactStrictMode: true,
};

export default nextConfig;
