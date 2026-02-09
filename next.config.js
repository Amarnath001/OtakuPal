/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/**" },
      { protocol: "https", hostname: "anilist.co", pathname: "/**" },
    ],
  },
};

module.exports = nextConfig;
