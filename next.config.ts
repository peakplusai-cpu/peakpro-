import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      { source: '/app/crypto', destination: '/trade/app', permanent: false },
      { source: '/app/crypto/:symbol', destination: '/trade/app/:symbol', permanent: false },
    ];
  },
};

export default nextConfig;
