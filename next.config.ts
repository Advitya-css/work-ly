import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async redirects() {
    return [
      {
        source: '/sign-up',
        destination: '/signup',
        permanent: true,
      },
    ];
  },
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
} as any;

export default nextConfig;
