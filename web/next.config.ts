import type { NextConfig } from 'next';

const rawBasePath = process.env.SREVA_BASE_PATH?.trim() ?? '';
const basePath = rawBasePath === '/' ? '' : rawBasePath.replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
