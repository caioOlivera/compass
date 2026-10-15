import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // As fontes do PDF são lidas do disco em tempo de execução: entram no pacote dessas rotas.
  outputFileTracingIncludes: {
    "/api/itineraries/[id]/pdf": ["./assets/fonts/**"],
    "/exemplo/pdf": ["./assets/fonts/**"],
  },
};

export default nextConfig;
