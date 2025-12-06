/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",   // required for Capacitor

  // DEVELOPMENT ONLY
  devIndicators: {
    buildActivity: false,
  },
  experimental: {
    turbo: true,
  },
};

module.exports = nextConfig;
