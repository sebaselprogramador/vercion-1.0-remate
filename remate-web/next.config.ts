import type { NextConfig } from "next";

/**
 * La app se publica como sitio estático (GitHub Pages): no hay servidor de Next.
 * NEXT_PUBLIC_BASE_PATH es la subcarpeta del sitio, por ejemplo "/remate" en usuario.github.io/remate.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: { unoptimized: true },
};

export default nextConfig;
