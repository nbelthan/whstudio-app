import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['static.usernames.app-backend.toolsforhumanity.com'],
  },
  allowedDevOrigins: ['*'], // Add your dev origin here
  reactStrictMode: false,
  eslint: {
    // WARNING: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // WARNING: Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
