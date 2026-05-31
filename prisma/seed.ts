import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client/client'
import { uniqueSlug, yearSlugFromNumber } from '../src/lib/slug'

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

  const takenSubjectSlugs = new Set<string>(
    (await prisma.subject.findMany({ select: { slug: true } })).map((s) => s.slug),
  )

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
      const base = slugify(subjectName)
      const subjectSlug = uniqueSlug(base, takenSubjectSlugs)
      takenSubjectSlugs.add(subjectSlug)
      const subject = await prisma.subject.upsert({
        where: { slug: subjectSlug },
        update: { nombre: subjectName },
        create: { yearId: year.id, slug: subjectSlug, nombre: subjectName },
      })

      const generalAgenda = await prisma.agenda.findFirst({
        where: { subjectId: subject.id, commissionId: null },
        select: { id: true },
      })
      if (!generalAgenda) {
        await prisma.agenda.create({ data: { subjectId: subject.id } })
      }

      let commission = await prisma.commission.findFirst({
        where: { subjectId: subject.id },
        orderBy: [{ createdAt: 'asc' }, { slug: 'asc' }],
      })
      if (!commission) {
        commission = await prisma.commission.create({
          data: {
            subjectId: subject.id,
            slug: DEFAULT_COMMISSION.slug,
            nombre: DEFAULT_COMMISSION.nombre,
          },
        })
      }

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

  console.log('Seed completo: carrera, años, materias, comisiones, agendas, tipos de evento y categorías de apuntes.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
