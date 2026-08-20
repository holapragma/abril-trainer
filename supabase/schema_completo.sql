-- Abril Trainer — esquema completo (generado desde migrations/)

-- 0001_types.sql

-- 0001_types.sql
-- Tipos del dominio y funciones utilitarias.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

create type abril_trainer_user_role         as enum ('trainer', 'student');
create type abril_trainer_modality          as enum ('presencial', 'virtual');
create type abril_trainer_student_status    as enum ('activo', 'pausa', 'baja');
create type abril_trainer_membership_status as enum ('activa', 'pausada', 'finalizada');
create type abril_trainer_attendance_status as enum ('presente', 'ausente', 'justificado');
create type abril_trainer_block_status      as enum ('borrador', 'activo', 'terminado');

-- No existe payment_status: el estado de un pago se deriva de paid_at y
-- due_date. Ver la vista abril_trainer_payments_with_status en 0003.

-- ─────────────────────────────────────────────────────────────────────────────
-- Utilidades
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function abril_trainer_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Crea el perfil automáticamente cuando se da de alta un usuario en auth.users.
-- security definer porque el trigger corre en el contexto de auth, que no tiene
-- permiso de escritura sobre public.abril_trainer_profiles.
create or replace function abril_trainer_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.abril_trainer_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce((new.raw_user_meta_data ->> 'role')::abril_trainer_user_role, 'trainer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 0002_identity.sql

-- 0002_identity.sql
-- Identidad (entrenadora) y personas (alumnos).

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_profiles — 1:1 con auth.users
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          abril_trainer_user_role   not null default 'trainer',
  full_name     text        not null,
  photo_url     text,
  phone         text,
  business_name text,
  created_at    timestamptz not null default now()
);

comment on table abril_trainer_profiles is
  'Perfil de la persona autenticada. Hoy solo la entrenadora; role prepara el acceso del alumno.';

-- El trigger vive en auth.users, así que se crea después de que exista abril_trainer_profiles.
create trigger abril_trainer_on_auth_user_created
  after insert on auth.users
  for each row execute function abril_trainer_handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_students
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_students (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references abril_trainer_profiles(id) on delete cascade,
  user_id     uuid unique references auth.users(id) on delete set null,

  first_name  text not null,
  last_name   text not null,
  photo_url   text,
  phone       text,
  email       text,
  birthdate   date,
  goal        text,

  modality    abril_trainer_modality       not null default 'presencial',
  status      abril_trainer_student_status not null default 'activo',
  joined_at   date           not null default current_date,
  notes       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column abril_trainer_students.user_id is
  'NULL mientras el alumno no tenga cuenta. Al invitarlo se rellena y hereda todo su historial sin migrar nada.';
comment on column abril_trainer_students.notes is
  'PRIVADO de la entrenadora. Nunca debe exponerse al alumno: cuando exista su acceso se le sirve una vista sin esta columna.';

create trigger abril_trainer_students_updated_at
  before update on abril_trainer_students
  for each row execute function abril_trainer_set_updated_at();

create index abril_trainer_students_trainer_status_idx on abril_trainer_students (trainer_id, status);
create index abril_trainer_students_user_idx           on abril_trainer_students (user_id) where user_id is not null;
create index abril_trainer_students_name_idx           on abril_trainer_students
  using gin (to_tsvector('spanish', first_name || ' ' || last_name));

-- 0003_commercial.sql

-- 0003_commercial.sql
-- Planes, membresías y pagos.

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_plans — catálogo comercial de la entrenadora
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_plans (
  id                uuid primary key default gen_random_uuid(),
  trainer_id        uuid not null references abril_trainer_profiles(id) on delete cascade,
  name              text not null,
  description       text,
  modality          abril_trainer_modality,
  sessions_per_week smallint check (sessions_per_week between 1 and 14),
  price             numeric(10,2) not null default 0 check (price >= 0),
  currency          text          not null default 'ARS',
  duration_weeks    smallint check (duration_weeks between 1 and 104),
  active            boolean       not null default true,
  created_at        timestamptz   not null default now()
);

comment on column abril_trainer_plans.modality is       'NULL = el plan sirve para presencial y virtual.';
comment on column abril_trainer_plans.duration_weeks is 'NULL = sin plazo (mensual recurrente).';

create index abril_trainer_plans_trainer_idx on abril_trainer_plans (trainer_id) where active;

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_memberships — la asignación de un plan a un alumno
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_memberships (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references abril_trainer_students(id) on delete cascade,
  plan_id    uuid not null references abril_trainer_plans(id)    on delete restrict,
  starts_on  date not null default current_date,
  ends_on    date,
  price      numeric(10,2)     not null check (price >= 0),
  status     abril_trainer_membership_status not null default 'activa',
  created_at timestamptz       not null default now(),

  constraint abril_trainer_memberships_dates_ck check (ends_on is null or ends_on >= starts_on)
);

comment on column abril_trainer_memberships.price is
  'Precio pactado con este alumno, congelado. Subir la tarifa del plan no debe cambiar membresías vigentes ni descuadrar el histórico.';

create index abril_trainer_memberships_student_idx on abril_trainer_memberships (student_id, status);

-- Una sola membresía activa por alumno. Restricción deliberada que simplifica
-- pagos y ficha; si algún día se venden dos planes a la misma persona, se borra.
create unique index abril_trainer_memberships_one_active_idx
  on abril_trainer_memberships (student_id) where status = 'activa';

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_payments
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_payments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references abril_trainer_students(id) on delete cascade,
  membership_id uuid references abril_trainer_memberships(id) on delete set null,
  amount        numeric(10,2) not null check (amount >= 0),
  currency      text          not null default 'ARS',
  due_date      date          not null,
  paid_at       timestamptz,
  method        text,
  note          text,
  created_at    timestamptz   not null default now()
);

comment on table abril_trainer_payments is
  'Sin columna de estado: se deriva de paid_at y due_date. Guardarlo exigiría un cron que se rompe, se retrasa o se olvida, y entonces el dashboard miente.';

create index abril_trainer_payments_student_idx on abril_trainer_payments (student_id, due_date desc);
create index abril_trainer_payments_pending_idx on abril_trainer_payments (due_date) where paid_at is null;

-- El estado calculado, para no repetir el CASE en cada consulta.
--
-- security_invoker = true NO ES OPCIONAL: por defecto una vista corre con los
-- permisos de quien la creó, lo que saltaría la RLS de abril_trainer_payments y expondría los
-- pagos de todas las alumnas a cualquier usuario autenticado.
create view abril_trainer_payments_with_status
with (security_invoker = true)
as
select
  p.*,
  case
    when p.paid_at  is not null      then 'pagado'
    when p.due_date <  current_date  then 'vencido'
    else 'pendiente'
  end as status
from abril_trainer_payments p;

-- 0004_exercises.sql

-- 0004_exercises.sql
-- Biblioteca de ejercicios: catálogo global + ejercicios propios.

create table abril_trainer_exercises (
  id                text primary key,
  owner_id          uuid references abril_trainer_profiles(id) on delete cascade,

  name              text   not null,
  primary_muscle    text   not null,
  secondary_muscles text[] not null default '{}',
  equipment         text   not null default 'Otro',
  difficulty        text   not null default 'Principiante',
  media_url         text,
  steps             text[] not null default '{}',

  created_at        timestamptz not null default now()
);

comment on table abril_trainer_exercises is
  'Una sola tabla para catálogo y ejercicios propios: evita el UNION en cada búsqueda y permite que abril_trainer_session_exercises.exercise_id tenga una FK limpia.';
comment on column abril_trainer_exercises.id is
  'text, no uuid: los ids del catálogo de GymMane (EIeI8Vf…) ya son estables y coinciden con el nombre del archivo de media. Los propios usan ''c_'' || gen_random_uuid().';
comment on column abril_trainer_exercises.owner_id is
  'NULL = catálogo global (los 361 de GymMane). No NULL = ejercicio propio de esa entrenadora.';
comment on column abril_trainer_exercises.primary_muscle is
  'text, no enum: el vocabulario canónico vive en src/lib/constants.ts y lo valida el formulario con zod. Deja libertad para categorías nuevas sin migración.';

create index abril_trainer_exercises_owner_idx  on abril_trainer_exercises (owner_id);
create index abril_trainer_exercises_muscle_idx on abril_trainer_exercises (primary_muscle);
create index abril_trainer_exercises_search_idx on abril_trainer_exercises using gin (to_tsvector('spanish', name));

-- ─────────────────────────────────────────────────────────────────────────────
-- Favoritos de la entrenadora
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_exercise_favorites (
  trainer_id  uuid not null references abril_trainer_profiles(id)  on delete cascade,
  exercise_id text not null references abril_trainer_exercises(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (trainer_id, exercise_id)
);

create index abril_trainer_exercise_favorites_trainer_idx on abril_trainer_exercise_favorites (trainer_id);

-- 0005_planning.sql

-- 0005_planning.sql
-- Planificación: bloque → semana → sesión → ejercicio, y registro de lo hecho.

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_training_blocks
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_training_blocks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references abril_trainer_students(id) on delete cascade,
  name        text not null,
  goal        text,
  starts_on   date     not null default current_date,
  total_weeks smallint not null default 4 check (total_weeks between 1 and 52),
  status      abril_trainer_block_status not null default 'activo',
  created_at  timestamptz  not null default now()
);

comment on table abril_trainer_training_blocks is
  'Resuelve las duraciones distintas: presencial total_weeks 1-2, virtual 4-6. Renovar la planificación es crear el bloque siguiente, con el anterior intacto como historial.';

create index abril_trainer_blocks_student_idx on abril_trainer_training_blocks (student_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_training_sessions
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_training_sessions (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid     not null references abril_trainer_training_blocks(id) on delete cascade,
  week_number smallint not null check (week_number >= 1),
  day_label   text     not null,
  name        text,
  order_index smallint not null default 0,
  notes       text
);

comment on table abril_trainer_training_sessions is
  'No existe tabla training_weeks: una semana no tiene atributos propios, es un número. week_number acá ahorra una tabla y un join en la consulta más frecuente de la app.';
comment on column abril_trainer_training_sessions.day_label is
  'Etiqueta libre de la entrenadora: ''A'', ''B'', ''Lunes'', ''Empuje''…';

create index abril_trainer_sessions_block_week_idx on abril_trainer_training_sessions (block_id, week_number, order_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_session_exercises — la prescripción
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_session_exercises (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references abril_trainer_training_sessions(id) on delete cascade,
  exercise_id  text not null references abril_trainer_exercises(id) on delete restrict,
  order_index  smallint not null default 0,

  sets         smallint check (sets between 1 and 50),
  reps         text,
  load         text,
  time_seconds smallint,
  rest_seconds smallint,
  tempo        text,
  notes        text
);

comment on column abril_trainer_session_exercises.reps is
  'TEXTO, no entero: esto es una prescripción. La entrenadora escribe ''8-10'', ''AMRAP'', ''máximas''. Los números viven en abril_trainer_workout_logs, que registra lo que se hizo.';
comment on column abril_trainer_session_exercises.load is
  'TEXTO: ''40kg'', ''70%'', ''RPE 8'', ''corporal''. Misma razón que reps.';
comment on column abril_trainer_session_exercises.exercise_id is
  'on delete restrict: borrar un ejercicio no puede vaciar en silencio las planificaciones que lo usan.';

create index abril_trainer_session_exercises_idx on abril_trainer_session_exercises (session_id, order_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_workout_logs — el registro (post-MVP en su mayor parte)
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_workout_logs (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid references abril_trainer_training_sessions(id) on delete set null,
  student_id       uuid not null references abril_trainer_students(id) on delete cascade,
  performed_at     timestamptz not null default now(),
  payload          jsonb not null default '{}',
  duration_seconds int,
  notes            text
);

comment on column abril_trainer_workout_logs.payload is
  'Series realizadas, sin esquema rígido todavía: {"abril_trainer_exercises":[{"exercise_id":"EIeI8Vf","sets":[{"reps":10,"weight":40}]}]}. Existe desde ahora para que el acceso del alumno no exija cambiar el esquema.';

create index abril_trainer_logs_student_idx on abril_trainer_workout_logs (student_id, performed_at desc);

-- 0006_classes.sql

-- 0006_classes.sql
-- Clases recurrentes, inscripciones y asistencia.

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_classes
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_classes (
  id               uuid primary key default gen_random_uuid(),
  trainer_id       uuid not null references abril_trainer_profiles(id) on delete cascade,
  name             text not null,
  weekday          smallint not null check (weekday between 1 and 7),
  start_time       time     not null,
  duration_minutes smallint not null default 60 check (duration_minutes > 0),
  capacity         smallint not null default 6  check (capacity > 0),
  active           boolean  not null default true,
  created_at       timestamptz not null default now()
);

comment on table abril_trainer_classes is
  'Plantilla recurrente, no ocurrencia. No existe class_sessions: las fechas concretas se calculan desde weekday + start_time y viven en abril_trainer_attendance.date.';
comment on column abril_trainer_classes.weekday is 'ISO 8601: 1 = lunes … 7 = domingo.';

create index abril_trainer_classes_trainer_idx on abril_trainer_classes (trainer_id, weekday, start_time);

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_class_enrollments — el roster fijo de cada clase
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_class_enrollments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references abril_trainer_classes(id)  on delete cascade,
  student_id uuid not null references abril_trainer_students(id) on delete cascade,
  joined_at  date not null default current_date,
  unique (class_id, student_id)
);

create index abril_trainer_enrollments_student_idx on abril_trainer_class_enrollments (student_id);

-- El cupo se hace cumplir en la base, no solo en el formulario.
create or replace function abril_trainer_check_class_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity smallint;
  v_count    bigint;
begin
  select capacity into v_capacity from abril_trainer_classes where id = new.class_id;
  select count(*) into v_count    from abril_trainer_class_enrollments where class_id = new.class_id;

  if v_count >= v_capacity then
    raise exception 'La clase ya está completa (% de % lugares)', v_count, v_capacity
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger abril_trainer_enforce_class_capacity
  before insert on abril_trainer_class_enrollments
  for each row execute function abril_trainer_check_class_capacity();

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_attendance
-- ─────────────────────────────────────────────────────────────────────────────

create table abril_trainer_attendance (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references abril_trainer_classes(id)  on delete cascade,
  student_id uuid not null references abril_trainer_students(id) on delete cascade,
  date       date not null,
  status     abril_trainer_attendance_status not null,
  created_at timestamptz not null default now(),
  unique (class_id, student_id, date)
);

create index abril_trainer_attendance_class_date_idx   on abril_trainer_attendance (class_id, date);
create index abril_trainer_attendance_student_date_idx on abril_trainer_attendance (student_id, date desc);

-- 0007_rls_helpers.sql

-- 0007_rls_helpers.sql
-- Funciones auxiliares para las políticas RLS.
--
-- Son security definer a propósito: la consulta interna NO vuelve a pasar por
-- RLS, que es justo lo que se necesita cuando una política de abril_trainer_students tendría
-- que consultar abril_trainer_students. Sin esto habría recursión infinita.
--
-- set search_path = public es obligatorio en toda función security definer: sin
-- él, un search_path manipulado puede desviar la función a tablas falsas.
-- El linter de Supabase (get_advisors) lo marca como vulnerabilidad.

-- ¿Este alumno es de la entrenadora autenticada?
create or replace function abril_trainer_owns_student(sid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from abril_trainer_students
    where id = sid and trainer_id = auth.uid()
  );
$$;

-- ¿Esta clase es de la entrenadora autenticada?
create or replace function abril_trainer_owns_class(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from abril_trainer_classes
    where id = cid and trainer_id = auth.uid()
  );
$$;

-- ¿Esta sesión de entrenamiento cuelga de un alumno de la entrenadora autenticada?
create or replace function abril_trainer_owns_training_session(tsid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from abril_trainer_training_sessions ts
    join abril_trainer_training_blocks   b on b.id = ts.block_id
    join abril_trainer_students          s on s.id = b.student_id
    where ts.id = tsid and s.trainer_id = auth.uid()
  );
$$;

-- ¿Esta ficha de alumno es la del usuario autenticado?
-- Para el acceso del alumno. Hoy no devuelve nada porque abril_trainer_students.user_id es
-- NULL en todas las filas, pero las políticas que la usan quedan escritas ya:
-- retrofitear RLS sobre datos en producción es de lo más doloroso que hay.
create or replace function abril_trainer_is_my_student_record(sid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from abril_trainer_students
    where id = sid and user_id = auth.uid()
  );
$$;

-- 0008_rls_policies.sql

-- 0008_rls_policies.sql
-- Row Level Security. Se aplica ANTES de cargar un solo dato.
--
-- La clave anónima de Supabase viaja en el JavaScript del navegador y es
-- pública por diseño. RLS es lo único que separa esa clave de la base de datos
-- entera. Una tabla sin RLS, aunque sea cinco minutos, es una tabla abierta.
--
-- Las políticas permisivas se combinan con OR, así que la de la entrenadora y
-- la del alumno conviven sin interferir.

alter table abril_trainer_profiles           enable row level security;
alter table abril_trainer_students           enable row level security;
alter table abril_trainer_plans              enable row level security;
alter table abril_trainer_memberships        enable row level security;
alter table abril_trainer_payments           enable row level security;
alter table abril_trainer_exercises          enable row level security;
alter table abril_trainer_exercise_favorites enable row level security;
alter table abril_trainer_training_blocks    enable row level security;
alter table abril_trainer_training_sessions  enable row level security;
alter table abril_trainer_session_exercises  enable row level security;
alter table abril_trainer_workout_logs       enable row level security;
alter table abril_trainer_classes            enable row level security;
alter table abril_trainer_class_enrollments  enable row level security;
alter table abril_trainer_attendance         enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_profiles
-- ─────────────────────────────────────────────────────────────────────────────

create policy "propio perfil: lectura" on abril_trainer_profiles
  for select to authenticated
  using (id = auth.uid());

create policy "propio perfil: escritura" on abril_trainer_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Normalmente el perfil lo crea el trigger abril_trainer_on_auth_user_created, que es
-- security definer y no pasa por RLS. Esta política es la vía de recuperación:
-- si el usuario se creó ANTES de aplicar el esquema, el trigger no existía y la
-- fila falta. Sin esto no habría forma de repararlo desde la app.
create policy "propio perfil: alta" on abril_trainer_profiles
  for insert to authenticated
  with check (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_students
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sus alumnos" on abril_trainer_students
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- El alumno LEE su ficha, nunca la escribe. La columna notes es privada de la
-- entrenadora: cuando exista el acceso del alumno se le sirve una vista sin ella.
create policy "alumno lee su ficha" on abril_trainer_students
  for select to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_plans
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sus planes" on abril_trainer_plans
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_memberships
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona membresías" on abril_trainer_memberships
  for all to authenticated
  using (abril_trainer_owns_student(student_id))
  with check (abril_trainer_owns_student(student_id));

create policy "alumno lee su membresía" on abril_trainer_memberships
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_payments
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona pagos" on abril_trainer_payments
  for all to authenticated
  using (abril_trainer_owns_student(student_id))
  with check (abril_trainer_owns_student(student_id));

create policy "alumno lee sus pagos" on abril_trainer_payments
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_exercises
-- ─────────────────────────────────────────────────────────────────────────────

create policy "catálogo global: lectura" on abril_trainer_exercises
  for select to authenticated
  using (owner_id is null);

create policy "propios: lectura" on abril_trainer_exercises
  for select to authenticated
  using (owner_id = auth.uid());

create policy "propios: alta" on abril_trainer_exercises
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "propios: edición" on abril_trainer_exercises
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "propios: baja" on abril_trainer_exercises
  for delete to authenticated
  using (owner_id = auth.uid());

create policy "alumno lee los de su entrenadora" on abril_trainer_exercises
  for select to authenticated
  using (exists (
    select 1 from abril_trainer_students s
    where s.user_id = auth.uid() and s.trainer_id = abril_trainer_exercises.owner_id
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_exercise_favorites
-- ─────────────────────────────────────────────────────────────────────────────

create policy "favoritos propios" on abril_trainer_exercise_favorites
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_training_blocks
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona bloques" on abril_trainer_training_blocks
  for all to authenticated
  using (abril_trainer_owns_student(student_id))
  with check (abril_trainer_owns_student(student_id));

create policy "alumno lee sus bloques" on abril_trainer_training_blocks
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_training_sessions
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sesiones" on abril_trainer_training_sessions
  for all to authenticated
  using (exists (
    select 1 from abril_trainer_training_blocks b
    where b.id = abril_trainer_training_sessions.block_id and abril_trainer_owns_student(b.student_id)
  ))
  with check (exists (
    select 1 from abril_trainer_training_blocks b
    where b.id = abril_trainer_training_sessions.block_id and abril_trainer_owns_student(b.student_id)
  ));

create policy "alumno lee sus sesiones" on abril_trainer_training_sessions
  for select to authenticated
  using (exists (
    select 1 from abril_trainer_training_blocks b
    where b.id = abril_trainer_training_sessions.block_id and abril_trainer_is_my_student_record(b.student_id)
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_session_exercises
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona ejercicios de sesión" on abril_trainer_session_exercises
  for all to authenticated
  using (abril_trainer_owns_training_session(session_id))
  with check (abril_trainer_owns_training_session(session_id));

create policy "alumno lee ejercicios de su sesión" on abril_trainer_session_exercises
  for select to authenticated
  using (exists (
    select 1
    from abril_trainer_training_sessions ts
    join abril_trainer_training_blocks   b on b.id = ts.block_id
    where ts.id = abril_trainer_session_exercises.session_id and abril_trainer_is_my_student_record(b.student_id)
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_workout_logs — única tabla donde el alumno escribe
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora lee registros" on abril_trainer_workout_logs
  for select to authenticated
  using (abril_trainer_owns_student(student_id));

create policy "entrenadora crea registros" on abril_trainer_workout_logs
  for insert to authenticated
  with check (abril_trainer_owns_student(student_id));

create policy "entrenadora edita registros" on abril_trainer_workout_logs
  for update to authenticated
  using (abril_trainer_owns_student(student_id))
  with check (abril_trainer_owns_student(student_id));

create policy "entrenadora borra registros" on abril_trainer_workout_logs
  for delete to authenticated
  using (abril_trainer_owns_student(student_id));

create policy "alumno gestiona sus registros" on abril_trainer_workout_logs
  for all to authenticated
  using (abril_trainer_is_my_student_record(student_id))
  with check (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_classes
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona clases" on abril_trainer_classes
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "alumno lee clases donde está inscrito" on abril_trainer_classes
  for select to authenticated
  using (exists (
    select 1
    from abril_trainer_class_enrollments e
    join abril_trainer_students s on s.id = e.student_id
    where e.class_id = abril_trainer_classes.id and s.user_id = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_class_enrollments
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona inscripciones" on abril_trainer_class_enrollments
  for all to authenticated
  using (abril_trainer_owns_class(class_id))
  with check (abril_trainer_owns_class(class_id));

-- Solo su propia inscripción: un alumno no ve con quién más entrena.
create policy "alumno lee su inscripción" on abril_trainer_class_enrollments
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_attendance
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona asistencia" on abril_trainer_attendance
  for all to authenticated
  using (abril_trainer_owns_class(class_id))
  with check (abril_trainer_owns_class(class_id));

create policy "alumno lee su asistencia" on abril_trainer_attendance
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- 0009_rpc.sql

-- 0009_rpc.sql
-- Las dos únicas funciones RPC. Todo lo demás son consultas normales.

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_duplicate_week — la operación estrella de la planificación
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Copia todas las sesiones de una semana y sus ejercicios a otra semana,
-- atómicamente. Es lo que convierte «armar 6 semanas» en «armar 1 y ajustar 5».
--
-- security invoker, NO definer: así la RLS sigue aplicando y la entrenadora
-- solo puede duplicar semanas de bloques que le pertenecen. Con definer, esto
-- sería un agujero por el que cualquiera escribiría en la planificación de
-- cualquiera.

create or replace function abril_trainer_duplicate_week(
  p_block_id  uuid,
  p_from_week int,
  p_to_week   int default null
)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_target int;
  r        record;
  v_new_id uuid;
  v_count  int := 0;
begin
  v_target := coalesce(
    p_to_week,
    (select max(week_number) + 1 from abril_trainer_training_sessions where block_id = p_block_id),
    1
  );

  if v_target = p_from_week then
    raise exception 'La semana origen y la destino son la misma (%)', v_target
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from abril_trainer_training_sessions
    where block_id = p_block_id and week_number = v_target
  ) then
    raise exception 'La semana % ya tiene sesiones', v_target
      using errcode = 'check_violation';
  end if;

  for r in
    select * from abril_trainer_training_sessions
    where block_id = p_block_id and week_number = p_from_week
    order by order_index
  loop
    insert into abril_trainer_training_sessions (block_id, week_number, day_label, name, order_index, notes)
    values (r.block_id, v_target, r.day_label, r.name, r.order_index, r.notes)
    returning id into v_new_id;

    insert into abril_trainer_session_exercises (
      session_id, exercise_id, order_index,
      sets, reps, load, time_seconds, rest_seconds, tempo, notes
    )
    select
      v_new_id, exercise_id, order_index,
      sets, reps, load, time_seconds, rest_seconds, tempo, notes
    from abril_trainer_session_exercises
    where session_id = r.id;

    v_count := v_count + 1;
  end loop;

  update abril_trainer_training_blocks
     set total_weeks = greatest(total_weeks, v_target)
   where id = p_block_id;

  return v_count;
end;
$$;

comment on function abril_trainer_duplicate_week is
  'Duplica una semana completa de un bloque. Devuelve cuántas sesiones copió. Si p_to_week es NULL, la agrega al final.';

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_dashboard_summary — ocho agregados en un solo viaje
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Los agregados van en SQL, no en el cliente. Traerse todos los alumnos y todos
-- los pagos para contarlos en JavaScript funciona con 20 alumnos y se degrada
-- solo. Postgres ya sabe contar.
--
-- No hay un solo `where trainer_id = auth.uid()` acá abajo, y es a propósito:
-- con security invoker la RLS ya filtró cada tabla a lo que le pertenece a quien
-- llama. Repetir el filtro sería duplicar la fuente de verdad, y además obligaría
-- al rol authenticated a tener acceso al esquema auth.

create or replace function abril_trainer_dashboard_summary()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(

    'alumnos', (
      select jsonb_build_object(
        'total',   count(*),
        'activos', count(*) filter (where status = 'activo'),
        'nuevos',  count(*) filter (where joined_at >= current_date - 30)
      )
      from abril_trainer_students
    ),

    'pagos', (
      select jsonb_build_object(
        'cobrado_mes', coalesce(sum(amount) filter (
                         where paid_at >= date_trunc('month', now())), 0),
        'pendientes',  count(*) filter (where paid_at is null and due_date >= current_date),
        'vencidos',    count(*) filter (where paid_at is null and due_date <  current_date)
      )
      from abril_trainer_payments
    ),

    'clases_hoy', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id',        c.id,
          'nombre',    c.name,
          'hora',      c.start_time,
          'cupo',      c.capacity,
          'inscritos', (select count(*) from abril_trainer_class_enrollments e where e.class_id = c.id),
          'asistencia_tomada', exists (
            select 1 from abril_trainer_attendance a where a.class_id = c.id and a.date = current_date
          )
        ) order by c.start_time
      ), '[]'::jsonb)
      from abril_trainer_classes c
      where c.active
        and c.weekday = extract(isodow from current_date)
    ),

    'planificacion', (
      select jsonb_build_object(
        'sin_rutina', count(*) filter (where not exists (
          select 1 from abril_trainer_training_blocks b
          where b.student_id = s.id and b.status = 'activo'
        )),
        'por_vencer', count(*) filter (where exists (
          select 1 from abril_trainer_training_blocks b
          where b.student_id = s.id
            and b.status = 'activo'
            and b.starts_on + (b.total_weeks * 7) <= current_date + 7
        ))
      )
      from abril_trainer_students s
      where s.status = 'activo'
    )

  );
$$;

comment on function abril_trainer_dashboard_summary is
  'Todos los números del dashboard en una sola llamada. security invoker: cada entrenadora ve solo lo suyo vía RLS.';

-- 0010_storage.sql

-- 0010_storage.sql
-- Buckets de Storage y sus políticas.

-- avatars: privado. Fotos de alumnos y de la entrenadora.
--   Ruta: {trainer_id}/{student_id}.jpg
insert into storage.buckets (id, name, public)
values ('abril_trainer_avatars', 'abril_trainer_avatars', false)
on conflict (id) do nothing;

-- exercise-media: público. Catálogo y media de ejercicios propios.
--   Ruta: catalog/{exercise_id}.mp4  ·  {trainer_id}/{exercise_id}.mp4
insert into storage.buckets (id, name, public)
values ('abril_trainer_exercise-media', 'abril_trainer_exercise-media', true)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- avatars — cada entrenadora solo toca su propia carpeta
-- ─────────────────────────────────────────────────────────────────────────────

create policy "avatars: lectura propia" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'abril_trainer_avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: alta propia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'abril_trainer_avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: reemplazo propio" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'abril_trainer_avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: borrado propio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'abril_trainer_avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- exercise-media — lectura pública, escritura solo en la carpeta propia
-- ─────────────────────────────────────────────────────────────────────────────
-- El catálogo se sirve por CDN público: es lo que permite cachearlo bien.
-- El bucket público hace la lectura abierta; estas políticas cierran la escritura.

create policy "media: alta propia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'abril_trainer_exercise-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media: reemplazo propio" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'abril_trainer_exercise-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media: borrado propio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'abril_trainer_exercise-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Nota: la carpeta catalog/ se sube una sola vez con la service_role desde el
-- script de semilla, así que no necesita política de escritura.

-- 0011_grants.sql

-- 0011_grants.sql
-- Privilegios de tabla para los roles de la API.
--
-- SIN ESTO LA APP NO FUNCIONA. Y el síntoma despista: Postgres rechaza por
-- permisos (42501) antes de llegar a evaluar la RLS, así que toda consulta
-- devuelve «permission denied for table …» aunque las políticas estén perfectas.
--
-- Las tablas creadas por estas migraciones no heredan los ALTER DEFAULT
-- PRIVILEGES que Supabase aplica a lo creado desde el panel, así que hay que
-- otorgarlos explícitamente.
--
-- Reparto de responsabilidades:
--   GRANT  → decide a QUÉ TABLAS puede llegar un rol
--   RLS    → decide QUÉ FILAS ve dentro de esas tablas
-- Las dos hacen falta. Ninguna sustituye a la otra.

-- ─────────────────────────────────────────────────────────────────────────────
-- authenticated: la entrenadora (y en el futuro el alumno)
-- ─────────────────────────────────────────────────────────────────────────────

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- anon: NADA.
-- ─────────────────────────────────────────────────────────────────────────────
-- La app exige login para todo; quien no se autenticó no tiene por qué leer ni
-- el catálogo. Es una postura más cerrada que la de Supabase por defecto, y una
-- capa extra por si alguna política tuviera un hueco.

grant usage on schema public to anon;
revoke all on all tables in schema public from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- Futuras tablas: que esto no vuelva a pasar
-- ─────────────────────────────────────────────────────────────────────────────

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;

alter default privileges in schema public
  grant execute on functions to authenticated;

-- 0012_timezone.sql

-- 0012_timezone.sql
-- «Hoy» según la zona horaria de la entrenadora, no la del servidor.
--
-- El problema: Postgres en Supabase corre en UTC y Vercel también. Abril está
-- en UTC−3. Entre las 21:00 y medianoche hora argentina, el servidor ya cree
-- que es el día siguiente — y entonces la asistencia de la clase de las 19:00,
-- marcada a las 21:30, se archivaría con la fecha de mañana, y el dashboard
-- mostraría las clases del día equivocado.
--
-- Con current_date esto pasa todos los días. Por eso ninguna consulta de la app
-- vuelve a usar current_date directamente: usan abril_trainer_app_today().

create or replace function abril_trainer_app_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

comment on function abril_trainer_app_today is
  'La fecha de hoy en la zona de la entrenadora. Sustituye a current_date en toda consulta de la app.';

-- ─────────────────────────────────────────────────────────────────────────────
-- La vista de pagos, recalculada sobre abril_trainer_app_today()
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view abril_trainer_payments_with_status
with (security_invoker = true)
as
select
  p.*,
  case
    when p.paid_at  is not null    then 'pagado'
    when p.due_date <  abril_trainer_app_today() then 'vencido'
    else 'pendiente'
  end as status
from abril_trainer_payments p;

-- ─────────────────────────────────────────────────────────────────────────────
-- El dashboard, ídem
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function abril_trainer_dashboard_summary()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(

    'alumnos', (
      select jsonb_build_object(
        'total',   count(*),
        'activos', count(*) filter (where status = 'activo'),
        'nuevos',  count(*) filter (where joined_at >= abril_trainer_app_today() - 30)
      )
      from abril_trainer_students
    ),

    'pagos', (
      select jsonb_build_object(
        'cobrado_mes', coalesce(sum(amount) filter (
                         where paid_at >= date_trunc('month', abril_trainer_app_today())), 0),
        'pendientes',  count(*) filter (where paid_at is null and due_date >= abril_trainer_app_today()),
        'vencidos',    count(*) filter (where paid_at is null and due_date <  abril_trainer_app_today())
      )
      from abril_trainer_payments
    ),

    'clases_hoy', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id',        c.id,
          'nombre',    c.name,
          'hora',      c.start_time,
          'cupo',      c.capacity,
          'inscritos', (select count(*) from abril_trainer_class_enrollments e where e.class_id = c.id),
          'asistencia_tomada', exists (
            select 1 from abril_trainer_attendance a where a.class_id = c.id and a.date = abril_trainer_app_today()
          )
        ) order by c.start_time
      ), '[]'::jsonb)
      from abril_trainer_classes c
      where c.active
        and c.weekday = extract(isodow from abril_trainer_app_today())
    ),

    'planificacion', (
      select jsonb_build_object(
        'sin_rutina', count(*) filter (where not exists (
          select 1 from abril_trainer_training_blocks b
          where b.student_id = s.id and b.status = 'activo'
        )),
        'por_vencer', count(*) filter (where exists (
          select 1 from abril_trainer_training_blocks b
          where b.student_id = s.id
            and b.status = 'activo'
            and b.starts_on + (b.total_weeks * 7) <= abril_trainer_app_today() + 7
        ))
      )
      from abril_trainer_students s
      where s.status = 'activo'
    )

  );
$$;
