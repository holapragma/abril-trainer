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
-- vuelve a usar current_date directamente: usan app_today().

create or replace function app_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

comment on function app_today is
  'La fecha de hoy en la zona de la entrenadora. Sustituye a current_date en toda consulta de la app.';

-- ─────────────────────────────────────────────────────────────────────────────
-- La vista de pagos, recalculada sobre app_today()
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view payments_with_status
with (security_invoker = true)
as
select
  p.*,
  case
    when p.paid_at  is not null    then 'pagado'
    when p.due_date <  app_today() then 'vencido'
    else 'pendiente'
  end as status
from payments p;

-- ─────────────────────────────────────────────────────────────────────────────
-- El dashboard, ídem
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function dashboard_summary()
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
        'nuevos',  count(*) filter (where joined_at >= app_today() - 30)
      )
      from students
    ),

    'pagos', (
      select jsonb_build_object(
        'cobrado_mes', coalesce(sum(amount) filter (
                         where paid_at >= date_trunc('month', app_today())), 0),
        'pendientes',  count(*) filter (where paid_at is null and due_date >= app_today()),
        'vencidos',    count(*) filter (where paid_at is null and due_date <  app_today())
      )
      from payments
    ),

    'clases_hoy', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id',        c.id,
          'nombre',    c.name,
          'hora',      c.start_time,
          'cupo',      c.capacity,
          'inscritos', (select count(*) from class_enrollments e where e.class_id = c.id),
          'asistencia_tomada', exists (
            select 1 from attendance a where a.class_id = c.id and a.date = app_today()
          )
        ) order by c.start_time
      ), '[]'::jsonb)
      from classes c
      where c.active
        and c.weekday = extract(isodow from app_today())
    ),

    'planificacion', (
      select jsonb_build_object(
        'sin_rutina', count(*) filter (where not exists (
          select 1 from training_blocks b
          where b.student_id = s.id and b.status = 'activo'
        )),
        'por_vencer', count(*) filter (where exists (
          select 1 from training_blocks b
          where b.student_id = s.id
            and b.status = 'activo'
            and b.starts_on + (b.total_weeks * 7) <= app_today() + 7
        ))
      )
      from students s
      where s.status = 'activo'
    )

  );
$$;
