module.exports = {
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/api/:path*',
          destination: 'https://clg-bus-management-gsic.vercel.app/api/:path*',
        },
      ];
    } else {
      // Development → hit local API
      return [];
    }
  },
};
