import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      { source: '/trade', destination: '/app/crypto', permanent: false },
      { source: '/trade/app', destination: '/app/crypto', permanent: false },
      { source: '/trade/app/:symbol', destination: '/app/crypto/:symbol', permanent: false },
    ];
  },
};

export default nextConfig;
