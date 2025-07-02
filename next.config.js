/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'pizzip', 'docxtemplater']
  }
}

module.exports = nextConfig 