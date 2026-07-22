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
