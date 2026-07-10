'use client'

export function ResourceNameField({
  hint,
  name,
  showHint,
  onChange,
}: {
  hint: string | null
  name: string
  showHint: boolean
  onChange: (name: string) => void
}) {
  return (
    <div className="mt-2 space-y-1">
      <input
        type="text"
        aria-label="Nombre del recurso"
        value={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Nombre del recurso (opcional)"
        maxLength={120}
        className="w-full rounded border border-white/10 bg-surface-0 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
      />
      {showHint ? <p className="text-[11px] text-white/40">{hint}</p> : null}
    </div>
  )
}
