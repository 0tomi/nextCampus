import { describe, expect, it } from 'vitest';
import { subjectsData } from '@/lib/domain/mapa/correlativasData';
import {
  getMissingCorrelatives,
  getSubjectBySlug,
  getUnlocks,
} from '@/lib/domain/mapa/subjectQueries';
import { calculateSubjectStatuses } from '@/lib/domain/mapa/unlockLogic';
import { deriveMapaState } from './useMapaState';

const fundamentos = 'fundamentos-de-programacion';
const poo = 'programacion-orientada-a-objetos';

function derive(overrides: Partial<Parameters<typeof deriveMapaState>[0]> = {}) {
  const completed = overrides.completed ?? [];
  const selectedSubject =
    overrides.selectedSubject ?? getSubjectBySlug(fundamentos) ?? subjectsData[0]!;

  return deriveMapaState({
    availableSubjectSlugs: [],
    completed,
    searchTerm: '',
    selectedSubject,
    statusFilter: 'ALL',
    subjectStatuses: calculateSubjectStatuses([...completed]),
    suggestedSubjectsLimit: 5,
    suggestedYearToComplete: null,
    yearFilter: 'ALL',
    ...overrides,
  });
}

describe('deriveMapaState', () => {
  it('devuelve todas las materias agrupadas por año sin filtros', () => {
    const state = derive();

    expect(state.filteredSubjects).toHaveLength(subjectsData.length);
    expect(Object.values(state.subjectsByYear).flat()).toHaveLength(subjectsData.length);
  });

  it('filtra materias por nombre', () => {
    const state = derive({ searchTerm: 'Programación Orientada' });

    expect(state.filteredSubjects.map((subject) => subject.slug)).toEqual([poo]);
  });

  it('deja solo materias bloqueadas', () => {
    const statuses = calculateSubjectStatuses([]);
    const state = derive({ statusFilter: 'LOCKED' });

    expect(state.filteredSubjects.length).toBeGreaterThan(0);
    expect(
      state.filteredSubjects.every((subject) => statuses[subject.slug] === 'LOCKED'),
    ).toBe(true);
  });

  it('filtra las materias del año móvil seleccionado', () => {
    const state = derive({ yearFilter: 2 });

    expect(state.filteredSubjects.length).toBeGreaterThan(0);
    expect(state.filteredSubjects.every((subject) => subject.year === 2)).toBe(true);
  });

  it('deriva desbloqueos y correlativas faltantes de la materia seleccionada', () => {
    const selectedSubject = getSubjectBySlug(poo);
    expect(selectedSubject).toBeDefined();
    if (!selectedSubject) return;

    const completed = [fundamentos];
    const state = derive({ completed, selectedSubject });

    expect(state.selectedUnlocks).toEqual(getUnlocks(poo));
    expect(state.selectedMissing).toEqual(
      getMissingCorrelatives(selectedSubject, completed),
    );
    expect(state.selectedMissingSubjects.map((subject) => subject.slug)).toEqual(
      getMissingCorrelatives(selectedSubject, completed),
    );
  });
});
