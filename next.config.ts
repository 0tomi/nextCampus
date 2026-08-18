import type { NextConfig } from 'next'

// Headers de seguridad (hardening, paso 7 del plan).
// CSP se inyecta desde proxy.ts. SRI permite mantener páginas cacheables/ISR
// sin nonce por request en los scripts generados por Next.js.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // El default de Next es 1 MB y los apuntes interactivos con MathJax embebido
    // superan ese tamaño; 4 MB deja margen para el multipart (límite de Vercel ~4.5 MB).
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  // esbuild tiene binarios nativos por plataforma; lo usamos solo en server para
  // compilar apuntes React subidos por admins, así que Next no debe empaquetarlo
  // dentro del bundle de rutas.
  serverExternalPackages: ['esbuild'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/thumbnail',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
