import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) resolves its worker script with a dynamic
  // import at runtime. Left to the bundler, that import gets rewritten into
  // a chunk path that doesn't exist in the output, breaking PDF parsing.
  // Marking it external tells Next.js to leave it to Node's own module
  // resolution instead, which handles the dynamic import correctly.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
