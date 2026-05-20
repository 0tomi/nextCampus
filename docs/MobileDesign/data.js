// Mock data del campus — espejo de los queries reales de nextCampus
window.CAMPUS_DATA = (() => {
  const subj = (slug, nombre) => ({ slug, nombre });

  const career = {
    nombre: 'Licenciatura en Sistemas',
    descripcion:
      'Carrera de grado de la Facultad de Ciencia y Tecnología de UADER. Plan 2018 — 5 años académicos, modalidad presencial.',
    years: [
      {
        id: 'y1',
        slug: 'primer-anio',
        nombre: 'Primer año',
        subjects: [
          subj('algoritmos-y-estructuras-de-datos', 'Algoritmos y Estructuras de Datos'),
          subj('analisis-matematico-1', 'Análisis Matemático I'),
          subj('algebra-y-geometria-analitica', 'Álgebra y Geometría Analítica'),
          subj('logica-para-computacion', 'Lógica para Computación'),
          subj('arquitectura-de-computadoras', 'Arquitectura de Computadoras'),
        ],
      },
      {
        id: 'y2',
        slug: 'segundo-anio',
        nombre: 'Segundo año',
        subjects: [
          subj('programacion-orientada-a-objetos', 'Programación Orientada a Objetos'),
          subj('bases-de-datos', 'Bases de Datos'),
          subj('paradigmas-y-lenguajes', 'Paradigmas y Lenguajes'),
          subj('analisis-matematico-2', 'Análisis Matemático II'),
          subj('probabilidad-y-estadistica', 'Probabilidad y Estadística'),
        ],
      },
      {
        id: 'y3',
        slug: 'tercer-anio',
        nombre: 'Tercer año',
        subjects: [
          subj('ingenieria-de-software', 'Ingeniería de Software'),
          subj('sistemas-operativos', 'Sistemas Operativos'),
          subj('redes-de-computadoras', 'Redes de Computadoras'),
          subj('inteligencia-artificial', 'Inteligencia Artificial'),
          subj('investigacion-operativa', 'Investigación Operativa'),
        ],
      },
      {
        id: 'y4',
        slug: 'cuarto-anio',
        nombre: 'Cuarto año',
        subjects: [
          subj('arquitectura-de-software', 'Arquitectura de Software'),
          subj('sistemas-distribuidos', 'Sistemas Distribuidos'),
          subj('seguridad-informatica', 'Seguridad Informática'),
          subj('taller-de-integracion', 'Taller de Integración'),
        ],
      },
      {
        id: 'y5',
        slug: 'quinto-anio',
        nombre: 'Quinto año',
        subjects: [
          subj('trabajo-final', 'Trabajo Final de Carrera'),
          subj('gestion-de-proyectos', 'Gestión de Proyectos'),
          subj('etica-y-deontologia', 'Ética y Deontología Profesional'),
          subj('optativa-cloud', 'Optativa · Computación en la Nube'),
        ],
      },
    ],
  };

  // eventos por subject.slug
  const eventos = {
    'bases-de-datos': [
      { id: 'e1', titulo: 'Primer parcial', fecha: '2026-05-23T18:00:00', tipo: 'Examen' },
      { id: 'e2', titulo: 'Entrega TP Diagrama ER', fecha: '2026-05-30T23:59:00', tipo: 'Trabajo Práctico' },
      { id: 'e3', titulo: 'Exposición grupo 4', fecha: '2026-06-06T20:00:00', tipo: 'Exposición' },
      { id: 'e4', titulo: 'Recuperatorio', fecha: '2026-06-20T18:00:00', tipo: 'Examen' },
    ],
    'programacion-orientada-a-objetos': [
      { id: 'e5', titulo: 'TP Patrones de diseño', fecha: '2026-05-22T23:59:00', tipo: 'Trabajo Práctico' },
      { id: 'e6', titulo: 'Parcial práctico', fecha: '2026-06-04T19:00:00', tipo: 'Examen' },
    ],
    'paradigmas-y-lenguajes': [
      { id: 'e7', titulo: 'Entrega Haskell', fecha: '2026-05-26T23:59:00', tipo: 'Trabajo Práctico' },
      { id: 'e8', titulo: 'Coloquio Prolog', fecha: '2026-06-12T19:30:00', tipo: 'Exposición' },
    ],
    'analisis-matematico-2': [
      { id: 'e9', titulo: 'Parcial integral', fecha: '2026-05-28T18:30:00', tipo: 'Examen' },
    ],
    'probabilidad-y-estadistica': [
      { id: 'e10', titulo: 'TP Distribuciones', fecha: '2026-06-02T23:59:00', tipo: 'Trabajo Práctico' },
    ],
  };

  // apuntes por subject.slug
  const apuntes = {
    'bases-de-datos': [
      { id: 'a1', titulo: 'Apunte teórico — Normalización', hasPdf: true, descripcion: 'Resumen de 1FN, 2FN, 3FN con ejemplos y ejercicios.' },
      { id: 'a2', titulo: 'Cheatsheet SQL', hasPdf: true, descripcion: 'JOINs, agregaciones, subconsultas y window functions.' },
      { id: 'a3', titulo: 'Carpeta Drive — Clases grabadas', hasPdf: false, descripcion: 'Acceso a todas las clases del 1er cuatrimestre.' },
    ],
    'programacion-orientada-a-objetos': [
      { id: 'a4', titulo: 'Patrones de diseño — GoF', hasPdf: true, descripcion: '23 patrones explicados con código en Java y Kotlin.' },
    ],
    'paradigmas-y-lenguajes': [
      { id: 'a5', titulo: 'Funcional 101', hasPdf: true, descripcion: 'Inmutabilidad, currying, fold/map/filter.' },
    ],
  };

  // attach events + apuntes to subjects
  career.years.forEach((y) => {
    y.subjects.forEach((s) => {
      s.eventos = eventos[s.slug] ?? [];
      s.apuntes = apuntes[s.slug] ?? [];
    });
  });

  // year color palette — replica de yearColors.ts
  const YEAR_COLORS = [
    { name: 'amber',   gradient: 'linear-gradient(90deg, #fbbf24 0%, #f97316 100%)', tone: '#fbbf24', chip: 'rgba(251,191,36,0.10)', chipBorder: 'rgba(251,191,36,0.30)', chipText: '#fcd34d' },
    { name: 'emerald', gradient: 'linear-gradient(90deg, #34d399 0%, #14b8a6 100%)', tone: '#34d399', chip: 'rgba(52,211,153,0.10)', chipBorder: 'rgba(52,211,153,0.30)', chipText: '#6ee7b7' },
    { name: 'violet',  gradient: 'linear-gradient(90deg, #a78bfa 0%, #a855f7 100%)', tone: '#a78bfa', chip: 'rgba(167,139,250,0.10)', chipBorder: 'rgba(167,139,250,0.30)', chipText: '#c4b5fd' },
    { name: 'rose',    gradient: 'linear-gradient(90deg, #fb7185 0%, #ec4899 100%)', tone: '#fb7185', chip: 'rgba(251,113,133,0.10)', chipBorder: 'rgba(251,113,133,0.30)', chipText: '#fda4af' },
    { name: 'cyan',    gradient: 'linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)', tone: '#22d3ee', chip: 'rgba(34,211,238,0.10)', chipBorder: 'rgba(34,211,238,0.30)', chipText: '#67e8f9' },
  ];

  const getYearColors = (idx) => YEAR_COLORS[idx % YEAR_COLORS.length];

  // tipo de evento → tono
  const EVENT_TONES = {
    'Examen':            { bg: 'rgba(239,68,68,0.16)',  border: 'rgba(239,68,68,0.36)',  text: '#fecaca' },
    'Trabajo Práctico':  { bg: 'rgba(251,191,36,0.16)', border: 'rgba(251,191,36,0.36)', text: '#fde68a' },
    'Exposición':        { bg: 'rgba(167,139,250,0.16)',border: 'rgba(167,139,250,0.36)',text: '#ddd6fe' },
    'Aviso':             { bg: 'rgba(255,255,255,0.08)',border: 'rgba(255,255,255,0.14)',text: '#fff' },
  };

  return { career, getYearColors, EVENT_TONES, YEAR_COLORS };
})();
