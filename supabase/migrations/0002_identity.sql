-- 0002_identity.sql
-- Identidad (entrenadora) y personas (alumnos).

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — 1:1 con auth.users
-- ─────────────────────────────────────────────────────────────────────────────

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role   not null default 'trainer',
  full_name     text        not null,
  photo_url     text,
  phone         text,
  business_name text,
  created_at    timestamptz not null default now()
);

comment on table profiles is
  'Perfil de la persona autenticada. Hoy solo la entrenadora; role prepara el acceso del alumno.';

-- El trigger vive en auth.users, así que se crea después de que exista profiles.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- students
-- ─────────────────────────────────────────────────────────────────────────────

create table students (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references profiles(id) on delete cascade,
  user_id     uuid unique references auth.users(id) on delete set null,

  first_name  text not null,
  last_name   text not null,
  photo_url   text,
  phone       text,
  email       text,
  birthdate   date,
  goal        text,

  modality    modality       not null default 'presencial',
  status      student_status not null default 'activo',
  joined_at   date           not null default current_date,
  notes       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column students.user_id is
  'NULL mientras el alumno no tenga cuenta. Al invitarlo se rellena y hereda todo su historial sin migrar nada.';
comment on column students.notes is
  'PRIVADO de la entrenadora. Nunca debe exponerse al alumno: cuando exista su acceso se le sirve una vista sin esta columna.';

create trigger students_updated_at
  before update on students
  for each row execute function set_updated_at();

create index students_trainer_status_idx on students (trainer_id, status);
create index students_user_idx           on students (user_id) where user_id is not null;
create index students_name_idx           on students
  using gin (to_tsvector('spanish', first_name || ' ' || last_name));
