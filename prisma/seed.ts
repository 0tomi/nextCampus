import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

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
  ['Ingeniería de Software I', 'Algoritmos y Estructuras de Datos', 'Programación Orientada a Objetos', 'Matemática Discreta', 'Ecuaciones Diferenciales y Cálculo Multivariado', 'Arquitectura de Computadoras'],
  ['Ingeniería de Software II', 'Bases de Datos', 'Sistemas Operativos', 'Probabilidad y Estadística', 'Paradigmas y Lenguajes', 'Ética Profesional', 'Programación Avanzada', 'Taller de Integración'],
  ['Inteligencia Artificial', 'Bases de Datos Avanzadas', 'Comunicaciones y Redes', 'Metodología de la Investigación', 'Investigación Operativa', 'Optativa 1', 'Computación Avanzada', 'Optativa 2'],
  ['Seguridad y Auditoria', 'Administración de Recursos', 'Teoría de Computabilidad', 'Tesina de Grado', 'Interfaz Hombre Máquina', 'Optativa 3'],
]

const TIPOS_EVENTO = [
  { slug: 'examen', nombre: 'Examen' },
  { slug: 'trabajo-practico', nombre: 'Trabajo Práctico' },
  { slug: 'exposicion', nombre: 'Exposición' },
]

async function main(): Promise<void> {
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
    const yearSlug = `${career.slug}-anio-${i + 1}`
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
      const subjectSlug = `${yearSlug}-${slugify(subjectName)}`
      const subject = await prisma.subject.upsert({
        where: { slug: subjectSlug },
        update: { nombre: subjectName },
        create: { yearId: year.id, slug: subjectSlug, nombre: subjectName },
      })
      // Cada materia tiene su agenda (1:1).
      await prisma.agenda.upsert({
        where: { subjectId: subject.id },
        update: {},
        create: { subjectId: subject.id },
      })
    }
  }

  console.log('Seed completo: carrera, años, materias, agendas y tipos de evento.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
