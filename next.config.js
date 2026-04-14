/** @type {import('next').NextConfig} */
const nextConfig = {
  // 如需部署到二级路径，取消注释以下行并设置正确的路径
  // basePath: '/k12consult',
  
  // 优化环境
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
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
