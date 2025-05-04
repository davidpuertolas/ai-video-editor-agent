/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@designcombo/events",
    "@designcombo/frames",
    "@designcombo/state",
    "@designcombo/timeline",
    "@designcombo/types",
    "@interactify/infinite-viewer",
    "@interactify/moveable",
    "@interactify/selection",
  ],
  images: {
    domains: [],
  },
};

export default nextConfig;
