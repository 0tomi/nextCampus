import { describe, expect, it } from 'vitest';
import { calculateSubjectStatuses } from './unlockLogic';

const P1 = 'sistemas-uader-fcyt-anio-1-';
const P2 = 'sistemas-uader-fcyt-anio-2-';
const P3 = 'sistemas-uader-fcyt-anio-3-';

describe('Pruebas unitarias de la lógica de desbloqueo de correlativas', () => {
  it('debería retornar materias de primer año desbloqueadas cuando el alumno no completó nada', () => {
    const statuses = calculateSubjectStatuses([]);

    // Materias de primer año sin correlativas
    expect(statuses[`${P1}sistemas-y-organizaciones`]).toBe('UNLOCKED');
    expect(statuses[`${P1}fundamentos-de-programacion`]).toBe('UNLOCKED');

    // Materias de segundo año con correlativas deberían estar bloqueadas
    expect(statuses[`${P2}ingenieria-de-software-i`]).toBe('LOCKED');
    expect(statuses[`${P2}algoritmos-y-estructuras-de-datos`]).toBe('LOCKED');
  });

  it('debería marcar las materias aprobadas como COMPLETADAS', () => {
    const completed = [`${P1}fundamentos-de-programacion`];
    const statuses = calculateSubjectStatuses(completed);

    expect(statuses[`${P1}fundamentos-de-programacion`]).toBe('COMPLETED');
  });

  it('debería desbloquear una materia de segundo año cuando se aprueba su correlativa', () => {
    const completed = [`${P1}fundamentos-de-programacion`];
    const statuses = calculateSubjectStatuses(completed);

    // Algoritmos y Estructuras de Datos requiere Fundamentos de Programación
    expect(statuses[`${P2}algoritmos-y-estructuras-de-datos`]).toBe('UNLOCKED');
    
    // Ingeniería de Software I sigue bloqueada porque requiere Sistemas y Organizaciones
    expect(statuses[`${P2}ingenieria-de-software-i`]).toBe('LOCKED');
  });

  it('debería manejar múltiples correlativas para una materia', () => {
    const P1_algebra = `${P1}logica-y-algebra`;
    const P2_algoritmos = `${P2}algoritmos-y-estructuras-de-datos`;
    
    // Bases de Datos requiere Lógica y Álgebra (Año 1) Y Algoritmos y Estructuras de Datos (Año 2)
    const db_subject = `${P3}bases-de-datos`;

    // Caso 1: Ninguna aprobada
    let statuses = calculateSubjectStatuses([]);
    expect(statuses[db_subject]).toBe('LOCKED');

    // Caso 2: Solo una de las dos aprobada
    statuses = calculateSubjectStatuses([P1_algebra]);
    expect(statuses[db_subject]).toBe('LOCKED');

    // Caso 3: Ambas aprobadas
    statuses = calculateSubjectStatuses([P1_algebra, P2_algoritmos]);
    expect(statuses[db_subject]).toBe('UNLOCKED');
  });
});
