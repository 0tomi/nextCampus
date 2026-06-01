import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-0 px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
        Error 404
      </p>
      <h1 className="mt-3 font-display text-5xl font-black tracking-tight text-white sm:text-7xl">
        Página no encontrada
      </h1>
      <p className="mt-6 max-w-md text-base leading-7 text-white/55">
        La dirección que ingresaste no existe o fue movida.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-surface-1 px-6 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
