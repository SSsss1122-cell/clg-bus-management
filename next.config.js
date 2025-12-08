module.exports = {
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/api/:path*',
          destination: 'https://clg-bus-management-efz8l9uax-sssss1122-cells-projects.vercel.app/api/:path*',
        },
      ];
    } else {
      // In dev → hit local API
      return [];
    }
  },
};
