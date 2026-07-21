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
