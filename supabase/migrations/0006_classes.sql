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
