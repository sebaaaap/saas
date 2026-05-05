/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' genera un servidor Node.js optimizado para producción/Docker
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
