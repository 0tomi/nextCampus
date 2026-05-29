<div align="center">

# nextCampus

**Un campus estudiantil hecho por estudiantes, para estudiantes.**

Porque el campus que nos da la facultad no alcanza.

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

🌐 **[Accedé al sitio →]()**  <!-- reemplazá con la URL cuando esté disponible -->

</div>

---

## ¿De qué se trata?

nextCampus nació de una frustración compartida: el campus virtual que nos provee la facultad no cubre las necesidades reales del día a día como estudiante. Falta organización, faltan herramientas de estudio, falta algo hecho con intención.

Este proyecto es nuestra respuesta. Un campus alternativo construido desde cero por estudiantes, pensado para estudiantes. Es **público, abierto y colaborativo** — cualquiera puede usarlo, y cualquiera puede contribuir.

## ¿Qué tiene?

### 📅 Calendario por materia
Cada materia tiene su propia agenda con eventos categorizados por tipo: exámenes, trabajos prácticos, exposiciones. Los eventos soportan descripciones enriquecidas con hipervínculos y formato.

### 🧠 Quiz por materia
Sistema de evaluación organizado por unidades temáticas. Soporta múltiple opción, verdadero/falso y respuesta corta. Cada pregunta incluye su explicación. Diseñado para que el alumno pueda elegir cómo evaluarse: por unidad, por tiempo, o en modo práctica con feedback inmediato.

### 📚 Apuntes
Repositorio de material de estudio por materia. Soporta PDFs (almacenados en Supabase Storage) y entradas descriptivas con enlaces a Drive, Docs, o cualquier recurso externo.

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript estricto — `any` es error de lint |
| Frontend | React 19 + Tailwind CSS 4 |
| ORM | Prisma 7 con driver adapter (`@prisma/adapter-pg`) |
| Base de datos | Supabase Postgres |
| Storage | Supabase Storage (bucket privado `apuntes`: PDFs y bancos de quiz) |
| Auth | Supabase Auth — solo admins, sin registro público |
| Validación | Zod 4 |
| Package manager | pnpm |
| Deploy | Vercel |

## Contribuir

El proyecto es completamente abierto. Si encontrás algo que falta, algo que está mal, o simplemente querés agregar una feature que te haría la vida más fácil como estudiante — abrí un issue o mandá un PR.

No hay burocracia. Solo ganas de construir algo útil.

---

<div align="center">
  <sub>Hecho con frustración productiva por estudiantes de Licenciatura en Sistemas.</sub>
</div>
