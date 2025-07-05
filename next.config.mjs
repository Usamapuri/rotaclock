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
  // Disable static optimization for pages with dynamic content
  experimental: {
    serverComponentsExternalPackages: [],
    // Force dynamic rendering
    dynamicParams: true,
  },
  // Ensure proper handling of dynamic routes
  trailingSlash: false,
  // Disable static generation
  generateStaticParams: false,
  // Force dynamic rendering for all pages
  staticPageGenerationTimeout: 0,
}

export default nextConfig
