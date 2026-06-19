/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
    outputFileTracingIncludes: {
      "/*": [
        "./node_modules/@prisma/engines/**/*.node",
        "./node_modules/.prisma/client/**/*",
      ],
    },
  },
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn", "log", "info"] } : false,
  },
};

export default nextConfig;
