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
