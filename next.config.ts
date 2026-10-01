import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload de PDFs (até 4 MB + margem do multipart). A Vercel limita
      // o corpo dos pedidos a 4,5 MB, por isso não vale a pena subir mais.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
