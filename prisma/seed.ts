import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client/client'
import { yearSlugFromNumber } from '../src/lib/slug'

// Seed usa conexión directa (DIRECT_URL): corre en CLI, no en serverless.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Falta DIRECT_URL (o DATABASE_URL) para correr el seed')
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Currículum fijo (portado de la SPA: Lic. en Sistemas, FCYT · UADER).
const CAREER = {
  slug: 'sistemas-uader-fcyt',
  nombre: 'Licenciatura en Sistemas de Información',
  descripcion: 'FCYT · UADER',
}

const YEAR_NAMES = [
  'Primer año',
  'Segundo año',
  'Tercer año',
  'Cuarto año',
  'Quinto año',
]

const SUBJECTS_BY_YEAR: string[][] = [
  ['Sistemas y Organizaciones', 'Fundamentos de Programación', 'Cálculo Diferencial e Integral', 'Lógica y Álgebra', 'Lecto-Comprensión en Inglés', 'Derechos Humanos y Tecnología', 'Fundamentos de Computación'],
  ['Ingeniería de Software I', 'Algoritmos y Estructuras de Datos', 'Programación Orientada a Objetos', 'Matemática Discreta', 'Ecuaciones Diferenciales y Cálculo Multivariado', 'Arquitectura de Computadoras', 'Optativa I'],
  ['Ingeniería de Software II', 'Bases de Datos', 'Sistemas Operativos', 'Probabilidad y Estadística', 'Paradigmas y Lenguajes', 'Ética Profesional', 'Programación Avanzada', 'Optativa II', 'Taller de Integración'],
  ['Inteligencia Artificial', 'Bases de Datos Avanzadas', 'Comunicaciones y Redes', 'Metodología de la Investigación', 'Investigación Operativa', 'Optativa III', 'Computación Avanzada', 'Optativa IV'],
  ['Seguridad y Auditoría', 'Administración de Recursos', 'Teoría de Computabilidad', 'Tesina de Grado', 'Interfaz Hombre Máquina', 'Optativa V'],
]

const CATEGORIAS_APUNTE = [
  'Otro',
  'Documento',
  'Herramienta',
  'Cuestionario',
  'Video',
  'Imágenes',
  'Pizarra',
  'Interactivo',
]

const TIPOS_EVENTO = [
  { slug: 'examen', nombre: 'Examen' },
  { slug: 'trabajo-practico', nombre: 'Trabajo Práctico' },
  { slug: 'exposicion', nombre: 'Exposición' },
]

const DEFAULT_COMMISSION = {
  slug: 'comision-1',
  nombre: 'Comisión 1',
}

type SeedPeriodoAcademico = {
  categoriaId: string
  titulo: string
  fechaInicio: string
  fechaFin: string
}

// Calendario académico FCyT · UADER 2026-2027.
// Fuente: https://fcyt.uader.edu.ar/secretaria-academica/calendario-academico/
const PERIODOS_ACADEMICOS_FCYT: SeedPeriodoAcademico[] = [
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
    fechaInicio: '2026-04-02',
    fechaFin: '2026-04-02',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Viernes Santo',
    fechaInicio: '2026-04-03',
    fechaFin: '2026-04-03',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Día del Trabajador',
    fechaInicio: '2026-05-01',
    fechaFin: '2026-05-01',
  },
  {
    categoriaId: 'MESAS_EXAMEN',
    titulo: 'Mesas de exámenes turno Mayo',
    fechaInicio: '2026-05-04',
    fechaFin: '2026-05-09',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Día de la Revolución de Mayo',
    fechaInicio: '2026-05-25',
    fechaFin: '2026-05-25',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Paso a la inmortalidad del Gral. Martín Miguel de Güemes',
    fechaInicio: '2026-06-17',
    fechaFin: '2026-06-17',
  },
  {
    categoriaId: 'MESAS_EXAMEN',
    titulo: 'Mesas de exámenes primer llamado turno Julio/Agosto',
    fechaInicio: '2026-06-29',
    fechaFin: '2026-07-04',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Receso académico de invierno',
    fechaInicio: '2026-07-06',
    fechaFin: '2026-07-17',
  },
  {
    categoriaId: 'MESAS_EXAMEN',
    titulo: 'Mesas de exámenes segundo llamado turno Julio/Agosto',
    fechaInicio: '2026-07-27',
    fechaFin: '2026-08-01',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Paso a la Inmortalidad del Gral. José de San Martín',
    fechaInicio: '2026-08-17',
    fechaFin: '2026-08-17',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Día del Docente',
    fechaInicio: '2026-09-11',
    fechaFin: '2026-09-11',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Día del estudiante',
    fechaInicio: '2026-09-21',
    fechaFin: '2026-09-21',
  },
  {
    categoriaId: 'MESAS_EXAMEN',
    titulo: 'Mesas de exámenes turno Septiembre',
    fechaInicio: '2026-09-22',
    fechaFin: '2026-09-26',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Conmemoración San Miguel Arcángel, Patrono de Entre Ríos',
    fechaInicio: '2026-09-29',
    fechaFin: '2026-09-29',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Día del Respeto a la Diversidad Cultural',
    fechaInicio: '2026-10-12',
    fechaFin: '2026-10-12',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Día de la Soberanía Nacional',
    fechaInicio: '2026-11-20',
    fechaFin: '2026-11-20',
  },
  {
    categoriaId: 'MESAS_EXAMEN',
    titulo: 'Mesas de exámenes primer llamado turno Noviembre/Diciembre',
    fechaInicio: '2026-11-24',
    fechaFin: '2026-11-30',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Conmemoración Inmaculada Concepción de María',
    fechaInicio: '2026-12-08',
    fechaFin: '2026-12-08',
  },
  {
    categoriaId: 'MESAS_EXAMEN',
    titulo: 'Mesas de examen segundo llamado turno Noviembre/Diciembre',
    fechaInicio: '2026-12-09',
    fechaFin: '2026-12-15',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Feriado de carnaval',
    fechaInicio: '2027-02-08',
    fechaFin: '2027-02-09',
  },
  {
    categoriaId: 'MESAS_EXAMEN',
    titulo: 'Mesas de exámenes primer llamado turno Febrero/Marzo',
    fechaInicio: '2027-02-10',
    fechaFin: '2027-02-16',
  },
  {
    categoriaId: 'MESAS_EXAMEN',
    titulo: 'Mesas de exámenes segundo llamado turno Febrero/Marzo',
    fechaInicio: '2027-03-01',
    fechaFin: '2027-03-06',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Día Nacional de la Memoria por la Verdad y la Justicia',
    fechaInicio: '2027-03-24',
    fechaFin: '2027-03-24',
  },
  {
    categoriaId: 'SUSPENSION_CLASES',
    titulo: 'Viernes Santo',
    fechaInicio: '2027-03-26',
    fechaFin: '2027-03-26',
  },
]

function dateOnly(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`)
}

async function seedPeriodosAcademicos(): Promise<void> {
  const categorias = [
    { id: 'SUSPENSION_CLASES', label: 'Suspensión de clases', tone: 'sky' },
    { id: 'MESAS_EXAMEN', label: 'Mesas de examen', tone: 'yellow' },
  ]

  for (const cat of categorias) {
    await prisma.categoriaPeriodo.upsert({
      where: { id: cat.id },
      update: { label: cat.label, tone: cat.tone },
      create: cat,
    })
  }

  for (const periodo of PERIODOS_ACADEMICOS_FCYT) {
    const data = {
      categoriaId: periodo.categoriaId,
      titulo: periodo.titulo,
      fechaInicio: dateOnly(periodo.fechaInicio),
      fechaFin: dateOnly(periodo.fechaFin),
    }

    const existing = await prisma.periodoAcademico.findFirst({
      where: {
        categoriaId: periodo.categoriaId,
        titulo: periodo.titulo,
        fechaInicio: data.fechaInicio,
      },
      select: { id: true },
    })

    if (existing) {
      await prisma.periodoAcademico.update({
        where: { id: existing.id },
        data,
      })
      continue
    }

    await prisma.periodoAcademico.create({ data })
  }
}

async function main(): Promise<void> {
  for (const nombre of CATEGORIAS_APUNTE) {
    await prisma.categoria.upsert({
      where: { nombre },
      update: { nombre },
      create: { nombre },
    })
  }

  for (const tipo of TIPOS_EVENTO) {
    await prisma.tipoEvento.upsert({
      where: { slug: tipo.slug },
      update: { nombre: tipo.nombre },
      create: tipo,
    })
  }

  const career = await prisma.career.upsert({
    where: { slug: CAREER.slug },
    update: { nombre: CAREER.nombre, descripcion: CAREER.descripcion },
    create: CAREER,
  })

  for (let i = 0; i < YEAR_NAMES.length; i++) {
    const yearSlug = yearSlugFromNumber(i + 1)
    const year = await prisma.academicYear.upsert({
      where: { slug: yearSlug },
      update: { nombre: YEAR_NAMES[i], orden: i + 1 },
      create: {
        careerId: career.id,
        slug: yearSlug,
        nombre: YEAR_NAMES[i],
        orden: i + 1,
      },
    })

    for (const subjectName of SUBJECTS_BY_YEAR[i]) {
      const subjectSlug = slugify(subjectName)
      let subject = await prisma.subject.findUnique({
        where: { slug: subjectSlug },
        select: { id: true },
      })
      const isNewSubject = !subject

      if (subject) {
        subject = await prisma.subject.update({
          where: { id: subject.id },
          data: { yearId: year.id, nombre: subjectName },
          select: { id: true },
        })
      } else {
        subject = await prisma.subject.create({
          data: { yearId: year.id, slug: subjectSlug, nombre: subjectName },
          select: { id: true },
        })
      }

      const generalAgenda = await prisma.agenda.findFirst({
        where: { subjectId: subject.id, commissionId: null },
        select: { id: true },
      })
      if (!generalAgenda) {
        await prisma.agenda.create({ data: { subjectId: subject.id } })
      }

      if (isNewSubject) {
        const commission = await prisma.commission.create({
          data: {
            subjectId: subject.id,
            slug: DEFAULT_COMMISSION.slug,
            nombre: DEFAULT_COMMISSION.nombre,
          },
        })

        await prisma.agenda.create({
          data: {
            subjectId: subject.id,
            commissionId: commission.id,
          },
        })
        continue
      }

      const commission = await prisma.commission.findFirst({
        where: { subjectId: subject.id },
        orderBy: [{ createdAt: 'asc' }, { slug: 'asc' }],
        select: { id: true },
      })
      if (commission) {
        const specificAgenda = await prisma.agenda.findUnique({
          where: { commissionId: commission.id },
          select: { id: true },
        })
        if (!specificAgenda) {
          await prisma.agenda.create({
            data: {
              subjectId: subject.id,
              commissionId: commission.id,
            },
          })
        }
      }
    }
  }

  await seedPeriodosAcademicos()

  console.log('Seed completo: carrera, años, materias, comisiones, agendas, períodos, tipos de evento y categorías de apuntes.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
