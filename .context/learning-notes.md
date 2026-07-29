# Learning Notes

Notas conceptuales de cada lección. Sirven para repasar y para no perder el "por qué" entre sesiones.

---

## Phase 1 · Lesson 1.1 — Bootstrapping y anatomía del proyecto

### Los 4 archivos del núcleo y su circuito

El scaffolding de NestJS genera un circuito completo Petición → Respuesta con 4 piezas:

1. **`main.ts` — punto de entrada**
   ```typescript
   async function bootstrap() {
     const app = await NestFactory.create(AppModule);
     await app.listen(process.env.PORT ?? 3000);
   }
   bootstrap();
   ```
   - `NestFactory.create(AppModule)`: fábrica que construye la app a partir del módulo raíz; instancia controladores, resuelve providers y monta el contenedor de DI. Es `async` porque la init puede ser asíncrona.
   - `app.listen(3000)`: levanta el servidor HTTP (Express por defecto).
   - `process.env.PORT ?? 3000`: usa la env var `PORT` si existe; si no, cae a 3000 (`??` = nullish coalescing).
   - **Símil .NET:** `main.ts` + `bootstrap()` ≈ `Program.cs` con `WebApplication.CreateBuilder()` + `app.Run()`. `NestFactory` ≈ host builder.

2. **`app.module.ts` — módulo raíz**
   ```typescript
   @Module({ imports: [], controllers: [AppController], providers: [AppService] })
   export class AppModule {}
   ```
   - `@Module` convierte una clase vacía en unidad organizativa.
   - `controllers`: manejadores HTTP del módulo. `providers`: servicios inyectables. `imports`/`exports`: conexión entre módulos (se profundiza en 1.2).

3. **`app.controller.ts` — recibe la petición**
   ```typescript
   @Controller()
   export class AppController {
     constructor(private readonly appService: AppService) {}
     @Get()
     getHello(): string { return this.appService.getHello(); }
   }
   ```
   - `@Controller()`: marca la clase como manejadora de rutas. `@Get()`: mapea GET a `getHello()`.
   - Línea clave: `constructor(private readonly appService: AppService)` → aquí ocurre la **Inyección de Dependencias**. Nunca se hace `new AppService()`; se declara la necesidad y NestJS entrega la instancia. `private readonly` en el parámetro es azúcar de TS que además lo declara como propiedad.
   - **Símil .NET:** idéntico a la constructor injection de ASP.NET Core.

4. **`app.service.ts` — la lógica**
   ```typescript
   @Injectable()
   export class AppService {
     getHello(): string { return 'Hello World!'; }
   }
   ```
   - `@Injectable()`: marca la clase como provider gestionable por el contenedor de DI (IoC).

### El circuito completo
```
GET "/" → main.ts levantó el server → AppModule registró controller+provider
        → AppController.getHello() atiende → llama this.appService.getHello() (inyectado)
        → AppService devuelve "Hello World!"
```

---

### Duda resuelta: ¿qué pasa si le quito `@Injectable()` a `AppService`?

**Hipótesis inicial (mía):** "lanza error porque no puede encontrar la dependencia."

**Matiz correcto:** el problema NO es que NestJS "no la encuentre" (sí está en `providers: [AppService]`). El problema es que **`@Injectable()` permite a NestJS leer los *metadatos de tipos* del constructor** para saber qué dependencias inyectar.

Mecanismo profundo:
- NestJS usa **reflexión de metadatos** (`reflect-metadata` + `emitDecoratorMetadata` del `tsconfig.json`).
- Un decorador sobre la clase hace que TypeScript **emita info de los tipos** de los parámetros del constructor.
- Sin decorador, en ciertos casos TS no emite esos metadatos y NestJS queda "ciego" a las dependencias.

Matiz fino: una clase sin dependencias en el constructor (como `AppService`) a veces *funciona* sin `@Injectable()`, pero es mala práctica peligrosa: fallará en cuanto necesite inyectar algo. Regla → **siempre** ponerlo.

Error típico cuando sí importa:
`Nest can't resolve dependencies of the X (?). Please make sure that the argument Y at index [0] is available...`

Modelo mental correcto:
| Sin `@Injectable()` | Consecuencia |
|---|---|
| Clase normal de TS | No es provider gestionable |
| Sin metadatos de tipos | NestJS no sabe qué inyectarle si tiene dependencias |
| Resultado | Falla al resolver deps ("no sabe cómo construirla", no "no la encuentra") |

---

### Duda resuelta: símil con .NET Core de `@Injectable()` + `providers`

**Registro de un servicio:**
- `.NET`: `builder.Services.AddScoped<AppService>()` (centralizado en `Program.cs`).
- `NestJS`: `providers: [AppService]` en `@Module` **+** `@Injectable()` en la clase (distribuido).

**Error análogo al no registrar/injectar mal:**
- `.NET`: `Unable to resolve service for type 'AppService' while attempting to activate 'AppController'`
- `NestJS`: `Nest can't resolve dependencies of the AppController (?)...`

**Mapeo:**
| Concepto | .NET Core | NestJS |
|---|---|---|
| "Clase participa en DI" | `AddScoped<AppService>()` | `providers: [AppService]` + `@Injectable()` |
| Dónde se declara | Centralizado en el contenedor | Distribuido (módulo lista, decorador habilita) |
| Scope / lifetime | Explícito (Scoped/Singleton/Transient) | Implícito: **Singleton por defecto** |

**¿Por qué .NET no necesita un `@Injectable()`?**
- `.NET` tiene **reflexión nativa en runtime (CLR)**: puede inspeccionar los tipos del constructor sin ayuda extra. Basta registrar la clase.
- `TypeScript/JS` sufre **type erasure**: los tipos se borran al compilar (JS no tiene tipos en runtime). Por eso NestJS necesita el decorador para que TS **emita metadatos** que sobrevivan a la compilación.

Resumen: **.NET "ve" los tipos del constructor gratis; NestJS necesita el decorador para que los tipos no se pierdan al compilar.**
```
.NET:    AddScoped<AppService>()   → registro + el CLR lee tipos solo
NestJS:  providers:[AppService]     → registro (el "qué")
       + @Injectable()              → habilita leer tipos (el "cómo", que .NET tiene gratis)
```

---

### Referencias oficiales
- *NestJS Docs → First steps* (main.ts, NestFactory).
- *NestJS Docs → Providers* (@Injectable, contenedor IoC, resolución de dependencias).
- *TypeScript Handbook → Decorators → Metadata* (emitDecoratorMetadata).
- *Microsoft Docs → Dependency injection in .NET* (DI del CLR).

---

## Phase 1 · Lesson 1.2 — Módulos a fondo (@Module)

### Concepto central: encapsulación
Un módulo NO es solo una carpeta de organización: es una **frontera de encapsulación**.
- **Símil .NET:** módulo ≈ assembly/librería con tipos `internal` vs `public`. Lo que no exportas es como `internal`: existe pero nadie de afuera lo ve.

### Las 4 propiedades de @Module
```typescript
@Module({
  imports:     [],  // otros módulos cuyos exports quiero usar aquí
  controllers: [],  // los que instancia y expone ESTE módulo
  providers:   [],  // servicios inyectables, PRIVADOS a este módulo por defecto
  exports:     [],  // qué de mis providers hago visible a quien me importe
})
```
- `providers` son **privados por defecto**: solo inyectables dentro del propio módulo.
- `exports`: puerta de salida — para que otro módulo use un provider mío, debo exportarlo.
- `imports`: puerta de entrada — un módulo importa a otro para acceder a lo que ese otro exporta.

Modelo mental:
```
ModuloB:  providers:[ServicioB]  → existe pero PRIVADO
          exports:[ServicioB]    → ahora visible afuera
ModuloA:  imports:[ModuloB]      → ModuloA puede inyectar ServicioB
```
Error clásico si falta el export en B o el import en A:
`Nest can't resolve dependencies... Is it exported?`

### Trampa: `import` (TS) vs `imports:` (NestJS)
Son cosas DISTINTAS aunque se llamen parecido:
- `import { X } from '...'` → import de **TypeScript/ES Modules** (trae la clase al archivo). JS puro.
- `imports: [X]` dentro de `@Module` → propiedad de **NestJS** (registra el módulo en el árbol de dependencias).
Puedes tener una clase importada por TS que NO esté en el array `imports` de NestJS → NestJS no la conocería. El CLI hace ambas al generar; a mano hay que acordarse de las dos.

### Duda resuelta: ¿cómo sabe el CLI a qué módulo asociar un controller/provider generado?
**NO es por el nombre. Es por la UBICACIÓN en el árbol de carpetas.**
Al generar (`nest g controller cards`), el CLI:
1. Decide dónde crea el archivo (`src/cards/cards.controller.ts`).
2. Sube por el árbol de carpetas buscando el `*.module.ts` más cercano.
3. Encuentra `src/cards/cards.module.ts` → lo registra ahí (en `controllers: []`).

Prueba de que NO es el nombre: un `dragons.controller.ts` creado dentro de `src/cards/` se registraría en `CardsModule` aunque los nombres no coincidan. **Gana la carpeta, no el nombre.**
En este caso "coincidió" porque el nombre `cards` definió a la vez la carpeta y el nombre del archivo.

Corolario práctico (clave para Clean Architecture en Fase 2): **la organización de carpetas ES la organización de módulos.** La ubicación física tiene semántica real; no es cosmética.

### Encapsulación aplicada al generar
El CLI registró `CardsController` en `CardsModule` (NO en `AppModule`). El `AppModule` solo conoce el `CardsModule` completo vía `imports: [CardsModule]`; no sabe de sus controllers internos. Bajo acoplamiento correcto:
```
AppModule → imports:[CardsModule] → CardsModule → controllers:[CardsController]
```

### Comandos usados
- `nest generate module cards` (o `nest g mo cards`) → crea `cards.module.ts` + actualiza `AppModule` (imports).
- `nest generate controller cards` (o `nest g co cards`) → crea `cards.controller.ts` + `.spec.ts` (tests Jest, Fase 2) + actualiza `cards.module.ts` (controllers).

### Convención de nombres: PLURAL
Recursos REST se nombran en plural (`cards`) porque `@Controller('cards')` expone una **colección**:
`GET /cards` (lista), `GET /cards/:id` (elemento), `POST /cards` (crear). `nest g resource` genera todo en plural por defecto.
📚 *NestJS Docs → Controllers* (ejemplos con `cats` en plural); *Microsoft REST API Guidelines* (recursos en plural).

### Referencias oficiales (1.2)
- *NestJS Docs → Modules* (feature modules, encapsulación, imports/exports).
- *NestJS Docs → CLI → Usage* (generación de archivos, name como ruta, registro en módulo más cercano).
- *NestJS Docs → Controllers* (routing, convención plural).

---

## Phase 1 · Lesson 1.3 — Controladores (routing) + modelado de dominio Card

### Routing: la ruta se compone en dos niveles
```typescript
@Controller('cards')   // prefijo → todas las rutas empiezan con /cards
@Get()                 // → GET /cards
@Get(':id')            // → GET /cards/:id
```
Prefijo del `@Controller` + path del decorador de método se **concatenan**.
- **Símil .NET:** `[Route("cards")]` + `[HttpGet]` / `[HttpGet("{id}")]`.

### Decoradores de parámetros (inyectan partes de la request)
| Decorador | De dónde | Símil .NET |
|---|---|---|
| `@Param('id')` | segmento de ruta `/cards/42` | `[FromRoute]` |
| `@Query('color')` | query string `?color=blue` | `[FromQuery]` |
| `@Body()` | cuerpo del POST (JSON) | `[FromBody]` |

⚠️ Todo lo que viene de la URL llega como **string** (ej. id "42", no 42). Conversión/validación de tipos = **Pipes** (Fase 3).
Status por defecto: 200 (201 en `@Post`). Cambiar con `@HttpCode(n)`.
📚 *NestJS Docs → Controllers → Routing / Route parameters*.

### Dominio MTG: por qué Cards primero
Jerarquía: **Card** (unidad atómica: name, color, type, manaValue...) → **Deck** (colección de cartas + reglas: tamaño, máx copias, identidad de color). Se construye bottom-up: sin el concepto de Carta no se pueden validar las reglas de Mazo. Las reglas vivirán en el Domain Layer puro (Fase 2).

### Modelado de Card (decisiones tomadas)
- `color: CardColor[]` y `type: CardType[]` → **arrays**, porque en MTG hay cartas multicolor y multi-tipo ("Artifact Creature"). Fiel al dominio.
- `superType`, `rarity` → **únicos** (no array): decisión consciente por campo.
- `power?`/`toughness?` → **opcionales y string**: solo criaturas los tienen (opcional) y pueden ser variables como `*` (string, no number).
- `manaValue: number` → el **número total** (antes CMC). NO confundir con el *mana cost* detallado `{2}{R}{R}` (notación con símbolos), que se modelaría como objeto complejo → se pospone (evitar over-engineering).
- Enums separados, un archivo por enum, kebab-case + sufijo `.enum.ts` (convención NestJS): `card-color`, `card-type`, `card-rarity`, `card-super-type`.

### Duda resuelta: enum vs alternativas en TS
El `enum` es **correcto e idiomático** para DTOs con validación NestJS (`@IsEnum()` en Fase 3). Alternativas conocidas para cuando se quiera profundizar:
- **Union de literales** `type X = 'A' | 'B'`: cero código en runtime, muy TS, pero no iterable en runtime.
- **`as const` object**: iterable + tipo estricto, sin las rarezas del enum, pero más verboso.
- **Nota:** los `enum` de TS **generan código JS en runtime** (no son solo tipos); por eso algunos equipos los evitan. Para este proyecto se mantiene `enum` (natural viniendo de .NET, y encaja con NestJS/class-validator).
📚 *TypeScript Handbook → Enums*.

### Duda resuelta (CLAVE): ¿el DTO debe heredar de la entidad Card?
**NO heredar el DTO de la entidad.** DTO y Modelo/Entidad son conceptualmente distintos y tienen **razones distintas para cambiar**:
| | Entidad `Card` | `CreateCardDto` |
|---|---|---|
| Qué es | dominio/persistencia | contrato HTTP de entrada |
| Tiene `id`? | sí (existe en DB) | no (aún no existe al crear) |
| Cambia cuando | cambia el dominio/DB | cambia el contrato de la API |
Heredar acopla la capa API con la de dominio (anti-patrón sutil, mismo debate que "ViewModel hereda de Entity" en .NET → la respuesta canónica en Clean Architecture es NO).

Formas correctas de evitar duplicación (Fase 3):
- **DTO deriva de DTO** con utilidades NestJS: `PartialType`, `PickType`, `OmitType` (ej. `UpdateCardDto = PartialType(CreateCardDto)`). Esto SÍ es herencia bien hecha.
- **Mappers** explícitos `CreateCardDto → Card` (desacople total).
Regla: componer DTOs entre sí, no acoplar el DTO a la entidad.
📚 *NestJS Docs → OpenAPI → Mapped types*; *Techniques → Validation*.

### Referencias oficiales (1.3)
- *NestJS Docs → Controllers* (routing, param decorators, request object).
- *TypeScript Handbook → Optional Properties / Enums*.

### Experimento clave: el DTO NO valida en runtime (descubierto en Postman)
Se envió basura al `POST /cards` (`name` como número, `color` como string en vez de array, un `campoInventado` inexistente) → el servidor respondió **201 Created** y **devolvió la basura tal cual**. No rechazó nada.

**Por qué:** consecuencia directa del **type erasure** (ver 1.1). El `CreateCardDto` solo existe en tiempo de compilación; en runtime (JS) es un objeto cualquiera sin reglas. El tipo de TS es una **promesa de diseño, no una garantía de ejecución**.
```
@Body() dto: CreateCardDto
  → en TS: "debe tener forma de CreateCardDto"
  → en runtime: "es un objeto cualquiera" 🤷
```

**Solución (Fase 3):** `class-validator` + `class-transformer` + `ValidationPipe`.
Símil .NET exacto:
| C# (.NET) | NestJS |
|---|---|
| Data Annotations `[Required]`, `[Range]`... | decoradores `@IsString()`, `@IsInt()`, `@IsEnum()`... |
| model binding + `[ApiController]` | `ValidationPipe` (pipe global) |
| `400 Bad Request` automático | `400 Bad Request` automático |
Ejemplo: `@IsEnum(CardColor, { each: true })` valida cada elemento de un array. `whitelist: true` rechaza campos no declarados (el `campoInventado`).
Idea: sin validación el DTO es **documentación**; con validación es un **guardián**. Los decoradores compensan el type erasure inyectando metadatos en runtime.
📚 *NestJS Docs → Techniques → Validation*.

---

### El operador `!` en DTOs y el error `ts(2564)`
Al declarar un DTO con propiedades obligatorias (`name: string`), TS lanza:
> Property 'name' has no initializer and is not definitely assigned in the constructor. **ts(2564)**

**Origen:** NO es Prettier ni ESLint — es el **compilador de TS**, regla `strictPropertyInitialization` (incluida en `strict: true`). Exige que toda propiedad no-opcional se inicialice o se asigne en el constructor.

**Solución elegida:** el operador `!` (definite assignment assertion) → `name!: string;`.
- Es una **aserción compile-time**: "yo garantizo que se asignará". Silencia el error, no genera JS, desaparece al transpilar.
- Encaja en DTOs porque quien los rellena es **NestJS al deserializar el body**, no un `new` manual → TS no puede "ver" esa asignación.
- Las opcionales (`power?`, `toughness?`) NO necesitan `!`: el `?` ya las hace `T | undefined`.
- ⚠️ Es una promesa tuya, no una garantía del compilador. Seguro en DTOs; peligroso si mientes.
📚 *TypeScript Handbook → Definite Assignment Assertions* / *tsconfig → strictPropertyInitialization*.

### ¿Existe `[Required]` como en C#? — Dos capas
1. **TS puro (compile-time):** NO hay equivalente. Los tipos se borran (type erasure). `!` no valida, solo calla al compilador.
2. **NestJS runtime:** SÍ, vía `class-validator` (`@IsNotEmpty()` ≈ `[Required]`). Persiste en runtime con `reflect-metadata`, igual que los atributos de C# via reflection del CLR. Reservado para **Fase 3**.

---

## Phase 1 · Lesson 1.4 — Providers e Inyección de Dependencias (DI) + CRUD en memoria

### La DI en NestJS (símil .NET exacto)
El controller **declara** su dependencia por constructor; el contenedor IoC de Nest la **entrega**. Es la "D" de SOLID (Dependency Inversion). No `new CardsService()` (acoplamiento); Nest inyecta la instancia.
```typescript
constructor(private readonly cardsService: CardsService) {}
```
- **Parameter property**: `private readonly` en el parámetro declara + asigna `this.cardsService` automáticamente (TS lo regala; en C# asignas a mano). `readonly` = no reasignar la dependencia.
- Poner la clase en `providers: []` del módulo **ES** el registro (= `services.AddScoped<T>()` de .NET). No se toca el módulo si el CLI ya lo puso.
- Nest "lee" qué inyectar vía `reflect-metadata` (porque TS borra los tipos → por eso `@Injectable()` importa).

| .NET Core | NestJS |
|---|---|
| `services.AddScoped<CardsService>()` | clase en `providers: []` |
| inyección por constructor | idéntico |
| `IServiceProvider` | contenedor IoC de Nest |
| Transient / Scoped / Singleton | TRANSIENT / REQUEST / DEFAULT(singleton) |
📚 *NestJS Docs → Providers*.

### 🔑 Analogía CLAVE: ¿a qué capa corresponde el Service? (confusión resuelta hoy)
El estudiante pensaba en su stack .NET: `Controller => IHandler => Handler => IRepository => Repository`, donde el **Handler** recibe el DTO y el **Repository** el modelo de DB, y el mapeo cae en el Handler.
**En NestJS Fase 1 aún NO hay Repository.** `CardsService` hace hoy el papel del **Handler / capa de negocio** → por eso **recibe el DTO y hace el mapeo** (igual que en .NET). El `this.cards.push()` es un **Repository fingido**.
```
Controller ──DTO──> CardsService(=Handler) ──mapea──> Card ──push──> array(=Repo fingido)
```
**Fase 3:** se extrae `CardsRepository` (con interfaz `ICardsRepository` para inyectar = Repository Pattern, como el `IRepository` de .NET). El service dejará de tocar el array.

### DTO → Entity: el "mapper" manual
`create(dto: CreateCardDto): Card` construye la Entity añadiendo lo que el DTO NO trae (id, auditoría):
```typescript
const cardToCreate: Card = { id: randomUUID(), ...dto, createdAt: new Date(), createdBy: 'System' };
```
- El spread `...dto` copia los campos; se antepone `id` y campos de sistema → **razón concreta de que Entity ≠ DTO** (el cliente no manda id ni createdAt).
- TS **valida el mapeo gratis en compile-time**: si al literal le falta/sobra un campo de `Card`, marca rojo aquí. (En C# con AutoMapper no siempre tienes eso en compile-time.)
- `interface Card` (no class): contrato de forma puro, cero runtime. `class` se reserva para Fase 2 (métodos de dominio).

### Estado singleton (probado en Postman)
GET /cards devolvió las cartas creadas en POSTs previos → el array persiste entre requests porque el service es **singleton** (scope DEFAULT = `AddSingleton`). Misma instancia, mismo array vivo.

### Fixes / detalles de la lección
- `ts(2564)` (`strictPropertyInitialization`) en el DTO → operador `!` (ver notas arriba).
- `findOne`: `Array.find` devuelve `T | undefined` → el método DEBE tipar `Card | undefined` (TS obliga a decidir el caso "no encontrado"; futuro → 404).
- `import type { X }`: import solo-de-tipo, se borra al compilar (no genera require). Buena práctica coherente con type erasure.
- `randomUUID()` de `crypto` (¡con paréntesis!) genera el id.

---

## Phase 1 · Lesson 1.5 — Cierre e integración (Custom Providers, conceptual)

### Custom Providers: token ≠ implementación
`providers: [CardsService]` es azúcar de `{ provide: CardsService, useClass: CardsService }`. Un provider tiene dos partes:
- **`provide`** = el **token** (la llave con que se pide la dependencia).
- **`useClass` / `useValue` / `useFactory` / `useExisting`** = qué se entrega.

| Forma | Qué hace | Símil .NET | Cuándo |
|---|---|---|---|
| `useClass` | instancia una clase | `AddScoped<I,Impl>()` | normal |
| `useValue` | entrega valor/objeto ya hecho | registrar instancia/constante | config, mocks en test |
| `useFactory` | función que construye la dep (puede tener sus deps) | factory delegate | creación con lógica/async |
| `useExisting` | alias a otro provider | forwarding | renombrar algo ya registrado |

### 🔑 Por qué una interface NO puede ser token (el clic para quien viene de C#)
En TS las **interfaces se borran en runtime** (type erasure otra vez) → no hay nada que "señalar" al inyectar. En .NET inyectas `IRepository` porque la interfaz existe en runtime (CLR). En NestJS se usa un **token string/Symbol** + custom provider:
```typescript
export const CARDS_REPOSITORY = 'CARDS_REPOSITORY';
providers: [{ provide: CARDS_REPOSITORY, useClass: InMemoryCardsRepository }];
// inyección: @Inject(CARDS_REPOSITORY) porque el token no es una clase
constructor(@Inject(CARDS_REPOSITORY) private readonly repo: ICardsRepository) {}
```
Es exactamente el patrón `IRepository` de .NET, resuelto a la manera de TS. **Se implementa en Fase 3** (separación del repositorio). Hoy solo conceptual.
📚 *NestJS Docs → Fundamentals → Custom Providers*.

### Los 4 "clics" mentales de la Fase 1 (viniendo de C#/.NET)
1. **Type erasure** — los tipos se borran al compilar. De aquí sale todo: DTO no valida, `@Injectable` necesita reflect-metadata, interface no puede ser token.
2. **DI por convención** — clase en `providers: []` ES el registro (vs `AddScoped` explícito).
3. **Separación de capas** — Controller (HTTP) vs Service (negocio/Handler), mapeo DTO→Entity en la frontera.
4. **Token ≠ implementación** — base de testeabilidad y desacople (el `IRepository`, a la TS).

### FASE 1 COMPLETADA
Circuito montado con las manos: `main.ts → AppModule → CardsModule → CardsController → CardsService → array`. CRUD Cards funcional con DI, arquitectura por capas y modelo de dominio rico. Siguiente: **Fase 2 — Clean Architecture, SOLID & Unit Testing** (desacoplar dominio/casos de uso de NestJS + testear reglas sin framework).

---

## Phase 2 · Lesson 2.1 — Clean Architecture & la Dependency Rule

### El problema que resolvemos
Hoy `CardsService` hace 3 trabajos mezclados: mapeo DTO→Card (aplicación), reglas (dominio, aún vacío) y `push` al array (persistencia). Eso acopla el negocio al framework → no se puede testear una regla MTG sin instanciar NestJS, ni cambiar el array por DB sin tocar el negocio. Clean Architecture separa **lo que casi no cambia (reglas)** de **lo que cambia seguido (frameworks, DB, HTTP)**.

### Los 4 anillos concéntricos (de adentro hacia afuera)
```
Frameworks & Drivers   → NestJS, Express, DB real, Postman     (lo más volátil)
Interface Adapters     → Controllers, Repositories(impl), Mappers
Application (Use Cases)→ CreateCardUseCase, orquestación
Domain (Entities)      → Card rica, reglas MTG, ICardsRepository (puerto)  (el centro)
```

### 🔑 La Dependency Rule (regla de oro)
> Las dependencias del código fuente solo apuntan hacia ADENTRO. Nada de un círculo interior sabe nada de uno exterior.

En cristiano: **el dominio no conoce a nadie; todos conocen al dominio.** Test de fuego (se usa en 2.5): si `domain/` importa `@nestjs/*` o `../infrastructure/*` → alarma roja, violaste la regla. El dominio debe ser importable desde un test sin arrancar NestJS.

### El truco del repositorio: Ports & Adapters (= DIP)
El use case (interior) necesita guardar, pero la impl del repo (`push`/EF/DB) vive fuera. Guardar apuntando hacia afuera violaría la regla → se **invierte la dependencia**:
- **Port (puerto):** la interfaz `ICardsRepository`. Vive en el **dominio** (interior). "Necesito guardar cartas, no me importa quién."
- **Adapter (adaptador):** `InMemoryCardsRepository`. Vive en **infraestructura** (exterior). Sabe el *cómo* real.
```
UseCase ─▶ ICardsRepository          (interior → interior ✅)
InMemoryCardsRepository ─▶ ICardsRepository   (exterior → interior ✅, la implementa)
```
Nadie apunta hacia afuera. Regla mnemotécnica: **el que USA la dependencia define su contrato** → el use case define `ICardsRepository`, la infra solo lo cumple.

### 🔑 Símil .NET (validado por el estudiante)
En .NET el handler llama a la **interfaz** del repo, no a la impl; el repo usa EF Core por dentro. Eso ES el DIP. Único matiz de mentalidad: en muchos equipos .NET la `IRepository` vive en `Infrastructure/`; en Clean Arch **pura** el contrato sube al dominio/aplicación (lo posee quien lo consume). Ver D-009. La otra diferencia: en .NET la Dependency Rule la **fuerza el compilador** (`Domain.csproj` no referencia `Infrastructure.csproj`); en NestJS/TS es 1 solo proyecto → la regla la sostiene la disciplina + la estructura de carpetas (y quizá lint rules luego).

### Estructura de carpetas (por capa — D-009) ⚠️ CAMBIADA a por-feature en 2.4 (ver nota abajo)
```
src/                     ← ESTA estructura (por CAPA) fue REEMPLAZADA. Se conserva por trazabilidad.
├── domain/           TS puro, cero @nestjs/*
│   ├── entities/     card.ts (rica, [2.2])
│   ├── enums/        card-color/type/rarity/super-type (se mudan aquí)
│   └── repositories/ cards.repository.ts (ICardsRepository = PUERTO)  ⚠️ interfaz aquí
├── application/      conoce dominio, NO NestJS
│   ├── dto/          create-card.dto.ts (se muda)
│   └── use-cases/    create-card.use-case.ts, find-cards.use-case.ts [2.4]
├── infrastructure/   aquí SÍ vive NestJS y los detalles
│   ├── http/         cards.controller.ts (adapter delgado) + cards.module.ts (ensamblador DI)
│   └── persistence/  in-memory-cards.repository.ts (implements ICardsRepository)
├── app.module.ts
└── main.ts
```
Mapeo con el estándar .NET del estudiante: `Controllers/`→`infrastructure/http/`; `Handler/`(impl)→`application/use-cases/`; reglas puras→`domain/entities/`; `Infrastructure/Repo`→`infrastructure/persistence/`; `Infrastructure/IRepo`→`domain/repositories/` (⚠️ sube al centro). Solo 2 cosas "suben": reglas puras y la interfaz del repo.

### 🔄 ACTUALIZACIÓN (2026-07-24, durante 2.4): se cambió a estructura POR FEATURE (D-012)
La estructura por-capa de arriba se REEMPLAZÓ por **por-feature** (Vertical Slice). Ahora la primera división es la ENTIDAD, y dentro van las 3 capas:
```
src/
└── cards/                    ← FEATURE (todo lo de Card junto)
    ├── domain/
    │   ├── entities/         card.ts, card.spec.ts
    │   ├── enums/            los 4 enums
    │   └── repositories/     cards.repository.ts (puerto + token)
    ├── application/
    │   └── dto/              create-card.dto.ts   (+ use-cases/ en 2.4)
    └── infrastructure/
        ├── http/             cards.controller.ts, cards.module.ts
        └── persistence/      in-memory-cards.repository.ts
```
Es INVERTIR el anidamiento: por-capa = `capa/entidad`; por-feature = `entidad/capa`. Alias único `@cards/*` → `src/cards/*`.
**Por qué el cambio** (el estudiante lo pidió al entender ambas): por-feature "grita" el dominio (Screaming Arch), agrupa todo lo de una feature junto, escala mejor, y era lo que la lectura estricta del libro ya favorecía (D-009 lo reconocía). Se migró con 1 sola feature = costo mínimo. La **Dependency Rule NO cambia** (solo el orden de carpetas). Nombre en .NET: **Vertical Slice Architecture** (Jimmy Bogard). Lección meta: el estudiante eligió por-capa originalmente "por el símil .NET" sin conocer la alternativa → revisar decisiones al ampliar conocimiento es sano. Ver D-012.

### Qué es del libro vs convención (fundamentación D-001)
- **Del libro** (Martin, *Clean Architecture* 2017): los 4 anillos, la Dependency Rule, y subir la interfaz del repo al interior (DIP en los boundaries, cap. 22). También: "Only Four Circles? No... the circles are schematic" (los círculos pueden ser más).
- **Convención de comunidad** (NO textual del libro): los nombres `domain/application/infrastructure`. Una lectura estricta de "Screaming Architecture" (cap. 21) favorecería agrupar por feature (`cards/`); elegimos por-capa por pragmatismo (cercanía a .NET).
- ⚠️ Citas dadas de memoria (fieles al sentido); verificar redacción/página exacta antes de citarlas formalmente.

### Referencias oficiales (2.1)
- R. C. Martin, *Clean Architecture: A Craftsman's Guide...* (2017), caps. 21 "Screaming Architecture", 22 "The Clean Architecture", 23 "Presenters and Humble Objects".
- Blog canónico *"The Clean Architecture"*, blog.cleancoder.com (2012) — diagrama original de los anillos.
- *NestJS Docs → Fundamentals → Custom Providers* (el "cómo" técnico de inyectar la interfaz, se ve en 2.3).

---

## Phase 2 · Lesson 2.2 — Domain Layer: entidades ricas & Value Objects

### Anémico vs Rico
- **Modelo anémico** (lo que había): la entidad es solo datos (interface = bolsa de propiedades), la lógica vive en services. Fowler lo llama **anti-patrón** ("AnemicDomainModel", 2003): contradice la idea básica de OOP = combinar datos + comportamiento.
- **Modelo rico**: datos + comportamiento JUNTOS en la clase. La carta sabe cosas de sí misma (`card.isCreature()`).

### ¿Por qué rico aquí? (¿se puede anémico? SÍ) — la respuesta honesta
El anémico NO es ilegal: es la elección **correcta y madura** para CRUD simple sin reglas de dominio (meter rico ahí = over-engineering). Regla honesta: **el modelo rico se justifica cuando hay lógica de dominio que proteger.** Elegimos rico porque (1) MTG es un dominio genuinamente rico en reglas (color identity, límite de copias, tamaño de mazo, comandante = criatura legendaria) que se duplicarían entre services si fueran anémicas; (2) es proyecto de aprendizaje de Clean Arch/DDD y el CLAUDE.md pide Domain Layer puro con lógica. La crítica de Fowler no es "nunca uses anémico" sino "no lo llames DDD".
| Anémico cuando | Rico cuando |
|---|---|
| CRUD simple, lógica trivial (get/set), prototipo | reglas/invariantes que proteger, lógica que se duplicaría, dominio = corazón del valor |
📚 Fowler, "AnemicDomainModel" (martinfowler.com, 2003); Evans, *Domain-Driven Design* (2003) — Entities/Value Objects/invariantes.

### Conceptos clave
- **Invariante**: regla que SIEMPRE se cumple durante toda la vida del objeto, desde que nace. Ej. MTG: `manaValue >= 0`, `color` array no vacío. 🔑 La invariante jugosa NO es "que el campo exista" (eso lo da el tipo) sino "que tenga sentido" (`>= 0`, que el tipo `number` no protege).
- **Value Object** (visto ligero): objeto definido por su VALOR, sin identidad (`id`). Dos son iguales si sus valores son iguales. Candidatos MTG: mana cost `{2}{R}{R}`, rango power/toughness. Vs **Entity** (`Card`): tiene `id`, dos cartas iguales en datos pero distinto id son distintas. Hoy NO forzamos VOs (evitar over-engineering); solo si una regla los pide.

### Decisiones de modelado de dominio (Card)
- `color: CardColor[]` — el enum YA tiene `Colorless` (Opción B) → la invariante "array no vacío" SÍ aplica (incoloro = `[Colorless]`). Invariante derivada interesante (no implementada aún): si es `Colorless`, debe ser el ÚNICO elemento (no `[White, Colorless]`).
- `isLegendary()` = `superType === CardSuperType.Legendary` (Legendary es SUPERTYPE, no type). Útil para regla futura de Commander: comandante = `isLegendary() && isCreature()`. ← el valor del modelo rico: reglas de Deck se COMPONEN de comportamientos simples de la Card.

### interface → class (llegó el momento de 1.4)
Convertimos `Card` de `interface` a `class` porque: (1) interfaces no tienen métodos con implementación, solo firmas; (2) necesitamos constructor que valide invariantes; (3) class existe en runtime (dominio ejecutable).

### 📌 PENDIENTE DE PROFUNDIZAR (anotado para futura referencia — a petición del estudiante)
Términos para buscar sobre validación de invariantes en el constructor:
- **"Always-Valid Domain Model"** ← término estrella. Autor: **Vladimir Khorikov** (enterprisecraftsmanship.com; libro *Unit Testing Principles, Practices, and Patterns*). Idea: imposible crear instancia en estado inválido → toda `Card` que exista está garantizada válida (no revalidar "por si acaso").
- **"Guard Clauses"** — chequeos al inicio del constructor que lanzan si se viola una invariante. Van PRIMERO, la asignación DESPUÉS. Símil .NET: `if (x < 0) throw new ArgumentException(...)`, o helpers `ArgumentException.ThrowIfNegative(...)`.
- **"Fail Fast principle"** — falla en construcción, no más tarde.
- **"Factory Method pattern"** (constructor privado + `static create()`).
- **Debate a conocer:** `throw` en constructor vs **Result pattern** (devolver `Result<Card>` en vez de lanzar; Khorikov lo prefiere para errores esperables, reservando excepciones para bugs). **Decisión nuestra: empezar con `throw`** por simplicidad pedagógica + encaja con NestJS (mapea excepciones a HTTP). Result = posible sofisticación futura, hoy sería over-engineering.
- ⚠️ Dos capas de validación (defensa en profundidad, NO "una u otra"): **guard clauses de dominio** en la entidad (reglas de negocio, última línea de defensa, no se salta jamás) + **validación de DTO** (class-validator, Fase 3) en la frontera HTTP (buenos 400 al cliente).

### 🔑 Invariante (guard) vs Consulta (query) — la distinción clave de 2.2
La distinción más sutil de la lección. Regla de bolsillo:
> **¿La frase termina en "...o si no, ERROR"? → INVARIANTE (guard clause, LANZA `throw`).**
> **¿La frase es una pregunta que responde SÍ/NO? → CONSULTA (método, DEVUELVE boolean, NUNCA lanza).**

| Aspecto | Invariante (Guard Clause) | Consulta (Query method) |
|---|---|---|
| Qué es | regla que SIEMPRE debe cumplirse | pregunta sobre el estado del objeto |
| Dónde vive | DENTRO del constructor (antes de asignar) | método público `is.../has...` |
| Retorna / Lanza | `throw` (no retorna) | `return boolean` (nunca lanza) |
| Cuándo corre | automático en CADA `new` (imposible saltarlo) | cuando alguien la llama a propósito |
| Frase típica | "el mana no puede ser negativo, **o si no error**" | "**¿es** esta carta una criatura?" |

**Ejemplos concretos de este proyecto (Card):**
- **INVARIANTES** (guards en el constructor, lanzan):
  - `manaValue >= 0` → *"no puede existir carta con mana negativo, o si no ERROR"*. El tipo `number` NO protege esto (`-5` es number válido).
  - `color.length > 0` → *"debe tener al menos un color o Colorless, o si no ERROR"*.
  - `Colorless` no combinado → *"si incluye Colorless y length>1, ERROR"* (invariante derivada: o eres incoloro, o tienes colores, no ambos).
- **CONSULTAS** (métodos, devuelven boolean, nunca lanzan):
  - `isCreature()` → *"¿es una criatura?"* → `this.type.includes(Creature)`.
  - `isLegendary()` → *"¿es legendaria?"* → `this.superType === Legendary`.
  - `isMulticolor()` → *"¿tiene 2+ colores?"* → `this.color.length > 1`.

**Por qué se confunden:** una misma idea de negocio (ej. "colores") genera AMBAS: una invariante ("no vacío", "no colorless+color") Y consultas ("¿multicolor?"). El error típico (que cometí y corregí) es meter un `throw` dentro de un método de consulta → preguntarle "¿eres multicolor?" a una carta válida NO debe explotar, debe responder `false`.

### 🔑 El pago del "always-valid": las consultas CONFÍAN, no re-validan
Si el constructor YA garantizó la validez (ej. no existe `[White, Colorless]`), los métodos de consulta pueden asumir datos válidos → se simplifican. Por eso `isMulticolor()` es solo `length > 1` (NO re-chequea Colorless): el guard ya lo blindó al construir.

### ⚠️ Validar sobre `params.X`, NO sobre `this.X` (bug vivido)
Los guards corren ANTES de `Object.assign(this, params)` → en ese punto `this.color` es `undefined` (aún no asignado) → `this.color.length` = 💥 `TypeError`. Regla: **valida sobre `params` (el input), porque validas ANTES de asignar** (coherente con "no asignar hasta estar seguro"). `this` aún está vacío.

### Detalles de estilo
- `.includes(X)` es más idiomático que `.some(c => c === X)` para "¿el array contiene este valor exacto?". `.some()` se reserva para predicados complejos (ej. `power > 3`).
- Propiedades `readonly` (público) = leer sí, escribir no (el controller/repo necesitan LEER `card.name`). `private readonly` bloquearía también la lectura → requeriría getters. Se eligió `readonly` público.

### Referencias oficiales (2.2)
- Martin Fowler, *"AnemicDomainModel"* (martinfowler.com/bliki/AnemicDomainModel.html, 2003).
- Eric Evans, *Domain-Driven Design* (2003) — Entities, Value Objects, invariantes.
- Vladimir Khorikov, *"Always-Valid Domain Model"* (enterprisecraftsmanship.com).

---

## Phase 2 · Testing — Primeros unit tests con Jest (tests-after de Card)

### Herramienta: Jest (preconfigurado por NestJS)
- Convención de nombres: archivos `*.spec.ts` (`testRegex` en package.json). Viven junto al código en `src/`.
- Comandos: `npm run test` (todo), `npm run test:watch` (re-corre al guardar), `npm run test -- card.spec` (filtra por archivo — el `--` pasa el arg a Jest). `ts-jest` entiende TS.
- `describe`/`it`/`expect` son **globales** (Jest los inyecta) → NO se importan. ⚠️ NO importar de `node:test` (ese es el runner nativo de Node, otra herramienta).

### Anatomía (símil xUnit .NET)
| Jest | Qué | .NET xUnit |
|---|---|---|
| `describe('X', () => {})` | agrupa suite (anidable) | `class XTests` |
| `it('should...', () => {})` | un caso (alias `test`) | `[Fact] void Should_...()` |
| `expect(x).toBe(y)` | aserción igualdad estricta | `Assert.Equal(y, x)` |
| **AAA** Arrange-Act-Assert | organización | idéntico |

### 🔑 `.toThrow()` — 2 trampas clave
1. **Envolver en arrow function**: `expect(() => new Card(...)).toThrow()`. Si pasas `expect(new Card(...))` directo, el `new` se ejecuta AHÍ, lanza, y el test crasha ANTES del expect. La `() =>` hace que Jest invoque por dentro y capture el throw.
2. **Afirmar el MENSAJE**: `.toThrow('mana negativo')`, no `.toThrow()` pelado. Un `.toThrow()` sin arg pasa si lanza CUALQUIER error por CUALQUIER motivo (incluido un `TypeError` accidental) → test "mentiroso". Con mensaje pruebas que lanzó por la razón correcta. (Símil .NET: `Assert.Throws<ArgumentException>` afirma el TIPO.)

### 🔑 Un test solo prueba algo si EJECUTA el código real
Error clásico del principiante: `const card: Card = { ...datos inválidos... }` (objeto literal disfrazado) en vez de `new Card({...})`. El primero NO llama al constructor → los guards NUNCA corren → "pruebas" algo que ni pasa por la lógica. Siempre `new Card(...)`.

### 🔑 Consultas booleanas: probar AMBOS lados (true Y false)
Un test que solo prueba el `true` es MEDIO test: un método buggeado `isCreature(){ return true }` (siempre true) pasaría igual. Hay que probar el caso positivo Y el negativo → se comprueba que el método DISCRIMINA. (Teoría: cubrir las **clases de equivalencia**; para un booleano hay 2.)

### Test Data Builder / Object Mother (helper `makeCardProps`)
Construir una entidad con 14 campos en cada test = ruido que oculta la intención. Solución: `function makeCardProps(overrides = {}) { return { ...defaults válidos..., ...overrides }; }`. El `...overrides` AL FINAL pisa solo lo que especificas. Así el test GRITA su intención: `makeCardProps({ manaValue: -5 })` — se ve solo lo que importa. Los defaults deben ser VÁLIDOS → el camino feliz es `makeCardProps()` sin args. (Patrón .NET: Object Mother / Test Data Builder.)

### Camino feliz: afirmar que NO lanza
`expect(() => new Card(makeCardProps())).not.toThrow();` — el `.not` niega el matcher.

### El output de Jest ES documentación viva
Los strings de `describe`/`it` se imprimen como una spec legible (`Card > isCreature > returns true for a creature type`). Buenos nombres de test = documentación del comportamiento del dominio sin abrir el código. `describe` anidado da salida jerárquica.

### 🔑 Test de fuego de la Dependency Rule (2.1) confirmado en la práctica
`card.spec.ts` testea `Card` SIN arrancar NestJS (dominio puro). Que se pueda es la prueba de que la entidad no depende del framework = Clean Architecture funcionando.

### Bomba de tiempo revelada por los tests: imports absolutos `src/...`
`from 'src/enums/...'` funcionaba en NestJS (por `baseUrl: "./"` en tsconfig) pero **Jest tiene su propio resolvedor** y no lo entiende → `Cannot find module`. Los tests destaparon un acoplamiento oculto (uno de los valores de testear). Fix elegido: **imports relativos** (`../../enums/...`) — portables en cualquier herramienta sin config extra, e idiomáticos (el scaffolding de NestJS los usa). Alternativa: `moduleNameMapper` en Jest (perpetúa los absolutos) o path aliases `@domain/...` (ideal a futuro pero requiere configurar tsconfig + ts-jest). Regla para calcular relativo: cada `../` sube un nivel de carpeta. Un import roto en CUALQUIER eslabón de la cadena de imports tumba toda la suite (por eso el error apuntaba a `card.ts` aunque el `.spec` estuviera bien).

### Referencias (Testing)
- *Jest Docs* (jestjs.io) — Getting Started, Expect (matchers), Setup.
- *NestJS Docs → Testing*.
- Kent Beck, *Test-Driven Development: By Example* (2002).

---

## Principios de diseño: YAGNI, KISS, DRY (el trío que se cita junto)

Anotados a raíz de la reflexión del estudiante ("pensaba en escalabilidad futura; aprendí a desarrollar a medida que se necesita"). Son heurísticas para decidir *cuánta* estructura meter.

### YAGNI — *You Aren't Gonna Need It*
> No construyas algo hasta que una necesidad REAL lo pida.
- Origen: Extreme Programming (Kent Beck, Ron Jeffries). Frase popularizada por Martin Fowler ("Yagni", martinfowler.com, 2015).
- El costo oculto de "por si acaso": todo método/abstracción especulativa es código que hay que mantener, testear y entender, SIN aportar valor hasta que se use. Peor: a menudo adivinas mal la necesidad futura y construyes la abstracción equivocada.
- 🔑 Regla de dominio: **añade comportamiento cuando una regla de negocio lo requiere, no cuando el dato existe.** Ej. concreto de este proyecto: el enum `CardSuperType` tiene Snow/World/Ongoing, pero NO creamos `isSnow()`/`isWorld()` "porque el dato existe". Solo existe `isLegendary()` porque hay una regla real (Commander) que lo pide. Los demás se crearán CUANDO una regla de Deck los necesite (con TDD: el test de la regla "tira" del método).
- ⚠️ Matiz: YAGNI NO es excusa para código chapucero. No aplica a: buenas prácticas base (tests, validación, seguridad), ni a decisiones caras de revertir después (elección de arquitectura/BD). Aplica a *features/abstracciones especulativas*.

### KISS — *Keep It Simple, Stupid*
> Prefiere la solución más simple que resuelva el problema. La complejidad se paga en mantenimiento.
- Origen: atribuido a Kelly Johnson (ingeniería aeronáutica, Lockheed).
- Relación con YAGNI: YAGNI dice *"no lo agregues todavía"* (dimensión temporal/features); KISS dice *"lo que agregues, hazlo simple"* (dimensión de complejidad). Ej. en este proyecto: `isMulticolor()` es `return this.color.length > 1` (simple) porque el guard del constructor ya blindó los datos → la consulta CONFÍA y no re-valida (KISS + pago del always-valid).

### DRY — *Don't Repeat Yourself*
> Cada pieza de conocimiento debe tener una representación única y autoritativa en el sistema.
- Origen: Andy Hunt & Dave Thomas, *The Pragmatic Programmer* (1999).
- Ya aplicado sin nombrarlo: el helper `makeCardProps` (evita repetir 14 campos), el mapeo DTO→Card centralizado, la idea de `PartialType` para no duplicar DTOs (1.3).
- ⚠️ Matiz importante (WET/AHA): NO todo lo que "se ve igual" es duplicación real. DRY es sobre duplicar *conocimiento/reglas*, no *código que coincide por casualidad*. Abstraer demasiado pronto dos cosas que luego divergen es peor que la duplicación (acoplamiento accidental). "Prefiere duplicación a la abstracción equivocada" (Sandi Metz). Regla de bolsillo: dedúplica a la 3ª repetición, no a la 2ª.

### El equilibrio (la madurez que describió el estudiante)
Los tres empujan contra el instinto de "sobre-ingeniería anticipada". El punto NO es sub-diseñar, sino **diseñar para lo que sabes hoy, con código simple y sin duplicar conocimiento, dejando que las necesidades reales tiren de la estructura futura.** Es más fácil añadir estructura cuando se necesita que quitar la que sobra.

### Referencias (principios)
- Martin Fowler, *"Yagni"* (martinfowler.com/bliki/Yagni.html, 2015).
- Andy Hunt & Dave Thomas, *The Pragmatic Programmer* (1999) — DRY.
- Sandi Metz, *"The Wrong Abstraction"* (sandimetz.com, 2016) — el matiz de DRY.

---

## Phase 2 · Lesson 2.3 — SOLID & Repository Pattern (DIP)

### SOLID aterrizado al proyecto
| Principio | Dónde |
|---|---|
| **S** Single Responsibility | `Card` (dominio) vs `CardsController` (HTTP) vs `CardsRepository` (persistencia). Hoy `CardsService` viola esto (mapeo + "repo"). |
| **O** Open/Closed | añadir `PostgresCardsRepository` sin tocar use cases (cambias 1 línea del `useClass`). |
| **L** Liskov | cualquier impl de `CardsRepository` funciona donde se espera la interfaz. |
| **I** Interface Segregation | contrato con SOLO los métodos que se usan (no CRUD "porque sí"). |
| **D** Dependency Inversion | **el corazón de 2.3.** Use case → `CardsRepository` (abstracción), no → array/DB. |

### Repository Pattern = DIP materializado (las 4 piezas)
1. **PUERTO** (interfaz `CardsRepository`) → vive en `domain/repositories/`. El contrato.
2. **TOKEN** (`CARDS_REPOSITORY = Symbol(...)`) → porque la interfaz se borra en runtime (type erasure de 1.5).
3. **IMPLEMENTACIÓN** (`InMemoryCardsRepository implements CardsRepository`) → vive en `infrastructure/persistence/`. El detalle (array hoy).
4. **WIRING** (custom provider) → conecta token ↔ impl en el módulo. [pendiente]
```
UseCase ─▶ CardsRepository (abstracción) ◀─implementa─ InMemoryCardsRepository (detalle)
```
La impl se nombra por su "cómo": `InMemoryCardsRepository`, `PostgresCardsRepository`, `TypeOrmCardsRepository`... todas implementan el mismo puerto → cambias una por otra sin tocar el negocio (= Open/Closed habilitado por DIP). Símil .NET: `AddScoped<IRepo, PostgresRepo>()`.

### Contrato mínimo de `CardsRepository` (Interface Segregation + YAGNI)
`findAll(): Card[]`, `findById(id): Card | undefined`, `create(card): Card`, `update(card): Card`. **NO** se agregó `delete` (sin caso de uso real aún). El `update` SÍ se agregó porque hay caso real justificado (usuario corrige carta mal creada) — YAGNI bien aplicado = el método nace de una necesidad, no de una plantilla CRUD. El repo trabaja con `Card` (dominio), NUNCA con el DTO.

### 🔑 Convención de nombres: archivo vs interfaz vs implementación
- **Archivo:** `cards.repository.ts` (kebab-case por concepto; NO lleva `I`, ej. no `icards.repository.ts`). Plural (recurso/colección, coherente con `cards.controller/service/module`). La entidad es singular (`card.ts`), el recurso plural.
- **Interfaz:** `CardsRepository` (sin `I`) o `ICardsRepository` (con `I`, estilo .NET) — decisión de estilo, ser CONSISTENTE. Se eligió SIN `I` (idiomático TS).
- **Implementación:** por su tecnología (`InMemoryCardsRepository`).

### 🔑 Symbol como token de DI (concepto nuevo)
`Symbol` = tipo primitivo JS; **cada Symbol es único e irrepetible**, aunque tenga igual descripción: `Symbol('X') === Symbol('X')` → `false` (vs strings: `'X' === 'X'` → `true`). La descripción es solo etiqueta de debug; la identidad es única (metáfora: string = nombre "Juan"; Symbol = ADN). Por eso como token de DI evita colisiones: dos módulos con `Symbol('CARDS_REPOSITORY')` NO chocan (con strings sí). Matiz: para proyectos chicos un string basta; Symbol es la forma robusta (se eligió por aprender el patrón pro). Token vive JUNTO a la interfaz (mismo archivo `cards.repository.ts`): son el mismo concepto ("cómo pido el repo"). No hay lugar "oficial" impuesto por NestJS; juntarlos evita dispersión (YAGNI). Inyección: `@Inject(CARDS_REPOSITORY)` porque el token no es una clase.

### 🔑 `implements` (símil .NET `: IRepository`)
`class InMemoryCardsRepository implements CardsRepository` → TS obliga a cumplir el contrato en compile-time (si falta un método o cambia una firma, error). Red de seguridad. ⚠️ Un parámetro EXTRA en la impl (ej. `update(card, id)` vs interfaz `update(card)`) puede NO romper el `implements` por compatibilidad estructural, pero DESALINEA impl y contrato → hay que unificarlos.

### 🔑 Update: por qué NO recibe `id` suelto (el id ya está en la Card)
El `id` es campo obligatorio del constructor de `Card` → toda `Card` lo trae dentro (`card.id`). En `update(card)`, pasar un `id` aparte es redundante y ambiguo (¿y si `id` ≠ `card.id`? ¿cuál gana?). Se usa `card.id` → una sola fuente de verdad. Excepción: `findById(id)` SÍ recibe id suelto, porque ahí NO tienes la Card (la estás buscando).

### 🔑 Read-Modify-Write (el patrón del update)
Actualizar algo existente = 3 pasos, y ocurren en el USE CASE (2.4), no en el repo:
```
1. READ    → repo.findById(id)                    (lee la carta vieja)
2. MODIFY  → new Card({ ...vieja, campoCorregido })  (reconstruye COMPLETA + valida vía constructor)
3. WRITE   → repo.update(cardNueva)               (guarda)
```
Conecta con PATCH: el cliente manda cambio parcial `{ manaValue: 1 }`, el use case lee la vieja, fusiona, reconstruye Card completa validada, y llama update. El PATCH parcial (HTTP) NO implica update parcial en el repo → la "magia" del parcial vive en el use case; el repo recibe Card completa (Estilo A). Pago: cuando `update` corre, el id YA existe (el READ lo garantizó) → el repo puede asumir camino feliz. Bug clásico cazado: guardar `existingCard` (vieja) en vez de `card` (nueva) → el cambio se pierde (un test lo cazaría al instante).

### 🔑 findAll: copia `[...this.cards]` — DOS niveles de inmutabilidad
`readonly` en los CAMPOS protege el contenido de CADA Card (`card.manaValue = -5` → bloqueado). Pero NO protege el ARRAY como colección: si devuelves el array interno directo, alguien hace `.push()/.pop()/.splice()` y modifica QUÉ cartas hay en tu almacén (sin tocar campos readonly). Solución: `return [...this.cards]` (copia superficial del array). Complementario:
- `readonly` campos → protege el CONTENIDO de cada Card (nivel carta).
- copia del array → protege QUÉ Cards hay (nivel colección).
Matiz: `[...this.cards]` es shallow (array nuevo, mismas referencias de Card). Como las Cards tienen campos readonly, las referencias compartidas son seguras → shallow + readonly = robusto, no hace falta deep copy.

### 🔑 ¿Quién genera el ID? auto-increment vs UUID (duda del estudiante)
El estudiante notó que "normalmente el id lo crea la DB". Correcto PARA auto-increment (`SERIAL`/`IDENTITY`): solo la DB lleva el contador → el código no puede adivinar el número → la DB lo genera. PERO con **UUID** (este proyecto) cualquiera puede generarlo (número gigante aleatorio, colisión ~0, sin contador central). Decisión adoptada (Opción A): el **use case** genera el UUID al construir la entidad (`new Card({ id: randomUUID(), ...dto })`), el repo es "tonto" (solo `push`/guarda). Por qué: (1) coherente con `Card` que exige `id` obligatorio en el constructor (always-valid desde que nace); (2) entidad completa y testeable SIN DB (pago para 2.5); (3) UUID en app funciona en sistemas distribuidos y no expone el conteo de registros. Ninguna práctica es universal: el TIPO de id inclina la balanza (auto-increment → DB; UUID → app, o DB con `gen_random_uuid()` si se quisiera en Fase 3).

### Paso 4 — WIRING (custom provider) [COMPLETA 2.3]
Conecta las piezas. En `cards.module.ts`, forma explícita del provider:
```typescript
providers: [{ provide: CARDS_REPOSITORY, useClass: InMemoryCardsRepository }]
```
Léelo: "cuando pidan el token CARDS_REPOSITORY, instancia y entrega InMemoryCardsRepository". `providers: [CardsService]` es azúcar de `{ provide: CardsService, useClass: CardsService }` (token = la propia clase). Símil .NET EXACTO: `AddScoped<ICardsRepository, InMemoryCardsRepository>()` → `provide` = contrato, `useClass` = impl. Pago DIP: cambiar a `PostgresCardsRepository` en Fase 3 = tocar SOLO esa línea. Se metió en `CardsModule` existente (no módulo nuevo) por KISS/YAGNI. ⚠️ Recordar encapsulación (1.2): los providers son privados al módulo → si un use case en otro módulo (2.4) necesita el repo, hay que `exports: [CARDS_REPOSITORY]`. Se añadió alias `@infrastructure/*` al tsconfig (ya hay contenido → no YAGNI). Bug cazado por el compilador: rename `findOne`→`findById` en el service dejó el controller llamando al nombre viejo (TS2339) → TS lo detecta (valor de tipado).

### NestJS "standalone" ≠ Angular "standalone" (FALSO AMIGO — duda del estudiante que viene de Angular 20)
Mismo nombre, concepto TOTALMENTE distinto:
| | Angular standalone | NestJS standalone |
|---|---|---|
| Qué elimina | los `NgModule` (piezas sin módulo, default en Ng20) | el servidor HTTP |
| Los módulos | DESAPARECEN | SIGUEN obligatorios |
| Para qué | simplificar árbol de componentes UI | correr Nest sin API web: CRON, CLI, workers (`NestFactory.createApplicationContext`) |
Conclusión: lo de Angular (componentes sin módulos) NO existe en NestJS. En Nest los `@Module` son el pilar de encapsulación (1.2) y no se van. Por qué difieren: en frontend los NgModules eran ceremonia confusa (Ng los simplifica); en backend los módulos aportan encapsulación real (agrupar features, controlar qué se expone entre capas). Nest se inspiró en Angular pero evolucionaron distinto (backend vs frontend). 📚 NestJS Docs → Standalone applications; Angular Docs → Standalone components.

### Referencias (2.3)
- *NestJS Docs → Fundamentals → Custom Providers* (tokens, `useClass`, `@Inject`).
- *MDN → Symbol* / *TypeScript Handbook → Symbols*.
- R. C. Martin, *Clean Architecture* — DIP y boundaries (repositorio invertido).

---

## Phase 2 · Lesson 2.4 — Application Layer: Use Cases (teoría previa)

### Qué es un Use Case
Una clase que representa UNA acción/intención de negocio del usuario: `CreateCardUseCase`, `FindAllCardsUseCase`, `FindCardByIdUseCase`, `UpdateCardUseCase`. Single Responsibility (S de SOLID): orquesta UNA operación. Vive en `src/application/use-cases/`. **Símil .NET: es el Handler de MediatR/CQRS** (`useCase.execute(dto)` ≈ `handler.Handle(command)`).

### Qué SÍ / qué NO hace
SÍ: recibe DTO, construye/valida entidades de dominio, llama al repo (vía interfaz), aplica reglas de la operación, devuelve la entidad. NO: saber de HTTP (status/req/res), tocar array/DB directo, formatear respuesta HTTP. Conoce al dominio, NO a la infra (Dependency Rule: apunta hacia adentro).

### Todo converge en CreateCardUseCase
El use case hace lo que en Fase 1 hacía `CardsService.create`, pero en su lugar correcto: (1) el **id nace aquí** (`randomUUID()`, decisión 2.3), (2) la **Card se auto-valida** en su constructor (guards 2.2, always-valid), (3) depende de la **interfaz `CardsRepository`** no de la impl (DIP 2.3), (4) el **mapeo DTO→Card** ocurre aquí. Inyecta el repo vía `@Inject(CARDS_REPOSITORY)` (token, porque la interfaz se borra en runtime).

### Decisión: un archivo por caso de uso (Opción A)
Elegido `CreateCardUseCase`, `FindAllCardsUseCase`... (1 clase por operación = máx SRP) sobre un `CardsApplicationService` con métodos (Opción B). Contraste: el .NET del estudiante usa handler-por-entidad (`UserHandler` con varios métodos) = más cercano a Opción B. Se elige A para variar/aprender la forma más granular. Ninguna es incorrecta.

### 🔑 ¿Interfaz para el use case? NO (a diferencia del repo) — duda clave del estudiante
El estudiante (de .NET) inyecta `IHandler` al controller por costumbre, sin saber el porqué. Regla depurada:
> Una interfaz se justifica por **necesidad de PRODUCCIÓN** (intercambiar impls reales / invertir dependencias entre capas), **NO por testeo**.
| Motivo | Repositorio | Use Case |
|---|---|---|
| ¿Múltiples impls en prod? | Sí (InMemory/Postgres) | No (una sola) |
| ¿Cruza frontera con DIP? | Sí (dominio↔infra) | No |
| ¿Poder mockear en test? | (beneficio extra) | Jest ya lo permite SIN interfaz |
→ **Repo:** interfaz + token + `@Inject`. **Use case:** clase concreta directa (NestJS la resuelve sola, existe en runtime). Interfaz de use case con 1 sola impl = ceremonia (YAGNI).

### 🔑 El mito "interfaz para testear" (cambio de mentalidad vs .NET clásico)
El argumento histórico "necesito interfaz para mockear" venía de una LIMITACIÓN técnica (Moq clásico requería métodos `virtual` para mockear clases). En **TS/Jest se mockea la clase concreta SIN interfaz**:
```typescript
const mockUseCase = { execute: jest.fn().mockReturnValue(cartaPrueba) };
providers: [{ provide: CreateCardUseCase, useValue: mockUseCase }]  // clase como token, mock como valor
```
El único motivo que quedaba para la interfaz del use case (testeo) ya lo cubre el framework → interfaz innecesaria. Lección transversal: **no crees abstracciones solo para testear.**

### Transparencia sobre fuentes (a petición del estudiante — D-001)
- **OFICIAL** (verificable): que Jest/NestJS mockean clases sin interfaz vía `useValue`/`overrideProvider` → *NestJS Docs → Testing*; *Jest Docs → Mock Functions*. Custom providers → *NestJS Docs → Custom Providers*.
- **CRITERIO de ingeniería** (síntesis, NO regla oficial de NestJS — Nest no dicta arquitectura): "interfaz solo donde aporta, no para el use case". Respaldo en autores, no en docs de Nest:
  - **Mark Seemann** — *Dependency Injection Principles, Practices, and Patterns* (2019) + blog.ploeh.dk ("Interfaces are not abstractions", **Reused Abstractions Principle**: una interfaz con 1 sola impl probablemente no debería existir aún). Es del mundo .NET → ideal para el estudiante.
  - **Vladimir Khorikov** — *Unit Testing Principles, Practices, and Patterns* (2020): contra interfaces de una sola impl y abstracciones solo-para-mockear.
  - **Martin Fowler** — *"Yagni"*.
- 🔑 Lección meta: aplicar patrones porque "siempre se hizo así" sin entender el porqué es el anti-patrón real. Cuestionar si cada abstracción "gana su sueldo" en el contexto propio.

### Controller delgado (adaptador HTTP)
Tras 2.4, el `CardsController` inyecta los use cases (clases DIRECTAS, sin token — son clases concretas que NestJS resuelve solo) y cada endpoint solo delega: `getCards() { return this.findAllCardsUseCase.execute(); }`. Cero lógica de negocio en el controller = adaptador HTTP delgado (traduce request→use case→response). Se añadió `@Patch(':id')` para update. El `CardsService` viejo salió de las dependencias → se elimina.

### 🔑 Constructor Over-Injection y CQRS (dudas del estudiante)
**Over-injection:** un constructor con MUCHAS dependencias (8-10+) es un code smell = SÍNTOMA de que la clase hace demasiado (viola SRP), no una enfermedad en sí. ⚠️ Pero 4-5 use cases en un controller REST (CRUD) es NORMAL y correcto, NO over-injection. Soluciones cuando SÍ crece: (1) dividir el controller (SRP: `CardsController` + `CardsSearchController`); (2) facade/servicio de aplicación (ojo, puede volver al "service que hace todo"); (3) **patrón mediador** (CommandBus). Regla: ante un constructor gigante, preguntar "¿por qué tantas?" no "¿cómo las escondo?".

**CQRS = Command Query Responsibility Segregation:** separar operaciones que ESCRIBEN (commands: Create/Update/Delete, cambian estado) de las que LEEN (queries: FindAll/FindById, sin efectos secundarios). 🔑 **El estudiante YA hace CQRS ligero sin saberlo** (use cases separados por operación). Tiene DOS niveles: (a) LIGERO = solo organizar código separando lecturas/escrituras (inofensivo, ya lo hace); (b) PESADO = DBs separadas para leer y escribir + Event Sourcing (alta escala, NO lo necesita = sobre-ingeniería). **NO rompe Clean Architecture**: son ejes complementarios — Clean Arch = cómo separas CAPAS; CQRS = cómo organizas use cases DENTRO de application. `@nestjs/cqrs` = el **MediatR de .NET** (CommandBus/QueryBus): el controller inyecta 1 bus en vez de N use cases (`commandBus.execute(new CreateCardCommand(dto))`), las capas quedan intactas. Mapeo .NET: `Command`+`Handler`+`IMediator` ≡ CQRS ligero + bus. **Para este proyecto: NO usar aún (YAGNI)**; reevaluar si Deck hace crecer mucho las operaciones — y le sonará a MediatR. 📚 Fowler "CQRS" (martinfowler.com); Greg Young (origen); *@nestjs/cqrs* docs.

### Referencias (2.4)
- *NestJS Docs → Testing* / *Custom Providers* / *CQRS* (`@nestjs/cqrs`).
- Mark Seemann, *DI Principles, Practices, and Patterns* (2019); blog.ploeh.dk.
- Vladimir Khorikov, *Unit Testing Principles...* (2020).
- Martin Fowler, *"CQRS"* (martinfowler.com/bliki/CQRS.html); Greg Young (origen del término).
