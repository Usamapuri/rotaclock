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
  // Disable static optimization for pages with dynamic content
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Ensure proper handling of dynamic routes
  trailingSlash: false,
}

export default nextConfig
