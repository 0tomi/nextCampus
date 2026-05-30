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
  // esbuild tiene binarios nativos por plataforma; lo usamos solo en server para
  // compilar apuntes React subidos por admins, así que Next no debe empaquetarlo
  // dentro del bundle de rutas.
  serverExternalPackages: ['esbuild', 'react', 'react-dom'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/thumbnail',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // La skill para generar bancos con IA se descarga como archivo.
        source: '/resources/banco-preguntas-examen.skill',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="banco-preguntas-examen.skill"',
          },
          { key: 'Content-Type', value: 'application/octet-stream' },
        ],
      },
    ]
  },
}

export default nextConfig
