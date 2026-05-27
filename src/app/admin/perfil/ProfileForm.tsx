'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { initialProfileActionState, type ProfileActionState } from './schemas'

interface ProfileFormProps {
  currentEmail: string
  updateEmailAction: (
    prev: ProfileActionState,
    formData: FormData,
  ) => Promise<ProfileActionState>
  updatePasswordAction: (
    prev: ProfileActionState,
    formData: FormData,
  ) => Promise<ProfileActionState>
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex cursor-pointer items-center justify-center rounded-md bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function FeedbackMessage({ state }: { state: ProfileActionState }) {
  if (!state.message) return null

  return (
    <p className={state.ok ? 'text-sm font-medium text-emerald-300' : 'text-sm font-medium text-rose-300'}>
      {state.message}
    </p>
  )
}

export function ProfileForm({ currentEmail, updateEmailAction, updatePasswordAction }: ProfileFormProps) {
  const [emailState, emailFormAction] = useActionState(updateEmailAction, initialProfileActionState)
  const [passwordState, passwordFormAction] = useActionState(
    updatePasswordAction,
    initialProfileActionState,
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={emailFormAction} className="space-y-6 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-200/70">Correo</p>
          <h2 className="mt-3 font-display text-2xl font-black tracking-tight text-white">Actualizá tu dirección</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Mantené este dato al día para seguir recibiendo avisos en la cuenta correcta.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-white/75">Correo actual</span>
            <input
              type="email"
              value={currentEmail}
              readOnly
              className="block w-full rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70 outline-none"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white/75">Nuevo correo</span>
            <input
              name="nextEmail"
              type="email"
              required
              autoComplete="email"
              placeholder="nuevo@campus.com"
              className="block w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-300/60"
            />
          </label>
        </div>

        <FeedbackMessage state={emailState} />

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label="Guardar correo" pendingLabel="Guardando…" />
        </div>
      </form>

      <form
        action={passwordFormAction}
        className="space-y-6 rounded-lg border border-white/10 bg-white/[0.03] p-6"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-200/70">Contraseña</p>
          <h2 className="mt-3 font-display text-2xl font-black tracking-tight text-white">Renová tu acceso</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Elegí una clave nueva para entrar con más tranquilidad.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-white/75">Contraseña actual</span>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="block w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition focus:border-violet-300/60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white/75">Nueva contraseña</span>
            <input
              name="nextPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="block w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-300/60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white/75">Confirmar nueva contraseña</span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="block w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition focus:border-violet-300/60"
            />
          </label>
        </div>

        <FeedbackMessage state={passwordState} />

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label="Guardar contraseña" pendingLabel="Actualizando…" />
        </div>
      </form>
    </div>
  )
}
