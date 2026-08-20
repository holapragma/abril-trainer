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
