import { withSentryConfig } from "@sentry/nextjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Content-Range",
            value: "bytes : 0-9/*",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "sai-associates-x7",
  project: "javascript-nextjs",
  sentryUrl: "https://sentry.io/",
  silent: !process.env.CI,

  // Disable source map uploads — avoids SENTRY_AUTH_TOKEN requirement on CI/Vercel
  disableClientWebpackPlugin: true,
  disableServerWebpackPlugin: true,

  tunnelRoute: "/monitoring",
});
