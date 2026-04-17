import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ifbctkkooazthchvpwjw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
        pathname: '/tRsPFerZFx9CcPaMlfZCfQ/**',
      },
    ],
  },
};

export default nextConfig;
