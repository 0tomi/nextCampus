import { describe, expect, it } from 'vitest';
import {
  canOpenSubjectPage,
  filterSubjects,
  getMissingCorrelatives,
  getSuggestedSubjects,
  getSubjectBySlug,
  getSubjectName,
  getSubjectSlugsByYear,
  getUnlocks,
  getYearSummaries,
  groupSubjectsByYear,
  removeSubjectAndDependents,
} from './subjectQueries';
import type { SubjectStatus } from './types';

const fundamentos = 'fundamentos-de-programacion';
const sistemas = 'sistemas-y-organizaciones';
const ingles = 'lecto-comprension-en-ingles';
const fundamentosComputacion = 'fundamentos-de-computacion';
const ingenieria1 = 'ingenieria-de-software-i';
const poo = 'programacion-orientada-a-objetos';
const programacionAvanzada = 'programacion-avanzada';
const algoritmos = 'algoritmos-y-estructuras-de-datos';

describe('subjectQueries', () => {
  it('resuelve nombres y materias por slug', () => {
    expect(getSubjectName(fundamentos)).toBe('Fundamentos de Programación');
    expect(getSubjectBySlug(fundamentos)?.codigo).toBe('102');
    expect(getSubjectName('slug-inexistente')).toBe('Materia');
  });

  it('calcula materias desbloqueadas por una correlativa directa', () => {
    const unlocks = getUnlocks(fundamentos).map((subject) => subject.slug);

    expect(unlocks).toContain(ingenieria1);
    expect(unlocks).toContain(poo);
  });

  it('detecta correlativas faltantes sin depender del orden', () => {
    const subject = getSubjectBySlug(poo);
    expect(subject).toBeDefined();
    if (!subject) return;

    expect(getMissingCorrelatives(subject, [fundamentos])).toEqual([
      ingles,
      fundamentosComputacion,
    ]);
  });

  it('quita en cascada dependientes ya marcadas cuando se desmarca una materia base', () => {
    expect(removeSubjectAndDependents(fundamentos, [fundamentos, sistemas, ingenieria1, poo, programacionAvanzada])).toEqual([
      sistemas,
    ]);
  });

  it('lista slugs por año para autocompletar progreso', () => {
    const firstYear = getSubjectSlugsByYear(1);

    expect(firstYear).toContain(fundamentos);
    expect(firstYear).toContain(sistemas);
    expect(firstYear).not.toContain(ingenieria1);
  });

  it('filtra por nombre o código normalizados, estado y año', () => {
    const statuses: Record<string, SubjectStatus> = {
      [fundamentos]: 'UNLOCKED',
      [poo]: 'COMPLETED',
    };

    expect(filterSubjects({
      searchTerm: '  FUNDAMENTOS  ',
      statusFilter: 'UNLOCKED',
      subjectStatuses: statuses,
    }).map((subject) => subject.slug)).toContain(fundamentos);

    expect(filterSubjects({
      searchTerm: '102',
      statusFilter: 'ALL',
      yearFilter: 1,
      subjectStatuses: statuses,
    }).map((subject) => subject.slug)).toEqual([fundamentos]);

    expect(filterSubjects({
      searchTerm: '',
      statusFilter: 'COMPLETED',
      yearFilter: 2,
      subjectStatuses: statuses,
    }).map((subject) => subject.slug)).toEqual([poo]);
  });

  it('ordena sugerencias por materias que destraban y respeta el límite', () => {
    const statuses: Record<string, SubjectStatus> = {
      [fundamentos]: 'UNLOCKED',
      [algoritmos]: 'UNLOCKED',
      [poo]: 'UNLOCKED',
    };

    expect(getSuggestedSubjects(statuses, 2).map((subject) => subject.slug)).toEqual([
      algoritmos,
      poo,
    ]);
  });

  it('agrupa materias por año sin perderlas', () => {
    const grouped = groupSubjectsByYear([
      getSubjectBySlug(fundamentos)!,
      getSubjectBySlug(poo)!,
    ]);

    expect(grouped[1].map((subject) => subject.slug)).toEqual([fundamentos]);
    expect(grouped[2].map((subject) => subject.slug)).toEqual([poo]);
    expect(grouped[3]).toEqual([]);
  });

  it('resume estados por año', () => {
    const statuses: Record<string, SubjectStatus> = {
      [fundamentos]: 'COMPLETED',
      [sistemas]: 'COMPLETED',
      [ingles]: 'UNLOCKED',
    };
    const firstYear = getYearSummaries(statuses).find((summary) => summary.year === 1);

    expect(firstYear).toMatchObject({
      title: 'Primer año',
      done: 2,
      ready: 1,
      total: 7,
    });
  });

  it('abre materias sin gating o solo cuando el slug está disponible', () => {
    expect(canOpenSubjectPage(new Set(), fundamentos)).toBe(true);
    expect(canOpenSubjectPage(new Set([fundamentos]), fundamentos)).toBe(true);
    expect(canOpenSubjectPage(new Set([fundamentos]), poo)).toBe(false);
  });
});
