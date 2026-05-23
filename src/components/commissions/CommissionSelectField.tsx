'use client'

import {
  ALL_COMMISSIONS_VALUE,
  type CommissionOption,
} from '@/lib/commission-preferences'

interface CommissionSelectFieldProps {
  id: string
  label: string
  value: string
  commissions: readonly CommissionOption[]
  onChange: (value: string) => void
  helperText?: string
  disabled?: boolean
}

export function CommissionSelectField({
  id,
  label,
  value,
  commissions,
  onChange,
  helperText,
  disabled = false,
}: CommissionSelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full cursor-pointer rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value={ALL_COMMISSIONS_VALUE}>Todas las comisiones</option>
        {commissions.map((commission) => (
          <option key={commission.id} value={commission.id}>
            {commission.nombre}
          </option>
        ))}
      </select>
      {helperText ? <p className="text-xs leading-5 text-white/42">{helperText}</p> : null}
    </div>
  )
}
