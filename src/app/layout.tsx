import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Sora } from 'next/font/google'
import './globals.css'
import { getAdminClientSession } from '@/lib/auth'
import { AdminSessionProvider } from '@/components/admin/AdminSessionProvider'
import { PWARegister } from '@/components/pwa/PWARegister'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NextCampus — Campus Estudiantil',
  description: 'Calendario, quiz y apuntes por asignatura',
  applicationName: 'NextCampus',
  appleWebApp: {
    capable: true,
    title: 'NextCampus',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/education.svg', type: 'image/svg+xml' },
      { url: '/education.png', type: 'image/png' },
    ],
    shortcut: '/education.png',
    apple: '/education.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#cc0000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminClientSession()

  return (
    <html
      lang="es"
      className={`h-full ${jakarta.variable} ${sora.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-surface-0 font-sans text-white antialiased">
        <AdminSessionProvider session={session}>{children}</AdminSessionProvider>
        <PWARegister />
      </body>
    </html>
  )
}
