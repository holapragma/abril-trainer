-- 0006_classes.sql
-- Clases recurrentes, inscripciones y asistencia.

-- ─────────────────────────────────────────────────────────────────────────────
-- classes
-- ─────────────────────────────────────────────────────────────────────────────

create table classes (
  id               uuid primary key default gen_random_uuid(),
  trainer_id       uuid not null references profiles(id) on delete cascade,
  name             text not null,
  weekday          smallint not null check (weekday between 1 and 7),
  start_time       time     not null,
  duration_minutes smallint not null default 60 check (duration_minutes > 0),
  capacity         smallint not null default 6  check (capacity > 0),
  active           boolean  not null default true,
  created_at       timestamptz not null default now()
);

comment on table classes is
  'Plantilla recurrente, no ocurrencia. No existe class_sessions: las fechas concretas se calculan desde weekday + start_time y viven en attendance.date.';
comment on column classes.weekday is 'ISO 8601: 1 = lunes … 7 = domingo.';

create index classes_trainer_idx on classes (trainer_id, weekday, start_time);

-- ─────────────────────────────────────────────────────────────────────────────
-- class_enrollments — el roster fijo de cada clase
-- ─────────────────────────────────────────────────────────────────────────────

create table class_enrollments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id)  on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  joined_at  date not null default current_date,
  unique (class_id, student_id)
);

create index enrollments_student_idx on class_enrollments (student_id);

-- El cupo se hace cumplir en la base, no solo en el formulario.
create or replace function check_class_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity smallint;
  v_count    bigint;
begin
  select capacity into v_capacity from classes where id = new.class_id;
  select count(*) into v_count    from class_enrollments where class_id = new.class_id;

  if v_count >= v_capacity then
    raise exception 'La clase ya está completa (% de % lugares)', v_count, v_capacity
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger enforce_class_capacity
  before insert on class_enrollments
  for each row execute function check_class_capacity();

-- ─────────────────────────────────────────────────────────────────────────────
-- attendance
-- ─────────────────────────────────────────────────────────────────────────────

create table attendance (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id)  on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  date       date not null,
  status     attendance_status not null,
  created_at timestamptz not null default now(),
  unique (class_id, student_id, date)
);

create index attendance_class_date_idx   on attendance (class_id, date);
create index attendance_student_date_idx on attendance (student_id, date desc);
