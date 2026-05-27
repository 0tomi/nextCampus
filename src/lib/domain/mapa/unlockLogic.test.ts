import { describe, expect, it } from 'vitest';
import { calculateSubjectStatuses } from './unlockLogic';

const P1 = '';
const P2 = '';
const P3 = '';

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

  it('debería desbloquear una materia de segundo año cuando se completan todas sus correlativas', () => {
    const completed = [`${P1}fundamentos-de-programacion`, `${P1}logica-y-algebra`];
    const statuses = calculateSubjectStatuses(completed);

    // Algoritmos y Estructura de Datos requiere Fundamentos de Programación y Lógica y Álgebra.
    expect(statuses[`${P2}algoritmos-y-estructuras-de-datos`]).toBe('UNLOCKED');
    
    // Ingeniería de Software I sigue bloqueada porque también requiere Sistemas y Organizaciones.
    expect(statuses[`${P2}ingenieria-de-software-i`]).toBe('LOCKED');
  });

  it('debería manejar múltiples correlativas para una materia', () => {
    const P2_poo = `${P2}programacion-orientada-a-objetos`;
    const P2_discreta = `${P2}matematica-discreta`;
    const P2_algoritmos = `${P2}algoritmos-y-estructuras-de-datos`;
    
    // Bases de Datos requiere tres correlativas directas según Plande.
    const db_subject = `${P3}bases-de-datos`;

    // Caso 1: Ninguna aprobada
    let statuses = calculateSubjectStatuses([]);
    expect(statuses[db_subject]).toBe('LOCKED');

    // Caso 2: Solo una parte de las correlativas aprobada
    statuses = calculateSubjectStatuses([P2_algoritmos, P2_poo]);
    expect(statuses[db_subject]).toBe('LOCKED');

    // Caso 3: Todas aprobadas
    statuses = calculateSubjectStatuses([P2_algoritmos, P2_poo, P2_discreta]);
    expect(statuses[db_subject]).toBe('UNLOCKED');
  });
});
