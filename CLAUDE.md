# Project Context

**Abril Trainer** es una aplicación web (PWA, mobile-first) para que una entrenadora personal gestione alumnos, planificación de entrenamientos, clases, asistencia y pagos. Next.js 15 + React 19 + TypeScript + Tailwind v4 + Supabase, pensada para desplegarse en Vercel.

Es un proyecto de un solo tenant activo (una entrenadora, Abril) pero con **multi-entrenadora** ya soportado a nivel de datos: el aislamiento entre entrenadoras lo hace RLS, no el código de la app.

# Product Overview

- **Qué es:** herramienta de trabajo diario para una entrenadora con grupos chicos — no un marketplace ni una app para que el alumno se autogestione.
- **Problema que resuelve:** reemplaza planillas/WhatsApp para llevar alumnos, asignar y seguir planes de entrenamiento, tomar asistencia de clases grupales y controlar pagos/vencimientos.
- **Usuario objetivo:** una entrenadora personal (hoy una sola cuenta, `abril@demo.local` en local), que trabaja desde el celular "entre alumno y alumno", a menudo con mal wifi de gimnasio.
- **Objetivo principal:** que cargar datos en el momento (durante o justo después de una clase) sea rápido y no rompa lo que ya estaba escrito.

El alcance está deliberadamente acotado. **Fuera del MVP a propósito** (ver `README.md`): Mercado Pago, facturación electrónica, IA, acceso del alumno, registro de entrenamientos por el alumno, offline-first, notificaciones push, chat, exportar a PDF, multi-gimnasio, informes, reservas de cupo, apps nativas. El esquema y las políticas RLS ya contemplan el acceso del alumno (`abril_trainer_students.user_id`, función `abril_trainer_is_my_student_record`) para no tener que migrar datos si se abre más adelante — pero **no está construido**, no lo asumas disponible.

# Core Principles

Estos principios están implementados en el código, no son aspiracionales — respetalos:

1. **El servidor lee, el servidor escribe.** Lecturas en Server Components vía `lib/queries/*` (no hay librería de data-fetching cliente). Escrituras en Server Actions vía `lib/actions/*` (`'use server'`). `useOptimistic` solo para lo que necesita respuesta inmediata (pasar lista, reordenar ejercicios).
2. **RLS es la barrera de seguridad real, no el código de la app.** Nunca escribas `.eq('trainer_id', …)` en una query. Si sentís que hace falta, es señal de que falta una política RLS, no de que el filtro va en TypeScript.
3. **Las lecturas lanzan, las escrituras devuelven un resultado.** Ver `types/domain.ts` (`ActionResult`, `ok()`, `fail()`). Un error al guardar un formulario tiene que aparecer junto al botón, no reemplazar la pantalla.
4. **Los mensajes de error son para la usuaria, no para el log.** "No se pudo crear el alumno", nunca el mensaje crudo de Postgres/Supabase. El detalle técnico va a `console.error`.
5. **"Hoy" se calcula en la zona horaria de Abril (`America/Argentina/Buenos_Aires`), nunca en la del servidor.** Cliente: `src/lib/today.ts` (`todayISO`, `todayWeekday`, `todayHour`, `startOfMonthISO`, `appDateOf`, `daysBetween`). SQL: `abril_trainer_app_today()` y `abril_trainer_app_date()` (migraciones 0012 y 0013). Las dos caras tienen que coincidir siempre que agregues lógica de fechas.
   **Regla operativa:** en `lib/queries`, `lib/actions` y `app/` no se llama `new Date()` para obtener una fecha de calendario — ni para "hoy", ni para vencimientos por defecto, ni para cortes de mes. Los únicos `new Date()` legítimos son los instantes (`paid_at`) y los internos de `today.ts`/`format.ts`, que fijan `T12:00:00` justamente para que la zona no corra el día.
6. **Cuatro pestañas en la nav inferior, no cinco.** "Entrenamientos" no es un ítem de nivel superior a propósito: una planificación siempre pertenece a un alumno y se entra por su ficha.
7. **`database.types.ts` es generado — nunca se edita a mano.** Se regenera con `npm run db:types` después de cada migración.

# Tech Stack

| Área | Tecnología |
|---|---|
| Framework | Next.js 15.5 (App Router, Server Components + Server Actions) |
| UI | React 19.1, TypeScript 5.9 (`strict`, `noUncheckedIndexedAccess`) |
| Estilos | Tailwind CSS v4 (config CSS-first vía `@theme`, sin `tailwind.config.js`) |
| Validación | Zod 4, compartida entre formulario y Server Action |
| Formularios | react-hook-form + `@hookform/resolvers` |
| Backend/DB | Supabase (Postgres, Auth, Storage, RLS) vía `@supabase/ssr` y `@supabase/supabase-js` |
| Fechas | date-fns |
| Iconos | lucide-react |
| Lint | ESLint 9 (flat config), `eslint-config-next` |
| Deploy | Vercel (según el stack declarado en `README.md`; **no hay `vercel.json` ni proyecto vinculado en este checkout** — no asumas que ya está desplegado) |
| Testing | Ver sección [Testing](#testing) — no hay framework de test JS/TS configurado |

No hay ORM: se usa el cliente de Supabase (PostgREST) directo, tipado con `Database` generado.

# Architecture

**Frontend:** App Router con dos grupos de rutas:
- `(auth)/login` — pantalla de login, fuera del shell de navegación.
- `(app)/` — shell con `BottomNav` de 4 pestañas (Inicio, Alumnos, Clases, Pagos); "Planes" y "Ejercicios" están accesibles pero no en la nav.

**Backend:** no hay API routes propias de Next.js para el CRUD de negocio — las Server Components consultan Supabase directo (`lib/queries/*`) y las Server Actions escriben directo (`lib/actions/*`). El "backend" es Postgres + PostgREST + Auth + Storage de Supabase, con toda la lógica de autorización en RLS y toda la lógica de negocio no trivial en funciones/triggers de Postgres (ver [Database Rules](#database-rules)).

**Database:** Postgres vía Supabase, 14 tablas, 34 políticas RLS (`supabase/README.md` tiene el detalle completo y está tratado como fuente de verdad para todo lo referido a la base).

**Authentication:** Supabase Auth (email/contraseña), cookies gestionadas por `@supabase/ssr`, sesión refrescada en `src/middleware.ts` en cada request.

**Integrations:** ninguna externa activa (sin pasarela de pago, sin IA, sin analytics detectado). Supabase Storage sirve la foto de perfil de cada alumno y los 361 videos de la biblioteca de ejercicios.

**Deployment:** pensado para Vercel (serverless), pero no confirmado/vinculado en este checkout.

**Principales módulos de dominio:** alumnos (`abril_trainer_students`), planes comerciales (`abril_trainer_plans`/`abril_trainer_memberships`), pagos (`abril_trainer_payments`, sin columna de estado — se deriva), planificación de entrenamiento (`abril_trainer_training_blocks` → `abril_trainer_training_sessions` → `abril_trainer_session_exercises`, más `abril_trainer_workout_logs` para lo realmente ejecutado), catálogo de ejercicios (`abril_trainer_exercises`, 361 registros heredados de GymMane), clases grupales recurrentes (`abril_trainer_classes`, `abril_trainer_class_enrollments`, `abril_trainer_attendance`).

# Project Structure

```
src/
├── app/
│   ├── (auth)/login/                     login (fuera del shell)
│   └── (app)/                            shell con BottomNav
│       ├── page.tsx                      dashboard (RPC abril_trainer_dashboard_summary)
│       ├── alumnos/[id]/                 resumen · entrenamiento · asistencia · pagos
│       ├── clases/[classId]/asistencia/  pasar lista
│       ├── pagos/ · planes/ · ejercicios/ · ajustes/
│       └── error.tsx                     error boundary del segmento (app)
├── components/
│   ├── ui/            kit propio: Button, Card, Badge, Field, Sheet, Confirm, Avatar, Stat, states (Empty/Skeleton/ErrorNote)
│   └── layout/         PageHeader/PageBody, BottomNav
├── lib/
│   ├── supabase/       client.ts (browser) · server.ts (Server Components/Actions) · middleware.ts (refresco de sesión)
│   ├── queries/        LECTURAS — un archivo por dominio, para Server Components. Lanzan en error.
│   ├── actions/        ESCRITURAS — Server Actions ('use server'). Devuelven ActionResult, no lanzan.
│   ├── schemas.ts       Zod, una sola fuente de verdad para formulario + acción
│   ├── constants.ts     vocabulario del dominio (músculos, enums traducidos, storage buckets)
│   ├── today.ts         "hoy" en zona horaria Argentina — ver Core Principles
│   ├── payment-status.ts estado de pago derivado (pagado/pendiente/vencido)
│   └── format.ts · cn.ts · media-url.ts · storage.ts
└── types/
    ├── database.types.ts  GENERADO por `npm run db:types` — no editar a mano
    └── domain.ts           ActionResult/ok/fail + tipos compuestos (joins, vistas)

supabase/
├── migrations/     0001…0012, numeradas y versionadas — FUENTE DE VERDAD del esquema
├── schema_completo.sql  consolidado, se regenera desde migrations/ (no se edita directo)
├── seed/           demo.sql (datos ficticios) y exercises.sql (catálogo real)
├── tests/rls_test.sql   tests de aislamiento entre entrenadoras y reglas de negocio
└── README.md       documentación completa de esquema, RLS y puesta en marcha — leer antes de tocar la base

scripts/    extracción del catálogo de ejercicios (GymMane), conversión de media, generación de íconos
media/      catálogo de video convertido — gitignored, se regenera, no se commitea
abril-trainer-marca/  kit de identidad de marca (tokens de color/tipografía/spacing, isotipo SVG) — fuente de verdad del sistema visual, ya aplicado en globals.css
```

# Development Commands

Todos verificados en `package.json`:

```bash
npm install                # instalar dependencias
npm run dev                 # servidor de desarrollo (Next.js)
npm run build                # build de producción
npm run start                # sirve el build de producción
npm run lint                 # ESLint
npm run typecheck            # tsc --noEmit
npm run check                 # typecheck + lint (correr antes de dar por terminado un cambio)
npm run db:types              # regenera src/types/database.types.ts desde el esquema local
npm run db:test                # corre supabase/tests/rls_test.sql (requiere $DB_URL)
npm run catalog:extract        # extrae el catálogo de ejercicios de GymMane a SQL
npm run catalog:media           # convierte los GIFs del catálogo a MP4
npm run catalog:upload          # sube la media a Supabase Storage
npm run icons                   # genera los íconos de la PWA
```

**Base de datos local** (necesaria para `npm run dev` con datos reales — ver `supabase/README.md` para el detalle completo):

```bash
supabase start
psql "$DB_URL" -f supabase/seed/exercises.sql
psql "$DB_URL" -f supabase/seed/demo.sql   # 5 alumnos, 3 planes, 2 clases, 6 pagos de prueba
```

No hay comando de "generación de código" más allá de `db:types`. No hay comando de deploy en `package.json` (se asume `vercel` CLI o integración Git, sin confirmar).

# Coding Conventions

Detectadas en el código real, no genéricas:

- **TypeScript estricto**: `strict` + `noUncheckedIndexedAccess` activos. No introducir `any` ni `as` innecesarios; el proyecto tipa todo contra `database.types.ts` generado.
- **Server Actions** siempre en `lib/actions/<dominio>.ts` con `'use server'` al tope del archivo, reciben `input: unknown` y validan con Zod antes de tocar la base, devuelven `Promise<ActionResult<T>>`.
- **Queries** siempre en `lib/queries/<dominio>.ts`, funciones `async` que devuelven datos tipados o lanzan (`if (error) throw error`). Nunca devuelven `ActionResult`.
- **Validación compartida**: los esquemas Zod de `lib/schemas.ts` se usan tanto en el formulario (cliente) como en la Server Action (servidor) — el servidor **nunca** confía en que el cliente ya validó.
- **Manejo de errores de Supabase**: siempre `console.error('nombreDeLaFunción:', error.message)` seguido de un `fail('mensaje en español para la usuaria')`. No propagar el mensaje crudo del error a la UI.
- **Nombres de archivo**: kebab-case (`student-row.tsx`, `payment-sheet.tsx`). Componentes en PascalCase dentro del archivo.
- **Imports**: alias `@/*` → `src/*` (ver `tsconfig.json`), sin imports relativos largos (`../../..`).
- **Estilos**: solo clases de Tailwind vía tokens semánticos (`bg-surface`, `text-text-2`, `border-border`, `bg-accent`…), nunca colores hexadecimales sueltos en componentes — los tokens están centralizados en `src/app/globals.css`.
- **Comentarios**: el proyecto usa comentarios cortos que explican el *porqué*, no el *qué*, sobre todo en reglas de negocio no obvias. Seguí ese estilo si agregás uno — evitá explicar lo que el código ya dice por sí mismo.
- **Fechas**: siempre como texto `'YYYY-MM-DD'` comparado con string (ordena igual que una fecha real) o vía las utilidades de `lib/today.ts`; nunca `new Date()` crudo para "hoy" en lógica de negocio.
- **ESLint**: `@typescript-eslint/no-unused-vars` en `error`, con excepción para variables prefijadas `_`. No hay configuración de Prettier detectada — no asumas un formateador y no lo agregues sin que te lo pidan.

# UI/UX Guidelines

**Mobile-first, sin excepciones** (reglas explícitas del `README.md`, verificadas en el código):

- Objetivo táctil mínimo **44px** en todo elemento interactivo (`Button`, `IconButton` en `components/ui/button.tsx` ya lo garantizan).
- Todo `input`/`select`/`textarea` a `font-size: 16px` — por debajo, iOS hace zoom automático al enfocar (`globals.css`).
- `inputMode` correcto por campo (`numeric` para importes, `tel` para teléfonos, `email` para email).
- Un formulario, una columna. El alta de alumno se puede guardar con solo el primer paso completo.
- **Nada de `hover` como única señal** — en un teléfono no existe.
- Reordenar listas con flechas, nunca arrastrando (drag-and-drop es frágil en scroll móvil).

**Sistema visual** (fuente de verdad: `abril-trainer-marca/`, ya aplicado en `src/app/globals.css`):
- Paleta neutra cálida (`paper`/`surface`/`ink`) con un único acento **lima** — regla estricta: un solo elemento lima por pantalla, texto sobre lima siempre en `ink` (nunca blanco).
- Tipografía de sistema (sin webfonts), contraste sans/mono: mono en mayúscula para métricas, horarios, series×repeticiones.
- Tres radios (10 / 16 / 22px), botones y chips siempre a radio píldora (999px).
- Modo claro/oscuro con toggle en Ajustes (`Claro`/`Oscuro`/`Auto`), persistido en `localStorage`.

**Estados de UI** — patrón consistente en toda la app:
- Loading: `loading.tsx` por segmento, casi siempre `SkeletonList` (`components/ui/states.tsx`).
- Vacío: `EmptyState` con ícono + título + texto + acción — **cada lista escribe el suyo**, nunca un genérico de "no hay datos" sin decirle a la usuaria qué hacer.
- Error de sección: `error.tsx` por segmento (ver `src/app/(app)/error.tsx`), mensaje en español orientado a la usuaria, botón "Reintentar".
- Error de formulario: `ErrorNote` inline junto al campo/botón, nunca reemplaza la pantalla.

# Database Rules

- **Cliente**: `@supabase/supabase-js` + `@supabase/ssr`, sin ORM. Tipado generado (`database.types.ts`).
- **Migraciones son la fuente de verdad** (`supabase/migrations/0001…0012`, numeradas y secuenciales). `schema_completo.sql` es un consolidado regenerado desde ellas — **nunca se edita directo**, y **nunca se toca el esquema desde el panel web de Supabase**: lo que no está en una migración no existe.
- **Al cambiar el esquema**: nueva migración numerada → `supabase db reset` en local → correr `supabase/tests/rls_test.sql` → regenerar tipos (`npm run db:types`) → regenerar `schema_completo.sql` → recién entonces `supabase db push` a producción y revisar el Security Advisor. (Procedimiento completo en `supabase/README.md`.)
- **Relaciones clave**: `abril_trainer_profiles` (1:1 con `auth.users`, `role` prepara acceso de alumno) → `abril_trainer_students` (`trainer_id`) → `abril_trainer_memberships` (una activa por alumno, constraint único parcial) → `abril_trainer_payments`. Planificación: `abril_trainer_training_blocks` → `abril_trainer_training_sessions` → `abril_trainer_session_exercises` (+ `abril_trainer_workout_logs` para lo realmente hecho). Clases: `abril_trainer_classes` → `abril_trainer_attendance` (no existen filas por ocurrencia futura, solo se materializa la fecha real al pasar lista).
- **RLS es obligatoria en las 14 tablas**, verificado por test (`rls_test.sql`, aserción #5). Las políticas usan funciones auxiliares `security definer` (`abril_trainer_owns_student`, `abril_trainer_owns_class`, `abril_trainer_owns_training_session`, `abril_trainer_is_my_student_record` en `0007_rls_helpers.sql`) para evitar recursión infinita al consultar la misma tabla que protegen.
- **`GRANT` y RLS son dos cosas distintas y hacen falta las dos.** Sin los grants de `0011_grants.sql`, toda consulta devuelve `42501` antes de que RLS llegue a evaluarse.
- **Vistas con `security_invoker = true` es obligatorio**, no opcional (ver `abril_trainer_payments_with_status` en `0003_commercial.sql`) — por defecto una vista corre con permisos de quien la creó, lo que saltearía RLS.
- **No agregar columnas de estado calculable.** El estado de pago (`pagado`/`pendiente`/`vencido`) se deriva de `paid_at`/`due_date`, tanto en SQL (vista `abril_trainer_payments_with_status`) como en TS (`lib/payment-status.ts`) — las dos implementaciones tienen que coincidir si cambia la regla.
- **`abril_trainer_session_exercises.reps` y `.load` son `text`, no números** — es una prescripción libre ("8-10", "AMRAP", "al 70%"), no un dato numérico.
- **Reglas de negocio en la base, no solo en el formulario**: el cupo de clase se hace cumplir con un trigger (`abril_trainer_check_class_capacity`, `0006_classes.sql`) y la asistencia no puede registrarse en el futuro (`abril_trainer_check_attendance_date`, `0013`), no confíes en que el cliente ya validó.
- **Operación compuesta = una RPC, no dos escrituras seguidas.** Asignar un plan cierra la membresía anterior y abre la nueva: va por `abril_trainer_assign_plan` (`0013`, `security invoker`) para que las dos pasen juntas o no pase ninguna. Mismo criterio que `abril_trainer_duplicate_week`.

**REGLA IMPORTANTE — no negociable:** No modificar la estructura de producción ni borrar datos directamente. Cualquier cambio de esquema va por una migración nueva, probada en local primero. Antes de un cambio destructivo (`drop`, `delete` sin filtro, `truncate`, alterar una columna con datos), explicar las consecuencias y pedir confirmación explícita antes de ejecutar.

# Authentication & Authorization

- **Auth**: Supabase Auth, email + contraseña. **El registro público está deshabilitado** — la única cuenta se crea a mano desde el dashboard de Supabase (`supabase/README.md`). No agregues un flujo de sign-up sin que te lo pidan explícitamente.
- **Sesión**: cookies gestionadas por `@supabase/ssr`. `src/middleware.ts` refresca el token en cada request y redirige: sin sesión → `/login?next=<ruta>`; con sesión intentando entrar a `/login` → `/`.
- **En el servidor, siempre `getUser()`, nunca `getSession()`** (`lib/supabase/server.ts`) — `getSession()` confía en la cookie sin validar; `getUser()` valida el token contra Supabase. La cookie es entrada no confiable en el servidor.
- **Dos formas de obtener el usuario actual**, con un motivo cada una:
  - `requireUser()` — lanza si no hay sesión. Solo para **lecturas**, donde `error.tsx` del segmento es la respuesta correcta.
  - `currentUserId()` — devuelve `null`, no lanza. Para **Server Actions**, donde un token vencido a mitad de un formulario tiene que dar un mensaje, no borrar lo que la usuaria escribió.
- **Autorización = RLS**, no chequeos manuales en TypeScript. El código de la app no filtra por `trainer_id`; las políticas de Postgres son la única barrera. Si implementás una funcionalidad nueva que toca datos de otra tabla, verificá que tenga política RLS antes de asumir que está protegida.
- **`SUPABASE_SERVICE_ROLE_KEY` salta toda la RLS.** Solo se usa localmente para scripts de semilla (`scripts/upload-media.ts`). Nunca debe llegar a una variable de entorno de Vercel ni ejecutarse en el navegador.
- **`role` en `abril_trainer_profiles`** ya distingue `trainer`/`student`, preparando el acceso futuro del alumno, pero **hoy solo existe el rol `trainer`** en uso real — no implementes UI para alumnos asumiendo que el acceso ya funciona.

# Important Business Rules

Estas reglas, detectadas en código y comentarios, tienen prioridad sobre cualquier suposición genérica:

- **Un pago no tiene estado propio**: se vuelve "vencido" por el mero paso del tiempo. Guardar un estado exigiría un cron que se rompe, se retrasa o se olvida.
- **`reps`/`load` son prescripción, no registro**: lo que Abril planifica ("8-10", "RPE 8") vive en `abril_trainer_session_exercises` como texto; lo que realmente se hizo vive en `abril_trainer_workout_logs`.
- **No existe `training_weeks` como tabla**: una semana es solo un número (`week_number` en `abril_trainer_training_sessions`). "Duplicar semana" es la RPC `abril_trainer_duplicate_week`.
- **No existe `class_sessions`**: las clases son recurrentes y fijas; las fechas concretas viven en `abril_trainer_attendance.date`. *Pendiente conocido documentado en el propio repo*: cancelar/mover una clase puntual necesitará una tabla `class_exceptions` el día que haga falta — no la agregues preventivamente.
- **Una sola membresía activa por alumno** (constraint único parcial en `abril_trainer_memberships`). El precio de una membresía queda "congelado" al crearla: subir la tarifa del plan no debe alterar membresías vigentes ni el histórico.
- **"Hoy" siempre en zona horaria Argentina** (`America/Argentina/Buenos_Aires`), nunca UTC del servidor — ver Core Principles.
- **El cupo de una clase se hace cumplir en la base** (trigger), no solo en el formulario.
- **`abril_trainer_exercises.id` es `text`, no `uuid`** — son los ids estables del catálogo de GymMane (ej. `EIeI8Vf`), coinciden con el nombre del archivo de media.
- **`abril_trainer_students.notes` es privado de la entrenadora**: el alumno **no** tiene política de `SELECT` sobre `abril_trainer_students`. Su ficha sale de `abril_trainer_my_student_record()` (`0013`, `security definer`), que no devuelve `notes`. Si algún día se amplía lo que el alumno ve, se amplía esa función — no se agrega una política sobre la tabla.

# Feature Development Rules

Al implementar una funcionalidad nueva:

1. Entendé primero el flujo existente — leé el query/action del dominio más parecido antes de escribir código nuevo (ej.: para agregar algo a "clases", mirá cómo está resuelto en "alumnos").
2. Reutilizá los componentes de `components/ui/*` y `components/layout/*` en vez de crear variantes nuevas.
3. Evitá duplicar lógica: si una regla de negocio ya existe en SQL (vista, función, trigger), no la reimplementes en TypeScript salvo un motivo explícito y documentado (como pasa con `payment-status.ts`, que sí duplica la regla de la vista por una razón concreta de PostgREST — está comentado en el archivo).
4. Mantené compatibilidad: no rompas las 18 pantallas existentes ni las políticas RLS ya probadas.
5. Respetá la arquitectura: lecturas en `lib/queries` que lanzan, escrituras en `lib/actions` que devuelven `ActionResult`. No mezcles los dos patrones.
6. Validá con Zod en `lib/schemas.ts`, compartido entre formulario y Server Action.
7. Implementá los tres estados de UI: loading (`SkeletonList` u otro skeleton coherente), vacío (`EmptyState` específico), error (`ErrorNote` o `error.tsx` según corresponda).
8. Probá la funcionalidad manualmente en el flujo real (`npm run dev` + Supabase local) — no hay suite automatizada de UI que lo haga por vos.
9. Revisá regresiones: si tocaste una política RLS o una migración, corré `npm run db:test`. Si tocaste tipos, corré `npm run check`.
10. Al terminar, explicá brevemente qué cambió y qué verificaste — no asumas que el resultado es obvio para quien lea el diff después.

# What NOT To Do

- No agregar dependencias nuevas para resolver algo que ya cubre el stack actual (Zod, react-hook-form, date-fns, lucide-react, los componentes de `ui/`).
- No reescribir un módulo completo cuando alcanza un cambio puntual.
- No cambiar la arquitectura (Server Components/Actions, RLS como única autorización, la carpeta `lib/queries` vs `lib/actions`) sin que se pida explícitamente y se justifique.
- No eliminar funcionalidad existente sin confirmación.
- No hardcodear secrets ni claves en el código.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` en código que corra en cliente o en Vercel.
- No crear un segundo componente que duplique uno ya existente en `components/ui/`.
- No usar datos de prueba/ficticios (`supabase/seed/demo.sql`) como si fueran datos reales, ni referenciarlos como si existieran en producción.
- No hacer cambios destructivos en la base (borrar filas, tablas, columnas con datos) sin explicar las consecuencias y pedir confirmación primero.
- No editar `src/types/database.types.ts` a mano — se regenera.
- No filtrar por `trainer_id` en código de aplicación — es responsabilidad de RLS.
- No asumir que existe un flujo de alumno/portal: el esquema lo prepara, pero no está construido.

# Git Rules

- Revisar `git status`/`git diff` antes de modificar cualquier cosa, para entender qué hay en progreso.
- No sobrescribir trabajo existente sin revisarlo primero.
- No usar `git reset --hard`, `git checkout --`/`restore` sobre cambios sin commitear sin antes hacer `git status` y, si hace falta, `stash`.
- No eliminar branches.
- No hacer `push --force`.
- No crear commits automáticamente salvo que se pida explícitamente.
- Mantener los cambios pequeños y trazables — commits acotados a un propósito, no mezclar refactors con features.

> Nota de este checkout: `abril-trainer/` **no tiene `.git` propio** — el repositorio git más cercano es el directorio home del usuario (`/Users/gaspar`), que contiene múltiples proyectos no relacionados. `git status`/`git diff` ejecutados dentro de `abril-trainer/` van a mostrar rutas del resto del home. Tené esto en cuenta antes de cualquier operación de git: confirmá el repo real con `git rev-parse --show-toplevel` antes de asumir alcance.

# Testing

- **No hay framework de testing de JS/TS configurado** en este proyecto (sin Jest, Vitest, Playwright ni Testing Library en `package.json`). No asumas que existe una suite para correr — si hace falta cobertura automatizada de UI/lógica de cliente, es una decisión nueva a tomar con la usuaria, no algo a inventar sobre la marcha.
- **La única suite de tests real es SQL**: `supabase/tests/rls_test.sql`, 11 aserciones que verifican aislamiento entre entrenadoras y reglas de negocio (cupo, membresía única activa, `abril_trainer_duplicate_week`, etc. — lista completa en `supabase/README.md`). Se corre con `npm run db:test` (requiere `$DB_URL` del stack local) o siguiendo el procedimiento de `supabase/README.md`. El archivo termina en `rollback`: no deja datos.
- **Verificación manual de UI**: correr `npm run dev` + stack de Supabase local (`supabase start` + seeds), loguearse con la cuenta demo y probar el flujo real en el navegador (mobile viewport). No hay atajo automatizado para esto en el repo.
- Antes de dar un cambio por terminado: `npm run check` (typecheck + lint) como mínimo; `npm run db:test` si se tocó esquema o políticas.

# Environment Variables

Solo nombres — nunca completar con valores reales:

| Variable | Alcance | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública (navegador) | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública (navegador) | Viaja al cliente — por eso RLS no es opcional |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo local**, servidor/scripts | Salta toda la RLS. Nunca en Vercel, nunca en el navegador |

Plantilla en `.env.example`; valores reales en `.env.local` (gitignored). No existen otras variables de entorno detectadas en el código.

# Common Pitfalls

- **HMR con caché stale en sesiones largas de `next dev`**: si el dev server lleva mucho tiempo corriendo y se eliminan/renombran exports, puede aparecer `__webpack_modules__[moduleId] is not a function`. Se resuelve matando el proceso y borrando `.next/` antes de reiniciar.
- **`next.config.ts` fija `outputFileTracingRoot`** porque hay un `package-lock.json` suelto en el directorio home del usuario (ver nota de Git Rules) — sin eso, Next deduce mal la raíz del workspace al empaquetar. No borrar esa configuración sin entender por qué está.
- **El middleware tiene que dejar pasar `manifest.json` e `icons/`** o la PWA no instala — el matcher de `src/middleware.ts` ya lo contempla; tenerlo en cuenta si se edita.
- **No meter `await`s entre `createServerClient` y `getUser()`** en `lib/supabase/middleware.ts` — puede dejar la sesión a medio refrescar y provocar deslogueos intermitentes (comentado en el archivo).
- **Un `.eq('trainer_id', …)` en una query nueva es una señal de alerta**, no una protección extra — probablemente falta la política RLS correspondiente en vez de necesitar el filtro en código.
- **PostgREST y embeds a través de vistas**: por eso `payment-status.ts` recalcula el estado en TS en vez de consultar siempre `abril_trainer_payments_with_status` — la vista no garantiza que PostgREST detecte la relación para el embed con `abril_trainer_students`. Ver el comentario en el archivo antes de "simplificar" esto.

# Current State

- **MVP funcional**, 18 pantallas según `supabase/README.md`, validado contra un stack de Supabase real.
- Esquema de base de datos estable: 12 migraciones, 14 tablas, 34 políticas RLS, 11 aserciones de test.
- Biblioteca de ejercicios completa: 361 ejercicios en español con video, migrados desde GymMane (GPL-3.0) y convertidos de GIF a MP4.
- **Identidad de marca recién migrada** (esta misma sesión de trabajo, ver `abril-trainer-marca/`): paleta ink/lima/paper, tipografía de sistema, modo oscuro extrapolado, íconos y favicon regenerados. `globals.css`, `layout.tsx` y los componentes base (`Button`, `Logo`, `Confirm`, `Sheet`) ya reflejan el kit nuevo — no es un trabajo pendiente.
- Acceso de alumno: preparado en esquema/RLS, **no implementado en UI**.
- Sin integración de pagos online, sin CI configurado, sin proyecto de Vercel vinculado en este checkout.

# Instructions for Claude Code

Antes de hacer cualquier cambio:

1. Inspeccioná los archivos relevantes (empezá por `lib/queries/` o `lib/actions/` del dominio afectado, y la migración de esquema correspondiente si toca datos).
2. Entendé el patrón existente — este repo es consistente a propósito; un patrón nuevo sin justificación es peor que copiar el que ya existe.
3. Hacé el cambio más chico que resuelva lo pedido.
4. Corré las verificaciones que correspondan: `npm run check` siempre; `npm run db:test` si tocaste esquema/RLS; probá el flujo en el navegador si tocaste UI.
5. Contá qué cambió y qué verificaste — no des por sentado que es evidente desde el diff.

Ante cualquier cambio destructivo (borrar datos, alterar esquema con datos existentes, force-push, eliminar un branch): explicá las consecuencias primero y pedí confirmación explícita antes de ejecutar.
