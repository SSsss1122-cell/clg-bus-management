module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://clg-bus-management-efz8l9uax-sssss1122-cells-projects.vercel.app/api/:path*",
      },
    ];
  },
};
