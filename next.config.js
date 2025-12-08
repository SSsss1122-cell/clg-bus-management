/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'https://clg-bus-management-gsic.vercel.app/api/auth/:path*',
        has: [
          {
            type: 'header',
            key: 'x-debug',
            value: '(?<debug>.*)',
          },
        ],
      },
      {
        source: '/api/:path*',
        destination: 'https://clg-bus-management-gsic.vercel.app/api/:path*',
      },
    ]
  }
}

module.exports = nextConfig