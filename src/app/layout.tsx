import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Sora } from 'next/font/google'
import Link from 'next/link'
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
    >
      <body className="flex min-h-full flex-col bg-[#f8fafc] text-ink">
        <header className="border-b-4 border-ink bg-paper">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link
              href="/"
              className="font-display text-xl font-extrabold tracking-tight"
            >
              Next<span className="text-primary">Campus</span>
            </Link>
            <Link
              href="/admin"
              className="text-sm font-semibold text-accent hover:underline"
            >
              Administración
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t-4 border-ink bg-paper py-4 text-center text-xs text-ink/60">
          FCYT · UADER — Licenciatura en Sistemas de Información
        </footer>
      </body>
    </html>
  )
}
