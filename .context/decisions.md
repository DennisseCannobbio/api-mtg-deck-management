# Architectural & Process Decisions

## D-001 — Documentation-grounded teaching
- **Date:** 2026-07-01
- **Decision:** Toda explicación, recomendación de arquitectura y ejemplo de código se fundamenta y cita documentación oficial (NestJS Docs, TypeScript Handbook, Docker Docs, etc.).
- **Why:** Evitar conocimiento desactualizado y dar al estudiante fuentes canónicas para profundizar.

## D-002 — Phase 1 syllabus approved
- **Date:** 2026-07-01
- **Decision:** Se aprueba el temario de Fase 1 (lecciones 1.1 a 1.5) como primera aproximación, con libertad de profundizar temas puntuales (p. ej. DI, custom providers) según surjan dudas.
- **Why:** Establecer un punto de partida claro y registrado sin cerrar la puerta a ajustes durante el aprendizaje.

## D-003 — Feature-branching workflow
- **Date:** 2026-07-01
- **Decision:** Cada funcionalidad se desarrolla en su propia rama. Convención de nombres: `feat/<slug>` (alineada con Conventional Commits). Las ramas nacen desde `dev` y se integran de vuelta hacia `dev` (flujo `dev → qa → main`). Primera rama del proyecto: `feat/nestjs-scaffolding`.
- **Why:** Mantener un desarrollo limpio, aislado y trazable, replicando prácticas profesionales de feature branching.

## D-004 — Environment: Node via NVM, NestJS CLI pending
- **Date:** 2026-07-01
- **Decision:** Node.js gestionado con NVM. El `@nestjs/cli` aún no está instalado; se instalará (previsiblemente global) teniendo en cuenta que los paquetes globales dependen de la versión de Node activa en NVM.
- **Why:** Documentar el estado del entorno y el riesgo conocido de globals + NVM al cambiar de versión de Node.
- **Update (2026-07-01):** Confirmado Node v24.18.0 y npm 11.16.0 (compatibles, ≥ 20 requerido por NestJS actual).

## D-005 — Version-control tutor config & context files
- **Date:** 2026-07-01
- **Decision:** `claude.md` y la carpeta `.context/` se versionan en Git y fluyen por todas las ramas (`dev → qa → main`), sin `.gitignore` ni divergencia por rama.
- **Why:** Portabilidad entre máquinas — al clonar el repo desde otro computador se dispone tanto de las reglas del tutor como del estado de aprendizaje. Además evita fricción/conflictos en cada merge, respetando el principio de que las ramas convergen.

## D-006 — Pull Request workflow (no direct pushes to shared branches)
- **Date:** 2026-07-01
- **Decision:** Ningún commit va directo a `dev`/`qa`/`main`. Todo cambio entra vía Pull Request desde una rama de trabajo. Los PRs se abren manualmente desde la web de GitHub. Se prefieren PRs atómicos (una sola historia por PR). Remoto: `origin` → github.com/DennisseCannobbio/api-mtg-deck-management.
- **Why:** Replicar el estándar profesional de revisión por PR; PRs pequeños y enfocados son más fáciles de revisar y dan un historial legible.
- **Immediate plan:** PR #1 `docs/project-context → dev` (claude.md + .context/). PR #2 `feat/nestjs-scaffolding → dev` (proyecto NestJS), tras mergear el #1.
