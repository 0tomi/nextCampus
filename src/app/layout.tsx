import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Sora } from 'next/font/google'
import './globals.css'

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
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`h-full ${jakarta.variable} ${sora.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-surface-0 font-sans text-white antialiased">
        {children}
      </body>
    </html>
  )
}
