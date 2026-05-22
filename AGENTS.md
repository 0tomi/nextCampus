### Context
Estas desarrollando una aplicacion de un campus academico, con Quiz, Calendario y Apuntes por materia. 
Tecnologias que utilizamos aca: 
- NextJS
- Prisma
- Supabase 
- PNPM Como gestor de dependencias

Para supabase, contas con el MCP instalado para comunicarte con la base de datos si lo necesitas.

### Coding rules
## Frontend rules
- Cuando el usuario haga preguntas técnicas o observaciones técnicas, estas no deben anotarse en el frontend. El frontend DEBE manejar un vocabulario user friendly NO técnico y no hacer referencias a la infrastructura del programa, ya sea del frontend como del backend. 
- Citas como estas en el frontend son intolerables: El calendario vive en un wrapper client-only y la página sigue siendo Server Component.
- Los botones deben tener cursor pointer clickeable

## Git Commit rules
- Cada vez que se termine de implementar un feature, bugfix, refactor o configuración, es obligatorio hacer un commit con los cambios.
- Los commits deben seguir estrictamente la especificación de **Conventional Commits** (ej: `feat(db): ...`, `fix(ui): ...`).
- **NUNCA** agregar "Co-Authored-By" ni ninguna atribución a IA en los mensajes de commit.

