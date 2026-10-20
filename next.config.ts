import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as respostas. A CSP completa vai como Report-Only:
// avisa no console o que seria bloqueado sem quebrar mapa, fotos e parceiros; endurecer depois de observar.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://*.mercadopago.com https://*.mercadopago.com.br",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.mercadopago.com https://*.mercadopago.com.br",
  "frame-ancestors 'none'",
].join("; ");

const CABECALHOS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // As fontes do PDF são lidas do disco em tempo de execução: entram no pacote dessas rotas.
  outputFileTracingIncludes: {
    "/api/itineraries/[id]/pdf": ["./assets/fonts/**"],
    "/exemplo/pdf": ["./assets/fonts/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS }];
  },
};

export default nextConfig;
