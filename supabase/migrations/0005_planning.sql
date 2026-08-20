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
