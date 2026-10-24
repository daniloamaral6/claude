import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Upload de fotos (até 5 MB) pelo painel.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    const seguranca = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      // Só em produção (o modo de desenvolvimento do Next precisa de eval). Os domínios do Mercado Pago/ViaCEP são
      // os necessários para o checkout; Validado em 24/10/2026 com o Brick real em build de produção (sem violações); o Brick também carrega imagens de mercadolivre.com.
      const mp = "https://*.mercadopago.com https://*.mercadopago.com.br https://*.mercadolibre.com https://*.mercadolivre.com https://*.mlstatic.com";
      seguranca.push(
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            `script-src 'self' 'unsafe-inline' ${mp}`,
            "style-src 'self' 'unsafe-inline'",
            `img-src 'self' data: blob: ${mp}`,
            "font-src 'self' data:",
            `connect-src 'self' https://viacep.com.br ${mp}`,
            `frame-src ${mp}`,
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
          ].join("; "),
        },
      );
    }
    return [
      { source: "/:path*", headers: seguranca },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
