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
