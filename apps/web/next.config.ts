import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  // Baseline hardening for every response (a CSP would also need nonces for Next's inline scripts).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  // Strapi stores media under relative `/uploads/...` URLs (avatars): serve them
  // from this origin so the browser never needs to know the Strapi address.
  async rewrites() {
    const strapi = (process.env.STRAPI_URL ?? "").replace(/\/+$/, "");
    return strapi
      ? [{ source: "/uploads/:path*", destination: `${strapi}/uploads/:path*` }]
      : [];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
