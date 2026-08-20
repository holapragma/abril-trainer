# Abril Trainer — base de datos

Esquema, políticas RLS y funciones de Supabase. **14 tablas, 34 políticas.**

Validado contra un stack de Supabase real (`supabase start`): las doce migraciones
aplican limpias en orden, el consolidado aplica de una sola pasada, la app recorre
sus 18 pantallas sin un error, y `tests/rls_test.sql` pasa con 11 aserciones.

```
supabase/
├── schema_completo.sql     ← todo junto, para pegar en el SQL Editor
├── migrations/             ← lo mismo, versionado (es la fuente de verdad)
│   ├── 0001_types.sql          enums + utilidades + trigger de perfil
│   ├── 0002_identity.sql       abril_trainer_profiles, abril_trainer_students
│   ├── 0003_commercial.sql     abril_trainer_plans, abril_trainer_memberships, abril_trainer_payments + vista de estado
│   ├── 0004_exercises.sql      abril_trainer_exercises, abril_trainer_exercise_favorites
│   ├── 0005_planning.sql       abril_trainer_training_blocks, abril_trainer_training_sessions, abril_trainer_session_exercises, abril_trainer_workout_logs
│   ├── 0006_classes.sql        abril_trainer_classes, abril_trainer_class_enrollments, abril_trainer_attendance + cupo
│   ├── 0007_rls_helpers.sql    funciones auxiliares de las políticas
│   ├── 0008_rls_policies.sql   RLS: activación + las 33 políticas
│   ├── 0009_rpc.sql            abril_trainer_duplicate_week, abril_trainer_dashboard_summary
│   ├── 0010_storage.sql        buckets y sus políticas
│   ├── 0011_grants.sql         privilegios de tabla — SIN ESTO NADA FUNCIONA
│   └── 0012_timezone.sql       abril_trainer_app_today(): «hoy» en la zona de la entrenadora
└── tests/
    └── rls_test.sql        aislamiento entre entrenadoras + reglas de negocio
```

---

## Probarlo en local

Levanta Postgres, Auth, PostgREST y Storage reales en Docker. Es la única forma
de verificar lo que un Postgres pelado no cubre: PostgREST, las políticas de
Storage y el flujo de cookies de Auth.

```bash
supabase start                       # puertos 5532x, ver supabase/config.toml
psql "$DB_URL" -f supabase/seed/exercises.sql

# usuario de prueba (dispara el trigger que crea el perfil)
curl -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"abril@demo.local","password":"abril1234","email_confirm":true,
       "user_metadata":{"full_name":"Abril"}}'

psql "$DB_URL" -f supabase/seed/demo.sql   # 5 alumnos, 3 planes, 2 clases, 6 pagos
npm run catalog:upload                     # 361 vídeos a Storage
npm run dev
```

`supabase/seed/demo.sql` **no va a producción**: crea datos ficticios colgando de
la primera entrenadora que encuentre.

---

## Puesta en marcha

### 1. Crear el proyecto

En [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.

- **Región:** São Paulo (`sa-east-1`) — la más cercana a Argentina, y la latencia
  se nota en una app que se usa desde el celular.
- Guardar la contraseña de la base en un gestor: no se puede recuperar.

### 2. Aplicar el esquema

**SQL Editor** → **New query** → pegar el contenido de `schema_completo.sql`
entero → **Run**.

Debe terminar sin errores. Para comprobarlo:

```sql
select count(*) from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r';        -- 14

select count(*) from pg_policies where schemaname = 'public';   -- 34

-- Ninguna tabla sin RLS. Debe venir vacío.
select c.relname from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
```

### 3. Crear la cuenta de Abril

**Authentication → Users → Add user → Create new user**. Email y contraseña.
Marcar **Auto Confirm User**.

El trigger `abril_trainer_on_auth_user_created` le crea el perfil solo. Verificar:

```sql
select id, full_name, role from abril_trainer_profiles;
```

**No habilitar el registro público.** En **Authentication → Sign In / Providers**,
desactivar *Allow new users to sign up*. La única cuenta se crea a mano.

### 4. Revisar el linter de seguridad

**Advisors → Security Advisor**. Debe estar limpio. Busca justo lo que más duele:
tablas sin RLS, funciones con `search_path` mutable, vistas sin `security_invoker`.

### 5. Anotar las claves

**Settings → API**:

| Clave | Dónde va |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / publishable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` | **Solo en tu máquina**, para el script de semilla. Nunca en Vercel, nunca en el navegador. |

> La `service_role` **salta toda la RLS**. Si acaba en una variable de Vercel, un
> error en cualquier ruta de API la expone y se cae la seguridad entera del
> proyecto.

---

## Correr los tests de RLS

Una política mal escrita **no falla ruidosamente**: devuelve filas que no debería.
Por eso estos tests existen y se corren después de cada cambio en las políticas.

Contra el stack local (recomendado):

```bash
supabase start
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/tests/rls_test.sql
```

El archivo termina en `rollback`, así que no deja nada. **Cualquier línea que
imprima `FALLO` es un agujero de seguridad**, no un test flojo.

Qué cubre:

| # | Verificación |
|---|---|
| 1 | La entrenadora B no ve **ninguna** fila de A, en las 12 tablas con datos |
| 1b | Pero sí ve el catálogo global de ejercicios |
| 2 | B no puede modificar ni borrar datos de A |
| 2b | B no puede duplicar una semana de un bloque de A |
| 2c | `abril_trainer_dashboard_summary` de B viene en cero |
| 3c | `WITH CHECK`: A no puede crear registros a nombre de B |
| 4 | `abril_trainer_duplicate_week` copia sesiones y ejercicios conservando `reps` y `load` |
| 4b | No se puede duplicar sobre una semana ya ocupada |
| 4c | El cupo de clase se hace cumplir en la base |
| 4d | Una sola membresía activa por alumno |
| 4e | No se borra un ejercicio que está en una planificación |
| 4f | Nadie puede borrar el catálogo global |
| 4g | Una sola marca de asistencia por clase, alumno y fecha |
| 5 | Ninguna tabla del esquema `public` sin RLS |

---

## Notas de diseño

Las razones completas están en `docs/ABRIL_ARCHITECTURE.md` del repo principal.
Lo que más sorprende al leer el esquema:

**`abril_trainer_payments` no tiene columna de estado.** Un pago pendiente se vuelve vencido por
el mero paso del tiempo. Guardarlo exigiría un cron que se rompe, se retrasa o se
olvida — y entonces el dashboard miente. Se deriva en la vista
`abril_trainer_payments_with_status`, que siempre está bien.

**Esa vista lleva `security_invoker = true`, y no es opcional.** Por defecto una
vista de Postgres corre con los permisos de quien la creó, lo que **saltaría la
RLS** y expondría los pagos de todas las alumnas a cualquier usuario autenticado.
Es el error de seguridad más común en proyectos Supabase.

**`abril_trainer_session_exercises.reps` y `.load` son texto, no números.** Esto es una
*prescripción*: Abril escribe «8-10», «AMRAP», «al 70%», «RPE 8», «peso corporal».
Un `integer` la haría pelear con el formulario todos los días. Los números viven en
`abril_trainer_workout_logs`, que registra lo que realmente se hizo.

**No existe `training_weeks`.** Una semana no tiene atributos propios: es un
número. `week_number` en `abril_trainer_training_sessions` ahorra una tabla y un join en la
consulta más frecuente, y convierte «duplicar semana» en una sola operación.

**No existe `class_sessions`.** Las clases son recurrentes y fijas. Materializar
cada ocurrencia obligaría a un job que genere filas futuras, para grupos de 4-6
personas. Las fechas concretas viven en `abril_trainer_attendance.date`.
*Pendiente conocido:* cancelar o mover una clase puntual necesitará una tabla
`class_exceptions(class_id, date, reason)` el día que haga falta.

**GRANT y RLS son cosas distintas, y hacen falta las dos.** `GRANT` decide a qué
tablas llega un rol; RLS decide qué filas ve dentro. Las tablas creadas por
migración no heredan los privilegios por defecto de Supabase, así que sin la
migración 0011 toda consulta devuelve 42501 —«permission denied»— antes de que
RLS llegue siquiera a evaluarse, por perfectas que sean las políticas.

**Ninguna consulta usa `current_date`: usan `abril_trainer_app_today()`.** Postgres y Vercel
corren en UTC; Abril está en UTC−3. Entre las 21:00 y medianoche hora argentina el
servidor ya cree que es mañana, y la asistencia de la clase de las 19:00 marcada a
las 21:30 se archivaba con la fecha equivocada. Su equivalente en el cliente es
`src/lib/today.ts`; las dos caras tienen que coincidir.

**`abril_trainer_exercises.id` es `text`, no `uuid`.** Los ids del catálogo de GymMane
(`EIeI8Vf`) ya son estables y coinciden con el nombre del archivo de media: la
semilla queda idempotente y la URL se deriva del id sin columna extra.

**`abril_trainer_dashboard_summary` no filtra por `trainer_id` en ninguna parte.** Con
`security invoker`, la RLS ya filtró cada tabla. Repetir el filtro duplicaría la
fuente de verdad.

**Las funciones auxiliares de RLS son `security definer` a propósito**: su consulta
interna no vuelve a pasar por RLS, que es lo que evita la recursión infinita cuando
una política de `abril_trainer_students` necesita consultar `abril_trainer_students`.

---

## Al cambiar el esquema

1. Nueva migración numerada en `migrations/`. **Nunca tocar el esquema desde el
   panel web:** lo que no está en una migración no existe, porque no se puede
   reconstruir ni revisar en un diff.
2. `supabase db reset` en local y correr `tests/rls_test.sql`.
3. Regenerar los tipos y commitearlos junto a la migración:
   ```bash
   supabase gen types typescript --local > ../src/types/database.types.ts
   ```
4. Regenerar el consolidado (sobrescribe, no agrega):
   ```bash
   cd supabase && {
     echo "-- Abril Trainer — esquema completo (generado desde migrations/)"
     for f in migrations/0*.sql; do
       printf '\n-- %s\n\n' "$(basename "$f")"; cat "$f"
     done
   } > schema_completo.sql
   ```
5. `supabase db push` a producción, y revisar el Security Advisor.
