'use client';

import { subjectsData } from '@/lib/domain/mapa/correlativasData';

const MAPA_PROGRESS_STORAGE_KEY = 'nextcampus_progreso_materias';
const MAPA_PROGRESS_UPDATED_EVENT = 'nextcampus:mapa-progress-updated';

const validSubjectSlugs = new Set(subjectsData.map((subject) => subject.slug));
const EMPTY_PROGRESS: string[] = [];
let cachedRaw: string | null | undefined;
let cachedProgress: string[] = EMPTY_PROGRESS;

function normalizeProgress(value: unknown): string[] {
  if (!Array.isArray(value)) return EMPTY_PROGRESS;

  const next = value.filter(
    (slug, index, array): slug is string =>
      typeof slug === 'string' && validSubjectSlugs.has(slug) && array.indexOf(slug) === index,
  );

  return next.length > 0 ? next : EMPTY_PROGRESS;
}

function parseStoredProgress(raw: string | null): string[] {
  if (!raw) return EMPTY_PROGRESS;

  try {
    return normalizeProgress(JSON.parse(raw));
  } catch {
    localStorage.removeItem(MAPA_PROGRESS_STORAGE_KEY);
    return EMPTY_PROGRESS;
  }
}

export function getMapaProgressSnapshot(): string[] {
  if (typeof window === 'undefined') return EMPTY_PROGRESS;

  const raw = localStorage.getItem(MAPA_PROGRESS_STORAGE_KEY);

  if (raw === cachedRaw) {
    return cachedProgress;
  }

  cachedRaw = raw;
  cachedProgress = parseStoredProgress(raw);
  return cachedProgress;
}

export function subscribeMapaProgress(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === MAPA_PROGRESS_STORAGE_KEY) {
      cachedRaw = undefined;
      onStoreChange();
    }
  };

  window.addEventListener(MAPA_PROGRESS_UPDATED_EVENT, onStoreChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(MAPA_PROGRESS_UPDATED_EVENT, onStoreChange);
    window.removeEventListener('storage', handleStorage);
  };
}

export function writeMapaProgress(nextCompleted: readonly string[]) {
  const normalized = normalizeProgress(nextCompleted);
  const raw = JSON.stringify(normalized);

  cachedRaw = raw;
  cachedProgress = normalized;
  localStorage.setItem(MAPA_PROGRESS_STORAGE_KEY, raw);
  window.dispatchEvent(new CustomEvent(MAPA_PROGRESS_UPDATED_EVENT, { detail: normalized }));
}
