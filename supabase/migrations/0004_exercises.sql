-- 0004_exercises.sql
-- Biblioteca de ejercicios: catálogo global + ejercicios propios.

create table exercises (
  id                text primary key,
  owner_id          uuid references profiles(id) on delete cascade,

  name              text   not null,
  primary_muscle    text   not null,
  secondary_muscles text[] not null default '{}',
  equipment         text   not null default 'Otro',
  difficulty        text   not null default 'Principiante',
  media_url         text,
  steps             text[] not null default '{}',

  created_at        timestamptz not null default now()
);

comment on table exercises is
  'Una sola tabla para catálogo y ejercicios propios: evita el UNION en cada búsqueda y permite que session_exercises.exercise_id tenga una FK limpia.';
comment on column exercises.id is
  'text, no uuid: los ids del catálogo de GymMane (EIeI8Vf…) ya son estables y coinciden con el nombre del archivo de media. Los propios usan ''c_'' || gen_random_uuid().';
comment on column exercises.owner_id is
  'NULL = catálogo global (los 361 de GymMane). No NULL = ejercicio propio de esa entrenadora.';
comment on column exercises.primary_muscle is
  'text, no enum: el vocabulario canónico vive en src/lib/constants.ts y lo valida el formulario con zod. Deja libertad para categorías nuevas sin migración.';

create index exercises_owner_idx  on exercises (owner_id);
create index exercises_muscle_idx on exercises (primary_muscle);
create index exercises_search_idx on exercises using gin (to_tsvector('spanish', name));

-- ─────────────────────────────────────────────────────────────────────────────
-- Favoritos de la entrenadora
-- ─────────────────────────────────────────────────────────────────────────────

create table exercise_favorites (
  trainer_id  uuid not null references profiles(id)  on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (trainer_id, exercise_id)
);

create index exercise_favorites_trainer_idx on exercise_favorites (trainer_id);
