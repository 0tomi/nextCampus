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
    <div className="space-y-2">
      {label ? (
        <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
          {label}
        </span>
      ) : null}
      <div id={id} className="flex flex-wrap gap-2" role="group" aria-label={label}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(ALL_COMMISSIONS_VALUE)}
          className={`px-3 py-1.5 text-xs font-semibold rounded border transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-white/20
            ${
              value === ALL_COMMISSIONS_VALUE
                ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.12)]'
                : 'bg-surface-0 text-white/70 border-white/10 hover:border-white/20 hover:text-white hover:bg-surface-1'
            }
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
        >
          Todas
        </button>
        {commissions.map((commission) => {
          const isSelected = value === commission.id
          return (
            <button
              key={commission.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(commission.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-white/20
                ${
                  isSelected
                    ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.12)]'
                    : 'bg-surface-0 text-white/70 border-white/10 hover:border-white/20 hover:text-white hover:bg-surface-1'
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {commission.nombre}
            </button>
          )
        })}
      </div>
      {helperText ? <p className="text-xs leading-5 text-white/38">{helperText}</p> : null}
    </div>
  )
}

