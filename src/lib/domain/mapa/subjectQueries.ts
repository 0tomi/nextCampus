import { subjectsData } from './correlativasData';
import type { SubjectNode } from './types';

const subjectBySlug = new Map(subjectsData.map((subject) => [subject.slug, subject]));

export function getSubjectBySlug(slug: string): SubjectNode | undefined {
  return subjectBySlug.get(slug);
}

export function getSubjectName(slug: string): string {
  return getSubjectBySlug(slug)?.nombre ?? 'Materia';
}

export function getUnlocks(slug: string): SubjectNode[] {
  return subjectsData.filter((subject) => subject.correlativas.includes(slug));
}

export function getMissingCorrelatives(subject: SubjectNode, completed: readonly string[]): string[] {
  const completedSet = new Set(completed);
  return subject.correlativas.filter((slug) => !completedSet.has(slug));
}

export function removeSubjectAndDependents(slugToRemove: string, currentCompleted: readonly string[]): string[] {
  let nextCompleted = currentCompleted.filter((slug) => slug !== slugToRemove);
  const dependents = subjectsData.filter(
    (subject) => subject.correlativas.includes(slugToRemove) && nextCompleted.includes(subject.slug),
  );

  for (const dependent of dependents) {
    nextCompleted = removeSubjectAndDependents(dependent.slug, nextCompleted);
  }

  return nextCompleted;
}

export function getSubjectsByYear(year: number): SubjectNode[] {
  return subjectsData.filter((subject) => subject.year === year);
}

export function getSubjectSlugsByYear(year: number): string[] {
  return getSubjectsByYear(year).map((subject) => subject.slug);
}
