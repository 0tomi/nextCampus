import type { SubjectStatus } from './types';

export const EMPTY_STRING_ARRAY: string[] = [];

export const MAPA_YEARS = [1, 2, 3, 4, 5] as const;
export type MapaYear = (typeof MAPA_YEARS)[number];

export const YEAR_LABELS: Record<MapaYear, string> = {
  1: 'Primer año',
  2: 'Segundo año',
  3: 'Tercer año',
  4: 'Cuarto año',
  5: 'Quinto año',
};

export const YEAR_ACTION_LABELS: Record<MapaYear, string> = {
  1: '1er año',
  2: '2do año',
  3: '3er año',
  4: '4to año',
  5: '5to año',
};

export const YEAR_SHORT_LABELS: Record<MapaYear, string> = {
  1: '1ro',
  2: '2do',
  3: '3ro',
  4: '4to',
  5: '5to',
};

export const DESKTOP_STATUS_LABELS: Record<SubjectStatus, string> = {
  COMPLETED: 'Marcada',
  UNLOCKED: 'Disponible',
  LOCKED: 'En espera',
};

export const MOBILE_STATUS_LABELS: Record<SubjectStatus, string> = {
  COMPLETED: 'Marcada',
  UNLOCKED: 'Lista para cursar',
  LOCKED: 'Todavía no',
};

export const VISUAL_STATUS_LABELS: Record<SubjectStatus, string> = {
  COMPLETED: 'Completada',
  UNLOCKED: 'Disponible',
  LOCKED: 'En espera',
};

export const MOBILE_STATUS_BADGE: Record<SubjectStatus, string> = {
  COMPLETED: 'border-emerald-300/25 bg-emerald-400/12 text-emerald-50',
  UNLOCKED: 'border-amber-300/25 bg-amber-300/12 text-amber-50',
  LOCKED: 'border-white/10 bg-white/6 text-white/48',
};

export const MOBILE_STATUS_CARD: Record<SubjectStatus, string> = {
  COMPLETED: 'border-emerald-300/18 bg-emerald-400/8',
  UNLOCKED: 'border-amber-300/18 bg-amber-300/8',
  LOCKED: 'border-white/10 bg-white/5',
};

export const VISUAL_STATUS_STYLES: Record<SubjectStatus, string> = {
  COMPLETED: 'border-emerald-200/52 bg-emerald-300/16 text-emerald-50 shadow-[0_0_42px_rgba(52,211,153,0.22)]',
  UNLOCKED: 'border-amber-200/52 bg-amber-300/14 text-amber-50 shadow-[0_0_42px_rgba(251,191,36,0.18)]',
  LOCKED: 'border-white/12 bg-black/44 text-white/54 shadow-none',
};

export const VISUAL_STATUS_ACCENTS: Record<SubjectStatus, string> = {
  COMPLETED: '#6ee7b7',
  UNLOCKED: '#fde68a',
  LOCKED: '#64748b',
};
