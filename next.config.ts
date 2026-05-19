import type { NextConfig } from 'next'

// Headers de seguridad (hardening, paso 7 del plan).
// CSP relajada para Next (requiere 'unsafe-inline'/'unsafe-eval' en dev/runtime).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
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
