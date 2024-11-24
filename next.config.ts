import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",         // Caminho da requisição no front-end
        destination: "http://localhost:7075/:path*", // Endereço do back-end
      },
    ];
  },
};

export default nextConfig;
