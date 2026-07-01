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
