/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/ors/:path*",
        destination: "https://api.openrouteservice.org/:path*",
      },
    ];
  },
};
module.exports = nextConfig;
