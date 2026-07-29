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

## D-007 — Editor config versionada (Format On Save)
- **Date:** 2026-07-22
- **Decision:** Se versiona `.vscode/settings.json` con `formatOnSave: true`, Prettier (`esbenp.prettier-vscode`) como formateador por defecto (global + por lenguaje TS/JSON) y `codeActionsOnSave: source.fixAll.eslint`. Prettier NO se desactiva; se activa el formateo automático al guardar.
- **Why:** El estudiante quería que Prettier formateara automáticamente al guardar. Versionar el archivo da la misma experiencia en cualquier máquina (portabilidad, coherente con D-005). Prettier estandariza el formato y limpia los diffs en PRs.
- **Nota:** El error que motivó la consulta (`ts(2564)`) NO era de Prettier sino del compilador TS (`strictPropertyInitialization`). Ver learning-notes.

## D-008 — Phase 2 syllabus approved
- **Date:** 2026-07-22
- **Decision:** Se aprueba el temario de Fase 2 (Clean Architecture, SOLID & Unit Testing), como primera aproximación (coherente con D-002), con libertad de profundizar sobre la marcha:
  - 2.1 Clean Architecture & la Dependency Rule (capas concéntricas, estructura de carpetas).
  - 2.2 Domain Layer: entidades ricas & Value Objects (Card de interface anémica → modelo con comportamiento/invariantes).
  - 2.3 SOLID a fondo (foco DIP/ISP): Repository Pattern como puerto `ICardsRepository` en dominio, impl en infraestructura (materializa el "token ≠ implementación" de 1.5).
  - 2.4 Application Layer: Use Cases (extraer casos de uso; `CardsService` NestJS pasa a adaptador delgado).
  - 2.5 Unit Testing con Jest (testear dominio + use cases SIN NestJS; AAA, mocks/stubs del repo; símil xUnit/Moq).
  - 2.6 Cierre: refactor integrado & cobertura (`test:cov`, dominio con alta cobertura y cero deps de framework).
- **Why:** Dar un mapa claro y trazable de la fase, replicando el proceso de la Fase 1.
- **Alcance / fuera de alcance:** La validación runtime (class-validator/ValidationPipe), Pipes, y el 404 vía `NotFoundException` siguen siendo **Fase 3** (deuda técnica ya anotada en state.md). Fase 2 = estructura + testeo, no I/O ni validación HTTP.

## D-009 — Estructura de carpetas Clean Architecture (por capa)
- **Date:** 2026-07-22
- **Decision:** Se adopta agrupación **por capa** para `src/`: `domain/` (entities, enums, repositories/=puertos), `application/` (dto, use-cases), `infrastructure/` (http/=controller+module, persistence/=impl del repo). La interfaz del repositorio (`ICardsRepository`) vive en `domain/repositories/`; su implementación (`InMemoryCardsRepository`) en `infrastructure/persistence/`.
- **Why:** Cercanía a la mentalidad .NET del estudiante (carpeta por tipo de componente) manteniendo la Dependency Rule. Se evaluó agrupar por feature (`cards/{domain,application,infrastructure}`) y se pospone la decisión a cuando aparezca `Decks`.
- **Fundamentación (D-001):** Los 4 anillos + la Dependency Rule son del libro de R. C. Martin, *Clean Architecture* (2017), cap. 22 "The Clean Architecture" y blog "The Clean Architecture" (cleancoder.com, 2012). Los **nombres** de carpeta (`domain/application/infrastructure`) son convención de la comunidad, NO prescripción textual del libro (Martin: "Only Four Circles? No... the circles are schematic"). Una lectura estricta ("Screaming Architecture", cap. 21) favorecería ligeramente agrupar por feature; se eligió por-capa por pragmatismo. **Subir la interfaz del repo al dominio SÍ es canónico del libro** (Dependency Inversion aplicado a los boundaries, cap. 22): el contrato lo posee quien lo consume (interior), la impl (DB/EF/array) es un detalle del anillo externo. Que en .NET la `IRepository` viva en `Infrastructure/` es desviación pragmática común, no Clean Arch estricta.
- **Nota de transparencia:** las citas textuales del libro se dieron de memoria (fieles al sentido); verificar redacción/página exacta en la edición antes de citarlas formalmente.
- **⚠️ SUPERSEDED (2026-07-24) por D-012:** La agrupación **por capa** de esta decisión fue REEMPLAZADA por agrupación **por feature**. Se conserva D-009 completa para trazar la evolución del razonamiento (no se borra). Ver D-012 para el porqué del cambio.

## D-010 — Adopción de TDD (a mitad de Fase 2)
- **Date:** 2026-07-22
- **Decision:** Se adopta **TDD (Test-Driven Development)** con ciclo **Red → Green → Refactor** para todo comportamiento NUEVO de dominio/aplicación de aquí en adelante (test que falla primero → código mínimo → refactor en verde). Referencia: Kent Beck, *Test-Driven Development: By Example* (2002).
- **Rampa de aprendizaje:** Para código escrito ANTES de adoptar TDD (la entidad `Card`, ya hecha) se escriben **tests-after** (cobertura retroactiva) para (a) aprender la herramienta Jest sin la carga extra de TDD+diseño simultáneos, y (b) tener red de seguridad. TDD puro se aplica al PRÓXIMO comportamiento nuevo (candidatos: reglas de Deck, o un método nuevo de Card).
- **Why:** El estudiante lo propuso al llegar a la fase de testing; es una habilidad profesional de primer nivel y el dominio puro (sin deps/mocks/framework) es el escenario ideal para aprenderlo. Los tests de dominio deben ser framework-free (sin NestJS) = prueba de fuego de la Dependency Rule.
- **Impacto:** Se añadió sección "Testing Methodology: TDD" al `CLAUDE.md`.

## D-011 — Path aliases sincronizados (tsconfig + Jest) e imports
- **Date:** 2026-07-23
- **Decision:** Se adoptan **path aliases** con fuente de verdad ÚNICA en `tsconfig.json → paths`: `@domain/*` → `src/domain/*`, `@enums/*` → `src/enums/*`. Jest los hereda automáticamente vía `pathsToModuleNameMapper` (de `ts-jest`) en un nuevo `jest.config.ts` (se movió la config Jest inline desde `package.json` a este archivo `.ts` para poder ejecutar el helper). Para carpetas sin alias aún (`models/`, que se eliminará) se usan imports **relativos**. Se prohíben imports absolutos `src/...` (Jest no los resuelve; solo NestJS por `baseUrl`).
- **Why:** Evitar "path hell" (`../../../`) y el problema de doble config (NestJS y Jest son resolvedores distintos). Con fuente única, al añadir un alias solo se toca `tsconfig`. Se eligió `jest.config.ts` (opción 2b) sobre mapper manual porque las próximas migraciones Clean Arch traerán más aliases. Aliases definidos solo para carpetas existentes (YAGNI: no se crean `@application`/`@infrastructure` hasta tener contenido).
- **Detalle técnico:** el `jest.config.ts` lee `tsconfig.json` con `readFileSync`+`JSON.parse` (NO `import ... from './tsconfig.json'`, que con `module: nodenext` exige `import attribute` frágil). Se añadió `types: ["node", "jest"]` al tsconfig para que el editor reconozca los globales de Jest (`describe`/`it`/`expect`) — trade-off: desactiva la auto-inclusión de otros `@types/*`.
- **Limpieza asociada:** se borraron los `.spec.ts` autogenerados por el CLI (`cards.controller.spec`, `cards.service.spec`, `app.controller.spec`) — esqueletos vacíos (`should be defined`) sobre código de Fase 1 que se migrará. `cards.controller.spec` además fallaba por DI incompleta (no registraba `CardsService`). YAGNI: se reescribirán en la migración Clean Arch. Queda solo `card.spec.ts` (10 tests con valor real).
- **Update (2026-07-24, D-012):** Al migrar a estructura por feature, los aliases `@domain/@enums/@infrastructure` (por capa) se reemplazaron por un único `@cards/*` → `src/cards/*`. El mecanismo de sincronización (jest.config.ts + pathsToModuleNameMapper) NO cambió y funcionó sin tocarlo (los 10 tests pasaron tras la migración solo actualizando tsconfig → validó el diseño de D-011).

## D-012 — Cambio a estructura por FEATURE (supersede la parte "por capa" de D-009)
- **Date:** 2026-07-24
- **Decision:** Se REEMPLAZA la agrupación por capa (D-009) por agrupación **por feature (Vertical Slice)**: `src/cards/{domain,application,infrastructure}/`. Cada feature contiene sus 3 capas internas. Alias único por feature: `@cards/*` → `src/cards/*` (imports tipo `@cards/domain/entities/card`).
- **Estructura resultante:** `src/cards/domain/{entities,enums,repositories}`, `src/cards/application/dto`, `src/cards/infrastructure/{http,persistence}`.
- **Why (evolución del razonamiento):** D-009 eligió por-capa por cercanía a la mentalidad .NET del estudiante (carpeta por tipo). Al entender ambas opciones a fondo, el estudiante notó que por-feature es más ordenada y pidió cambiar. Se decidió migrar AHORA porque: (1) con 1 sola feature (~13 archivos) el costo es mínimo; (2) Deck está confirmado en el roadmap → no es especulación (no viola YAGNI); (3) es la opción que "grita" el dominio (Screaming Architecture, Martin cap. 21 — la lectura estricta del libro que D-009 ya reconocía que favorecía feature); (4) escala mejor a muchas features. En .NET esto se llama **Vertical Slice Architecture** (Jimmy Bogard). El estudiante reconoció que eligió por-capa originalmente "por el símil con .NET" sin conocer la alternativa.
- **Migración:** hecha con `git mv` (preserva historial). Migración PURA (solo mover + ajustar imports, sin cambio de comportamiento). Verificada: build OK + 10 tests verdes. El `CardsService` y `card.interface.ts` viejos se movieron igual (aún usados por el controller) y se ELIMINARÁN en 2.4 al reemplazarlos por use cases + la entidad rica.
- **Nota:** la Dependency Rule se mantiene idéntica — cambia el orden de anidamiento (feature/capa en vez de capa/feature), no las dependencias entre capas.
