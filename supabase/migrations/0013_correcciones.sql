-- 0013_correcciones.sql
-- Correcciones de correctitud y seguridad (Fase 0 del plan de acción).
--
-- Cuatro cosas, sin funcionalidad nueva:
--   1. Los últimos current_date de los defaults, y el mes del dashboard, en la
--      zona de la entrenadora.
--   2. Asignar un plan pasa a ser una sola operación atómica.
--   3. notes deja de estar al alcance del futuro acceso del alumno.
--   4. La asistencia no puede registrarse en el futuro.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Defaults en la zona de la entrenadora
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 0012 dejó abril_trainer_app_today() y reescribió la vista y el dashboard, pero
-- los defaults de columna siguieron en current_date: entre las 21:00 y
-- medianoche hora argentina, un alumno dado de alta quedaba con fecha de mañana.

alter table abril_trainer_students
  alter column joined_at set default abril_trainer_app_today();

alter table abril_trainer_memberships
  alter column starts_on set default abril_trainer_app_today();

alter table abril_trainer_training_blocks
  alter column starts_on set default abril_trainer_app_today();

alter table abril_trainer_class_enrollments
  alter column joined_at set default abril_trainer_app_today();

-- Y la otra mitad del mismo problema: paid_at es un instante, no una fecha.
-- date_trunc('month', app_today()) devuelve un timestamp sin zona, así que al
-- compararlo con un timestamptz Postgres usa la zona del servidor (UTC): un
-- cobro de las 22:00 del último día del mes caía en el mes siguiente. Con esta
-- función el instante se pasa primero a la fecha de calendario de Abril, que es
-- lo que hace appDateOf() en el cliente.

create or replace function abril_trainer_app_date(ts timestamptz)
returns date
language sql
immutable
set search_path = public
as $$
  select (ts at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

comment on function abril_trainer_app_date is
  'La fecha de calendario de un instante en la zona de la entrenadora. Su equivalente en el cliente es appDateOf() de src/lib/today.ts.';

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
                         where abril_trainer_app_date(paid_at)
                               >= date_trunc('month', abril_trainer_app_today())::date), 0),
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. abril_trainer_assign_plan — cerrar la anterior y abrir la nueva, o nada
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Antes esto eran dos escrituras sueltas desde la Server Action: primero
-- finalizar la membresía activa, después insertar la nueva. Si la segunda
-- fallaba, el alumno se quedaba sin plan y el mensaje de error no lo decía.
-- Dentro de una función las dos viven en la misma transacción: o pasan las dos
-- o no pasa ninguna.
--
-- security invoker, igual que abril_trainer_duplicate_week: la RLS sigue
-- aplicando, así que solo se puede asignar un plan propio a un alumno propio.
-- El precio llega por parámetro y NO se lee del plan: es el precio pactado, que
-- queda congelado en la membresía.

create or replace function abril_trainer_assign_plan(
  p_student_id uuid,
  p_plan_id    uuid,
  p_price      numeric,
  p_starts_on  date default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_start date := coalesce(p_starts_on, abril_trainer_app_today());
  v_id    uuid;
begin
  update abril_trainer_memberships
     set status  = 'finalizada',
         ends_on = greatest(starts_on, abril_trainer_app_today())
   where student_id = p_student_id
     and status = 'activa';

  insert into abril_trainer_memberships (student_id, plan_id, starts_on, price, status)
  values (p_student_id, p_plan_id, v_start, p_price, 'activa')
  returning id into v_id;

  return v_id;
end;
$$;

-- Con la firma explícita: 0015 agrega una sobrecarga y sin esto el comment
-- queda ambiguo si las migraciones se reaplican sobre una base ya actualizada.
comment on function abril_trainer_assign_plan(uuid, uuid, numeric, date) is
  'Finaliza la membresía activa y crea la nueva en una sola transacción. Devuelve el id de la membresía creada. security invoker: la RLS decide sobre qué alumno se puede.';

-- ends_on nunca puede ser anterior a starts_on (lo exige memberships_dates_ck):
-- por eso el greatest() de arriba, para un plan asignado y cambiado el mismo día.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. notes fuera del alcance del alumno
-- ─────────────────────────────────────────────────────────────────────────────
--
-- La política "alumno lee su ficha" daba SELECT sobre la fila entera, notes
-- incluida — la única columna que el proyecto declara privada de la entrenadora.
-- Postgres no tiene políticas por columna, y entrenadora y alumno comparten el
-- rol authenticated, así que un GRANT por columna tampoco los distingue.
--
-- Se quita la política y se deja una función que devuelve solo las columnas
-- seguras. El día que exista el acceso del alumno, ese es su punto de entrada;
-- hasta entonces no hay ninguna fila que pueda leer de esta tabla.

drop policy if exists "alumno lee su ficha" on abril_trainer_students;

create or replace function abril_trainer_my_student_record()
returns table (
  id         uuid,
  trainer_id uuid,
  first_name text,
  last_name  text,
  photo_url  text,
  phone      text,
  email      text,
  birthdate  date,
  goal       text,
  modality   abril_trainer_modality,
  status     abril_trainer_student_status,
  joined_at  date
)
language sql
security definer
stable
set search_path = public
as $$
  select s.id, s.trainer_id, s.first_name, s.last_name, s.photo_url, s.phone,
         s.email, s.birthdate, s.goal, s.modality, s.status, s.joined_at
    from abril_trainer_students s
   where s.user_id = auth.uid();
$$;

comment on function abril_trainer_my_student_record is
  'La ficha del alumno autenticado, SIN notes. Es la única vía por la que un alumno lee su propia ficha: la tabla no tiene política de SELECT para él.';

-- Dos políticas resolvían "¿quién es mi entrenadora?" con un subselect directo
-- sobre abril_trainer_students. Ese subselect pasa por la RLS de quien pregunta,
-- así que al quitar la política de arriba dejaban de encontrar nada. Pasan a
-- usar helpers security definer, como ya hacía el resto del archivo 0008.

create or replace function abril_trainer_is_my_trainer(tid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from abril_trainer_students
    where user_id = auth.uid() and trainer_id = tid
  );
$$;

create or replace function abril_trainer_is_my_class(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from abril_trainer_class_enrollments e
    join abril_trainer_students s on s.id = e.student_id
    where e.class_id = cid and s.user_id = auth.uid()
  );
$$;

drop policy if exists "alumno lee los de su entrenadora" on abril_trainer_exercises;
create policy "alumno lee los de su entrenadora" on abril_trainer_exercises
  for select to authenticated
  using (owner_id is not null and abril_trainer_is_my_trainer(owner_id));

drop policy if exists "alumno lee clases donde está inscrito" on abril_trainer_classes;
create policy "alumno lee clases donde está inscrito" on abril_trainer_classes
  for select to authenticated
  using (abril_trainer_is_my_class(id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. La asistencia no se registra en el futuro
-- ─────────────────────────────────────────────────────────────────────────────
--
-- La pantalla de pasar lista acepta ?fecha= en la URL. La app ya la valida
-- contra el día de la clase, pero la regla dura va en la base, como el cupo.
--
-- Se valida el futuro y NO el día de la semana a propósito: cancelar o mover una
-- clase puntual (class_exceptions, pendiente conocido del repo) va a producir
-- ocurrencias legítimas en otro día, y un trigger de weekday habría que
-- desmontarlo entonces. Una fecha futura, en cambio, nunca es válida: la
-- asistencia se toma cuando la clase ya pasó.

create or replace function abril_trainer_check_attendance_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.date > abril_trainer_app_today() then
    raise exception 'No se puede registrar asistencia en una fecha futura (%)', new.date
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger abril_trainer_enforce_attendance_date
  before insert or update on abril_trainer_attendance
  for each row execute function abril_trainer_check_attendance_date();

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants de las funciones nuevas
-- ─────────────────────────────────────────────────────────────────────────────
-- Los alter default privileges de 0011 ya las cubren, pero explícito es mejor:
-- una función sin execute falla con 42501 y el síntoma despista igual de mal
-- que el de las tablas.

grant execute on function abril_trainer_app_date(timestamptz)                   to authenticated;
grant execute on function abril_trainer_assign_plan(uuid, uuid, numeric, date) to authenticated;
grant execute on function abril_trainer_my_student_record()                    to authenticated;
grant execute on function abril_trainer_is_my_trainer(uuid)                    to authenticated;
grant execute on function abril_trainer_is_my_class(uuid)                      to authenticated;
