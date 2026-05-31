import type { ReactNode } from 'react'
import {
  BookPlus,
  BookOpen,
  BookX,
  Cloud,
  ListVideo,
  FileText,
  FileEdit,
  FileX,
  CalendarPlus,
  CalendarClock,
  CalendarCog,
  CalendarX,
  Layers,
  Library,
  Trash2,
  UserPlus,
  UserCog,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { AUDIT_ACTIONS, type AuditAction, type AuditDetail } from '@/lib/audit-types'

export interface RenderedAuditEntry {
  icon: LucideIcon
  iconClassName: string
  title: ReactNode
  subtitle?: string
}

const PALETTE = {
  created: 'from-emerald-400 to-emerald-600 text-black',
  updated: 'from-amber-400 to-orange-500 text-black',
  deleted: 'from-rose-500 to-pink-600 text-white',
  user: 'from-violet-400 to-fuchsia-500 text-black',
  link: 'from-sky-400 to-cyan-500 text-black',
} as const

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function highlight(text: string | null): ReactNode {
  if (!text) return <span className="text-white/40">sin nombre</span>
  return <span className="font-semibold text-white">{text}</span>
}

function pluralAnios(count: number): string {
  return count === 1 ? '1 año' : `${count} años`
}

function pluralRecursos(count: number): string {
  return count === 1 ? '1 recurso' : `${count} recursos`
}

function pluralPreguntas(count: number): string {
  return count === 1 ? '1 pregunta' : `${count} preguntas`
}

function pluralMaterias(count: number): string {
  return count === 1 ? '1 materia' : `${count} materias`
}

export function renderAuditEntry(
  action: string,
  detail: AuditDetail | null,
): RenderedAuditEntry {
  const d = detail ?? {}

  switch (action as AuditAction) {
    case AUDIT_ACTIONS.SUBJECT_CREATED:
      return {
        icon: BookPlus,
        iconClassName: PALETTE.created,
        title: <>Creó la materia {highlight(asString(d.nombre))}</>,
        subtitle: asString(d.yearSlug) ? `Año: ${d.yearSlug}` : undefined,
      }

    case AUDIT_ACTIONS.SUBJECT_UPDATED:
      return {
        icon: BookOpen,
        iconClassName: PALETTE.updated,
        title: <>Actualizó la materia {highlight(asString(d.nombre))}</>,
        subtitle: asString(d.yearSlug) ? `Año: ${d.yearSlug}` : undefined,
      }

    case AUDIT_ACTIONS.SUBJECT_DELETED:
      return {
        icon: BookX,
        iconClassName: PALETTE.deleted,
        title: <>Eliminó la materia {highlight(asString(d.nombre))}</>,
        subtitle: asString(d.yearSlug) ? `Año: ${d.yearSlug}` : undefined,
      }

    case AUDIT_ACTIONS.SUBJECT_DRIVE_UPDATED: {
      const driveUrl = asString(d.driveUrl)
      return {
        icon: Cloud,
        iconClassName: PALETTE.link,
        title: driveUrl ? (
          <>Actualizó el enlace de Google Drive en {highlight(asString(d.subjectSlug))}</>
        ) : (
          <>Eliminó el enlace de Google Drive en {highlight(asString(d.subjectSlug))}</>
        ),
      }
    }

    case AUDIT_ACTIONS.SUBJECT_PLAYLIST_UPDATED: {
      const enabled = asBoolean(d.playlistEnabled)
      const url = asString(d.playlistUrl)
      let suffix = ''
      if (enabled === true) suffix = 'visible para los estudiantes'
      else if (enabled === false) suffix = 'oculta para los estudiantes'
      return {
        icon: ListVideo,
        iconClassName: PALETTE.link,
        title: url ? (
          <>Actualizó la playlist de {highlight(asString(d.subjectSlug))}</>
        ) : (
          <>Eliminó la playlist de {highlight(asString(d.subjectSlug))}</>
        ),
        subtitle: suffix || undefined,
      }
    }

    case AUDIT_ACTIONS.APUNTE_CREATED: {
      const count = asNumber(d.recursosCount)
      return {
        icon: FileText,
        iconClassName: PALETTE.created,
        title: <>Subió el apunte {highlight(asString(d.titulo))}</>,
        subtitle: [
          asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : null,
          count !== null && count > 0 ? pluralRecursos(count) : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
      }
    }

    case AUDIT_ACTIONS.APUNTE_UPDATED:
      return {
        icon: FileEdit,
        iconClassName: PALETTE.updated,
        title: <>Actualizó el apunte {highlight(asString(d.titulo))}</>,
        subtitle: asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : undefined,
      }

    case AUDIT_ACTIONS.APUNTE_DELETED:
      return {
        icon: FileX,
        iconClassName: PALETTE.deleted,
        title: <>Eliminó el apunte {highlight(asString(d.titulo))}</>,
        subtitle: asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : undefined,
      }

    case AUDIT_ACTIONS.EVENTO_CREATED:
      return {
        icon: CalendarPlus,
        iconClassName: PALETTE.created,
        title: <>Agendó el evento {highlight(asString(d.titulo))}</>,
        subtitle: asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : undefined,
      }

    case AUDIT_ACTIONS.EVENTO_UPDATED:
      return {
        icon: CalendarCog,
        iconClassName: PALETTE.updated,
        title: <>Editó el evento {highlight(asString(d.titulo))}</>,
        subtitle: asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : undefined,
      }

    case AUDIT_ACTIONS.EVENTO_DATE_UPDATED:
      return {
        icon: CalendarClock,
        iconClassName: PALETTE.updated,
        title: <>Movió la fecha del evento {highlight(asString(d.titulo))}</>,
        subtitle: asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : undefined,
      }

    case AUDIT_ACTIONS.EVENTO_DELETED:
      return {
        icon: CalendarX,
        iconClassName: PALETTE.deleted,
        title: <>Borró el evento {highlight(asString(d.titulo))}</>,
        subtitle: asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : undefined,
      }

    case AUDIT_ACTIONS.YEAR_CREATED:
      return {
        icon: Layers,
        iconClassName: PALETTE.created,
        title: <>Creó el año académico {highlight(asString(d.nombre))}</>,
      }

    case AUDIT_ACTIONS.YEAR_UPDATED:
      return {
        icon: Layers,
        iconClassName: PALETTE.updated,
        title: <>Actualizó el año académico {highlight(asString(d.nombre))}</>,
      }

    case AUDIT_ACTIONS.YEAR_DELETED: {
      const subjectsCount = asNumber(d.subjectsCount) ?? 0
      return {
        icon: Trash2,
        iconClassName: PALETTE.deleted,
        title: <>Eliminó el año académico {highlight(asString(d.nombre))}</>,
        subtitle: subjectsCount > 0 ? `Arrastró ${pluralMaterias(subjectsCount)}` : undefined,
      }
    }

    case AUDIT_ACTIONS.USER_CREATED: {
      const count = asNumber(d.yearsCount) ?? 0
      return {
        icon: UserPlus,
        iconClassName: PALETTE.user,
        title: <>Sumó al administrador {highlight(asString(d.email))}</>,
        subtitle: count > 0 ? `Con acceso a ${pluralAnios(count)}` : undefined,
      }
    }

    case AUDIT_ACTIONS.USER_UPDATED: {
      const changes: string[] = []
      if (asBoolean(d.emailChanged) === true) changes.push('cambió el email')
      if (asBoolean(d.passwordChanged) === true) changes.push('reseteó la contraseña')
      if (asString(d.status) === 'DISABLED') changes.push('desactivó la cuenta')
      else if (asString(d.status) === 'ACTIVE') changes.push('cuenta activa')
      return {
        icon: UserCog,
        iconClassName: PALETTE.user,
        title: <>Actualizó al administrador {highlight(asString(d.email))}</>,
        subtitle: changes.length > 0 ? changes.join(' · ') : undefined,
      }
    }

    case AUDIT_ACTIONS.QUIZ_BANK_UPLOADED: {
      const count = asNumber(d.totalPreguntas) ?? 0
      return {
        icon: Library,
        iconClassName: PALETTE.created,
        title: <>Cargó el banco de preguntas {highlight(asString(d.nombre))}</>,
        subtitle: [
          asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : null,
          count > 0 ? pluralPreguntas(count) : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
      }
    }

    case AUDIT_ACTIONS.QUIZ_BANK_DELETED:
      return {
        icon: Trash2,
        iconClassName: PALETTE.deleted,
        title: <>Eliminó un banco de preguntas</>,
        subtitle: asString(d.subjectSlug) ? `Materia: ${d.subjectSlug}` : undefined,
      }

    default:
      // Forward-compat: si aparece una acción que el renderer no conoce
      // todavía, no exponemos el JSON crudo — mostramos un mensaje genérico.
      return {
        icon: Sparkles,
        iconClassName: 'from-white/20 to-white/10 text-white',
        title: <>Realizó una acción administrativa</>,
      }
  }
}

// Tiempo relativo en español, ej. "hace 5 min", "hace 2 h", "hace 3 días".
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
  if (seconds < 60) return 'hace unos segundos'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes === 1 ? 'hace 1 min' : `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'hace 1 h' : `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? 'hace 1 día' : `hace ${days} días`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? 'hace 1 mes' : `hace ${months} meses`
  const years = Math.floor(days / 365)
  return years === 1 ? 'hace 1 año' : `hace ${years} años`
}
