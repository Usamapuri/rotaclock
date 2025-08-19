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
  // Use default output so next start serves static assets locally
  // output: 'standalone',
  // Updated for Next.js 15
  serverExternalPackages: [],
  // Ensure proper handling of dynamic routes
  trailingSlash: false,
}

export default nextConfig
