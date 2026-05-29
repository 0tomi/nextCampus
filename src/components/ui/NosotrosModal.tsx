'use client'

import { useEffect, useState, useRef } from 'react'
import { X, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

interface NosotrosModalProps {
  open: boolean
  onClose: () => void
}

export function NosotrosModal({ open, onClose }: NosotrosModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle mounting and open/close transitions
  useEffect(() => {
    if (open) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setMounted(true)
      // Use a brief timeout to ensure the browser repaints the initial scale-95 opacity-0 state
      const timer = setTimeout(() => {
        setVisible(true)
      }, 20)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
      timeoutRef.current = setTimeout(() => {
        setMounted(false)
      }, 300) // Match transition duration (300ms)
    }
  }, [open])

  // Lock body scroll when open
  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted])

  // Close on Escape key
  useEffect(() => {
    if (!visible) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [visible, onClose])

  // Focus trap inside the modal
  useEffect(() => {
    if (!visible || !dialogRef.current) return
    const el = dialogRef.current

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first?.focus()

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [visible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!mounted) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ease-out',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        className={cn(
          'relative w-full max-w-md overflow-hidden border border-white/8 bg-surface-1 shadow-[0_24px_64px_rgba(0,0,0,0.85)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-2xl',
          visible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-orange-500/10 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-6 py-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-black">
              <GraduationCap size={16} strokeWidth={2.5} />
            </div>
            <h2 id="about-modal-title" className="text-base font-black tracking-tight text-white font-display">
              Sobre nosotros
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5 relative z-10">
          <p className="text-sm leading-relaxed text-white/70">
            Somos estudiantes de la carrera de Licenciatura en Sistemas. Vimos que el campus no suple algunas
            necesidades que tenemos, por lo que decidimos actuar implementando nuestra propia visión de un campus
            universitario inteligente. En este campus podés encontrar diversas herramientas como un{' '}
            <strong className="font-bold text-white">Calendario</strong> con eventos por materia,{' '}
            <strong className="font-bold text-white">Quiz</strong> para autoevaluarse, y{' '}
            <strong className="font-bold text-white">Apuntes interactivos</strong>.
          </p>

          <p className="text-sm leading-relaxed text-white/70">
            Todo el código es libre y abierto. Podés encontrarlo y aportar en nuestro repositorio de GitHub.
          </p>

          <div className="pt-2">
            <a
              href="https://github.com/0tomi/nextCampus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-all hover:bg-white/90 active:scale-[0.98] cursor-pointer"
            >
              <GithubIcon className="h-4 w-4" />
              Ver repositorio en GitHub
            </a>
          </div>

          {/* Developer contacts */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">
              Redes de los desarrolladores
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://instagram.com/tomischl"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
                @tomischl
              </a>
              <a
                href="https://instagram.com/tomygiorgi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
                @tomygiorgi
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
