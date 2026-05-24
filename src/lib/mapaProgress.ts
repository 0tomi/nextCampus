'use client';

import { subjectsData } from '@/lib/domain/mapa/correlativasData';

export const MAPA_PROGRESS_STORAGE_KEY = 'nextcampus_progreso_materias';
export const MAPA_PROGRESS_UPDATED_EVENT = 'nextcampus:mapa-progress-updated';

export function readMapaProgress(): string[] {
  if (typeof window === 'undefined') return [];

  const saved = localStorage.getItem(MAPA_PROGRESS_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved) as string[];
    return parsed.filter((slug) => subjectsData.some((subject) => subject.slug === slug));
  } catch {
    localStorage.removeItem(MAPA_PROGRESS_STORAGE_KEY);
    return [];
  }
}

export function writeMapaProgress(nextCompleted: string[]) {
  localStorage.setItem(MAPA_PROGRESS_STORAGE_KEY, JSON.stringify(nextCompleted));
  window.dispatchEvent(new CustomEvent(MAPA_PROGRESS_UPDATED_EVENT, { detail: nextCompleted }));
}
