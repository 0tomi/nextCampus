import type { SubjectNode } from './types';

const P1 = 'sistemas-uader-fcyt-anio-1-';
const P2 = 'sistemas-uader-fcyt-anio-2-';
const P3 = 'sistemas-uader-fcyt-anio-3-';
const P4 = 'sistemas-uader-fcyt-anio-4-';
const P5 = 'sistemas-uader-fcyt-anio-5-';

export const subjectsData: SubjectNode[] = [
  // ---------------------------------------------------------------------------
  // Primer Año
  // ---------------------------------------------------------------------------
  {
    slug: `${P1}sistemas-y-organizaciones`,
    nombre: 'Sistemas y Organizaciones',
    year: 1,
    correlativas: [],
  },
  {
    slug: `${P1}fundamentos-de-programacion`,
    nombre: 'Fundamentos de Programación',
    year: 1,
    correlativas: [],
  },
  {
    slug: `${P1}calculo-diferencial-e-integral`,
    nombre: 'Cálculo Diferencial e Integral',
    year: 1,
    correlativas: [],
  },
  {
    slug: `${P1}logica-y-algebra`,
    nombre: 'Lógica y Álgebra',
    year: 1,
    correlativas: [],
  },
  {
    slug: `${P1}lecto-comprension-en-ingles`,
    nombre: 'Lecto-Comprensión en Inglés',
    year: 1,
    correlativas: [],
  },
  {
    slug: `${P1}derechos-humanos-y-tecnologia`,
    nombre: 'Derechos Humanos y Tecnología',
    year: 1,
    correlativas: [],
  },
  {
    slug: `${P1}fundamentos-de-computacion`,
    nombre: 'Fundamentos de Computación',
    year: 1,
    correlativas: [],
  },

  // ---------------------------------------------------------------------------
  // Segundo Año
  // ---------------------------------------------------------------------------
  {
    slug: `${P2}ingenieria-de-software-i`,
    nombre: 'Ingeniería de Software I',
    year: 2,
    correlativas: [`${P1}sistemas-y-organizaciones`],
  },
  {
    slug: `${P2}algoritmos-y-estructuras-de-datos`,
    nombre: 'Algoritmos y Estructuras de Datos',
    year: 2,
    correlativas: [`${P1}fundamentos-de-programacion`],
  },
  {
    slug: `${P2}programacion-orientada-a-objetos`,
    nombre: 'Programación Orientada a Objetos',
    year: 2,
    correlativas: [`${P2}algoritmos-y-estructuras-de-datos`],
  },
  {
    slug: `${P2}matematica-discreta`,
    nombre: 'Matemática Discreta',
    year: 2,
    correlativas: [`${P1}logica-y-algebra`],
  },
  {
    slug: `${P2}ecuaciones-diferenciales-y-calculo-multivariado`,
    nombre: 'Ecuaciones Diferenciales y Cálculo Multivariado',
    year: 2,
    correlativas: [`${P1}calculo-diferencial-e-integral`, `${P1}logica-y-algebra`],
  },
  {
    slug: `${P2}arquitectura-de-computadoras`,
    nombre: 'Arquitectura de Computadoras',
    year: 2,
    correlativas: [`${P1}fundamentos-de-computacion`],
  },

  // ---------------------------------------------------------------------------
  // Tercer Año
  // ---------------------------------------------------------------------------
  {
    slug: `${P3}ingenieria-de-software-ii`,
    nombre: 'Ingeniería de Software II',
    year: 3,
    correlativas: [`${P2}ingenieria-de-software-i`],
  },
  {
    slug: `${P3}bases-de-datos`,
    nombre: 'Bases de Datos',
    year: 3,
    correlativas: [`${P2}algoritmos-y-estructuras-de-datos`, `${P1}logica-y-algebra`],
  },
  {
    slug: `${P3}sistemas-operativos`,
    nombre: 'Sistemas Operativos',
    year: 3,
    correlativas: [`${P2}arquitectura-de-computadoras`],
  },
  {
    slug: `${P3}probabilidad-y-estadistica`,
    nombre: 'Probabilidad y Estadística',
    year: 3,
    correlativas: [`${P2}ecuaciones-diferenciales-y-calculo-multivariado`],
  },
  {
    slug: `${P3}paradigmas-y-lenguajes`,
    nombre: 'Paradigmas y Lenguajes',
    year: 3,
    correlativas: [`${P2}programacion-orientada-a-objetos`, `${P2}matematica-discreta`],
  },
  {
    slug: `${P3}etica-profesional`,
    nombre: 'Ética Profesional',
    year: 3,
    correlativas: [`${P1}derechos-humanos-y-tecnologia`],
  },
  {
    slug: `${P3}programacion-avanzada`,
    nombre: 'Programación Avanzada',
    year: 3,
    correlativas: [`${P2}programacion-orientada-a-objetos`],
  },
  {
    slug: `${P3}taller-de-integracion`,
    nombre: 'Taller de Integración',
    year: 3,
    correlativas: [`${P2}ingenieria-de-software-i`, `${P3}bases-de-datos`],
  },

  // ---------------------------------------------------------------------------
  // Cuarto Año
  // ---------------------------------------------------------------------------
  {
    slug: `${P4}inteligencia-artificial`,
    nombre: 'Inteligencia Artificial',
    year: 4,
    correlativas: [`${P3}paradigmas-y-lenguajes`, `${P3}probabilidad-y-estadistica`],
  },
  {
    slug: `${P4}bases-de-datos-avanzadas`,
    nombre: 'Bases de Datos Avanzadas',
    year: 4,
    correlativas: [`${P3}bases-de-datos`],
  },
  {
    slug: `${P4}comunicaciones-y-redes`,
    nombre: 'Comunicaciones y Redes',
    year: 4,
    correlativas: [`${P3}sistemas-operativos`],
  },
  {
    slug: `${P4}metodologia-de-la-investigacion`,
    nombre: 'Metodología de la Investigación',
    year: 4,
    correlativas: [`${P3}etica-profesional`],
  },
  {
    slug: `${P4}investigacion-operativa`,
    nombre: 'Investigación Operativa',
    year: 4,
    correlativas: [`${P3}probabilidad-y-estadistica`],
  },
  {
    slug: `${P4}optativa-1`,
    nombre: 'Optativa 1',
    year: 4,
    correlativas: [`${P3}taller-de-integracion`],
  },
  {
    slug: `${P4}computacion-avanzada`,
    nombre: 'Computación Avanzada',
    year: 4,
    correlativas: [`${P3}sistemas-operativos`],
  },
  {
    slug: `${P4}optativa-2`,
    nombre: 'Optativa 2',
    year: 4,
    correlativas: [`${P3}taller-de-integracion`],
  },

  // ---------------------------------------------------------------------------
  // Quinto Año
  // ---------------------------------------------------------------------------
  {
    slug: `${P5}seguridad-y-auditoria`,
    nombre: 'Seguridad y Auditoria',
    year: 5,
    correlativas: [`${P4}comunicaciones-y-redes`, `${P4}bases-de-datos-avanzadas`],
  },
  {
    slug: `${P5}administracion-de-recursos`,
    nombre: 'Administración de Recursos',
    year: 5,
    correlativas: [`${P4}investigacion-operativa`],
  },
  {
    slug: `${P5}teoria-de-computabilidad`,
    nombre: 'Teoría de Computabilidad',
    year: 5,
    correlativas: [`${P4}computacion-avanzada`],
  },
  {
    slug: `${P5}tesina-de-grado`,
    nombre: 'Tesina de Grado',
    year: 5,
    correlativas: [`${P4}metodologia-de-la-investigacion`],
  },
  {
    slug: `${P5}interfaz-hombre-maquina`,
    nombre: 'Interfaz Hombre Máquina',
    year: 5,
    correlativas: [`${P3}programacion-avanzada`],
  },
  {
    slug: `${P5}optativa-3`,
    nombre: 'Optativa 3',
    year: 5,
    correlativas: [`${P4}optativa-1`],
  },
];
