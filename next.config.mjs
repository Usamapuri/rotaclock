/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable static optimization completely
  output: 'standalone',
  // Updated for Next.js 15
  serverExternalPackages: [],
  // Ensure proper handling of dynamic routes
  trailingSlash: false,
}

export default nextConfig
