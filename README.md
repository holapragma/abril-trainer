# Abril Trainer

Aplicación web para gestionar alumnos, planificación de entrenamientos, clases,
asistencia y pagos. Pensada para una entrenadora con grupos chicos.

**Next.js 15 · React 19 · TypeScript · Tailwind v4 · Supabase · Vercel**

Mobile-first y online. Se instala como PWA en la pantalla de inicio.

---

## Arranque

```bash
npm install
cp .env.example .env.local     # y rellenar con las claves de Supabase
npm run dev
```

Antes hace falta el proyecto de Supabase: los pasos están en
[`supabase/README.md`](supabase/README.md).

### Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=        # pública
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # pública — por eso RLS no es opcional
SUPABASE_SERVICE_ROLE_KEY=       # SOLO local, para los scripts de semilla
```

> La `service_role` **salta toda la RLS**. Nunca en Vercel, nunca en el navegador.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run check` | `tsc --noEmit` + eslint |
| `npm run db:types` | Regenera `src/types/database.types.ts` desde la base |
| `npm run db:test` | Corre los tests de RLS (requiere `$DB_URL`) |
| `npm run catalog:extract` | Extrae los 361 ejercicios de GymMane → SQL |
| `npm run catalog:media` | Convierte los GIFs a MP4 |
| `npm run catalog:upload` | Sube la media a Supabase Storage |

---

## Estructura

```
src/
├── app/
│   ├── (auth)/login/                     login
│   └── (app)/                            shell + nav inferior de 4 pestañas
│       ├── page.tsx                      dashboard
│       ├── alumnos/[id]/                 resumen · entrenamiento · asistencia · pagos
│       ├── clases/[classId]/asistencia/  pasar lista
│       ├── pagos/ · planes/ · ejercicios/ · ajustes/
├── components/
│   ├── ui/                               kit propio: Button, Card, Field, Sheet…
│   └── layout/                           PageHeader, BottomNav
├── lib/
│   ├── supabase/                         client · server · middleware
│   ├── queries/                          lecturas (Server Components)
│   ├── actions/                          escrituras (Server Actions)
│   ├── schemas.ts                        zod, compartido form ↔ action
│   └── constants.ts · format.ts
└── types/
    ├── database.types.ts                 GENERADO — no editar a mano
    └── domain.ts

supabase/       migraciones, RLS, seed y tests   → ver supabase/README.md
scripts/        extracción del catálogo, media, iconos
```

---

## Decisiones que sorprenden al leer el código

**Cuatro pestañas, no cinco.** «Entrenamientos» no está en la navegación
principal: una planificación siempre pertenece a un alumno y se entra por su
ficha. Una pestaña de nivel superior tendría que inventarse contenido que nadie
pidió.

**El servidor lee, el servidor escribe.** Las lecturas van en Server Components,
las escrituras en Server Actions. No hay librería de data fetching ni estado de
servidor duplicado en el cliente. `useOptimistic` cubre lo poco que necesita
respuesta inmediata: pasar lista y reordenar ejercicios.

**Nunca se filtra por `trainer_id` en el código.** Lo hace RLS. Si aparece un
`.eq('trainer_id', …)` en una query, es señal de que falta una política.

**`reps` y `load` son texto, no números.** Es una *prescripción*: Abril escribe
«8-10», «AMRAP», «al 70%», «RPE 8», «peso corporal». Un `integer` la obligaría a
pelear con el formulario todos los días. Los números viven en `abril_trainer_workout_logs`,
que registra lo que realmente se hizo.

**Los pagos no tienen columna de estado.** Un pendiente se vuelve vencido por el
mero paso del tiempo; guardarlo exigiría un cron que se rompe, se retrasa o se
olvida. Se deriva en la vista `abril_trainer_payments_with_status`.

**Reordenar con flechas, no arrastrando.** Arrastrar dentro de una lista que hace
scroll, en un navegador móvil, es frágil y poco accesible. Las flechas siempre
funcionan.

**Las lecturas lanzan, las escrituras devuelven un resultado.** Un error al
guardar tiene que aparecer junto al botón, no en una pantalla de error que le
borre a Abril lo que acababa de escribir.

**«Hoy» se calcula en la zona de Abril, nunca en la del servidor.** Vercel corre
en UTC y ella está en UTC−3: entre las 21:00 y medianoche el servidor ya cree que
es mañana. Sin esto, pasar lista después de la clase de las 19:00 archivaba la
asistencia con la fecha equivocada. `src/lib/today.ts` en el cliente y
`abril_trainer_app_today()` en SQL — las dos caras tienen que coincidir.

**GRANT y RLS son dos cosas distintas y hacen falta las dos.** `GRANT` decide a
qué tablas llega un rol; RLS, qué filas ve dentro. Sin los grants de la migración
0011, toda consulta devuelve 42501 antes de que RLS llegue a evaluarse.

**Los mensajes de error son para Abril, no para el log.** «No se pudo crear el
alumno», no `duplicate key value violates unique constraint`.

---

## Reglas móviles

- Objetivo táctil mínimo **44 px**, sin excepciones.
- Inputs a `font-size: 16px` — por debajo, iOS hace zoom al enfocarlos.
- `inputMode` correcto en cada campo: `numeric` para importes, `tel` para teléfonos.
- Un formulario, una columna. El alta de alumno va en dos pasos y se puede
  guardar con solo el primero.
- Nada de `hover` como única señal: en un teléfono no existe.

---

## La biblioteca de ejercicios

361 ejercicios en español con animación, extraídos de
[GymMane](https://github.com/InlitX/GymMane) (GPL-3.0) y convertidos de GIF a
MP4: **34 MB → 3,5 MB**, un orden de magnitud menos con mejor calidad de imagen.
En una app que se abre con 4G de gimnasio, eso se nota.

```bash
npm run catalog:extract   # exercise_catalog.dart → supabase/seed/exercises.sql
npm run catalog:media     # assets/gifs/*.gif → media/catalog/*.mp4
npm run catalog:upload    # media/catalog/ → Supabase Storage
```

La extracción verifica los 361 registros: nombre en español, pasos, archivo de
media asociado y músculo dentro del vocabulario. Si algo no cuadra, falla.

---

## Fuera del MVP, a propósito

Mercado Pago · facturación electrónica · IA · acceso del alumno · registro de
entrenamientos por el alumno · offline-first · notificaciones push · chat ·
exportar a PDF · multi-gimnasio · informes · reservas de cupo · apps nativas.

El esquema y las políticas RLS ya contemplan el acceso del alumno
(`abril_trainer_students.user_id` y sus políticas de lectura), así que abrirlo más adelante no
va a exigir migrar datos ni cambiar el esquema.

---

## Documentación

- [`supabase/README.md`](supabase/README.md) — base de datos, RLS y puesta en marcha
- `docs/ABRIL_MIGRATION_PLAN.md` (repo GymMane) — auditoría y mapa de reutilización
- `docs/ABRIL_ARCHITECTURE.md` (repo GymMane) — arquitectura completa
