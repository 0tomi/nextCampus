import { describe, expect, it } from 'vitest';
import {
  getMissingCorrelatives,
  getSubjectBySlug,
  getSubjectName,
  getSubjectSlugsByYear,
  getUnlocks,
  removeSubjectAndDependents,
} from './subjectQueries';

const fundamentos = 'fundamentos-de-programacion';
const sistemas = 'sistemas-y-organizaciones';
const ingles = 'lecto-comprension-en-ingles';
const fundamentosComputacion = 'fundamentos-de-computacion';
const ingenieria1 = 'ingenieria-de-software-i';
const poo = 'programacion-orientada-a-objetos';
const programacionAvanzada = 'programacion-avanzada';

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
});
