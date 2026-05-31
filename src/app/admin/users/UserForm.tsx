'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { AdminUserActionState } from './actions'

interface YearOption {
  id: string
  nombre: string
}

type Mode = 'create' | 'edit'

interface AdminUserFormProps {
  mode: Mode
  years: YearOption[]
  action: (prev: AdminUserActionState, formData: FormData) => Promise<AdminUserActionState>
  user?: {
    id: string
    email: string
    nombreUsuario: string
    role: 'AYUDANTE' | 'SUPERVISOR'
    status: 'ACTIVE' | 'DISABLED'
    yearIds: string[]
  }
}

const initialState: AdminUserActionState = { ok: false, message: '' }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex cursor-pointer items-center justify-center rounded-md bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Guardando…' : label}
    </button>
  )
}

export function AdminUserForm({ mode, years, action, user }: AdminUserFormProps) {
  const [state, formAction] = useActionState(action, initialState)
  const selectedYears = new Set(user?.yearIds ?? [])
  const isEdit = mode === 'edit'

  return (
    <form action={formAction} className="space-y-6 rounded-lg border border-white/10 bg-white/[0.03] p-6">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-white/75">Nombre</span>
          <input
            name="nombreUsuario"
            type="text"
            required
            defaultValue={user?.nombreUsuario ?? ''}
            placeholder="Nombre completo"
            className="block w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-300/60"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-white/75">Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={user?.email ?? ''}
            placeholder="persona@ejemplo.com"
            className="block w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-300/60"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-white/75">
            {isEdit ? 'Nueva contraseña' : 'Contraseña'}
          </span>
          <input
            name="password"
            type="password"
            required={!isEdit}
            minLength={8}
            placeholder={isEdit ? 'Dejar vacío para mantenerla' : 'Mínimo 8 caracteres'}
            className="block w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-300/60"
          />
        </label>
      </div>

      {isEdit ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white/75">Rol</span>
            <select
              name="role"
              defaultValue={user?.role ?? 'AYUDANTE'}
              className="block w-full cursor-pointer rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition focus:border-violet-300/60"
            >
              <option value="AYUDANTE">Ayudante</option>
              <option value="SUPERVISOR">Supervisor</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white/75">Estado</span>
            <select
              name="status"
              defaultValue={user?.status ?? 'ACTIVE'}
              className="block w-full cursor-pointer rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition focus:border-violet-300/60"
            >
              <option value="ACTIVE">Activo</option>
              <option value="DISABLED">Desactivado</option>
            </select>
          </label>
        </div>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-white/75">Años asignados</legend>
        {years.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {years.map((year) => (
              <label
                key={year.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/75 transition hover:border-violet-300/50 hover:bg-violet-400/10"
              >
                <input
                  type="checkbox"
                  name="yearIds"
                  value={year.id}
                  defaultChecked={selectedYears.has(year.id)}
                  className="h-4 w-4 cursor-pointer rounded border-white/20 bg-black text-violet-500 focus:ring-violet-400"
                />
                <span>{year.nombre}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Primero cargá al menos un año para poder asignarlo.
          </p>
        )}
      </fieldset>

      {state.message ? (
        <p className={state.ok ? 'text-sm font-medium text-emerald-300' : 'text-sm font-medium text-rose-300'}>
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={isEdit ? 'Guardar cambios' : 'Crear ayudante'} />
        <Link
          href="/admin/users"
          className="inline-flex cursor-pointer items-center justify-center rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          Volver
        </Link>
      </div>
    </form>
  )
}
