-- 0017_clases_excepciones.sql
-- Suspender o mover una clase puntual.
--
-- Las clases son plantillas recurrentes y las ocurrencias no se materializan:
-- esa decisión sigue en pie, y es la correcta para grupos de 4-6 personas. Lo
-- que faltaba era la excepción — el feriado, la lluvia, el «esta semana la paso
-- al jueves» —, que hasta ahora se resolvía marcando a todos «justificado»:
-- falsear la asistencia para representar algo que no pasó.
--
-- Es el pendiente que el propio repo tenía anotado desde 0006. Se crea ahora
-- que hace falta, no antes.

create type abril_trainer_class_exception_kind as enum ('cancelada', 'movida');

create table abril_trainer_class_exceptions (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references abril_trainer_classes(id) on delete cascade,
  date           date not null,
  kind           abril_trainer_class_exception_kind not null,
  new_date       date,
  new_start_time time,
  reason         text,
  created_at     timestamptz not null default now(),

  unique (class_id, date),

  -- Una clase movida tiene que decir adónde; una cancelada, no.
  constraint abril_trainer_class_exceptions_moved_ck check (
    (kind = 'movida'    and new_date is not null) or
    (kind = 'cancelada' and new_date is null and new_start_time is null)
  )
);

comment on table abril_trainer_class_exceptions is
  'La excepción a una clase recurrente en una fecha concreta. No materializa ocurrencias: solo existen las filas de lo que se salió de la norma.';
comment on column abril_trainer_class_exceptions.date is
  'La fecha ORIGINAL de la ocurrencia, la que sale del weekday de la clase. new_date es adónde se movió.';

create index abril_trainer_class_exceptions_class_idx
  on abril_trainer_class_exceptions (class_id, date desc);

alter table abril_trainer_class_exceptions enable row level security;

create policy "entrenadora gestiona excepciones" on abril_trainer_class_exceptions
  for all to authenticated
  using (abril_trainer_owns_class(class_id))
  with check (abril_trainer_owns_class(class_id));

create policy "alumno lee las excepciones de su clase" on abril_trainer_class_exceptions
  for select to authenticated
  using (abril_trainer_is_my_class(class_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- El dashboard deja de ofrecer una clase que no va a haber
-- ─────────────────────────────────────────────────────────────────────────────
--
-- «Clases de hoy» ahora cuenta tres casos: la clase normal, la suspendida (no
-- aparece) y la que otro día se movió a hoy (aparece, con su horario nuevo).

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

    'pagos', abril_trainer_payment_totals(),

    'cobros_pendientes', (
      select coalesce(jsonb_agg(x order by (x->>'due_date')), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', p.id,
          'amount', p.amount,
          'due_date', p.due_date,
          'student_id', s.id,
          'first_name', s.first_name,
          'last_name', s.last_name
        ) as x
        from abril_trainer_payments p
        join abril_trainer_students s on s.id = p.student_id
        where p.paid_at is null
        order by p.due_date
        limit 5
      ) t
    ),

    'cobros_por_generar', (
      select count(*)
        from abril_trainer_memberships m
        join abril_trainer_students s on s.id = m.student_id
       where m.status = 'activa'
         and s.status = 'activo'
         and m.starts_on <= (date_trunc('month', abril_trainer_app_today()) + interval '1 month - 1 day')::date
         and not exists (
           select 1 from abril_trainer_payments p
           where p.membership_id = m.id
             and date_trunc('month', p.due_date) = date_trunc('month', abril_trainer_app_today())
         )
    ),

    'clases_hoy', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id',        c.id,
          'nombre',    c.name,
          'hora',      coalesce(o.hora, c.start_time),
          'cupo',      c.capacity,
          'fecha',     o.fecha,
          'movida',    o.movida,
          'inscritos', (select count(*) from abril_trainer_class_enrollments e where e.class_id = c.id),
          'asistencia_tomada', exists (
            select 1 from abril_trainer_attendance a
            where a.class_id = c.id and a.date = o.fecha
          )
        ) order by coalesce(o.hora, c.start_time)
      ), '[]'::jsonb)
      from abril_trainer_classes c
      join lateral (
        -- La ocurrencia de hoy de esta clase, si la hay: la de siempre cuando
        -- toca y nadie la suspendió, o una movida desde otro día.
        select abril_trainer_app_today() as fecha, null::time as hora, false as movida
        where c.weekday = extract(isodow from abril_trainer_app_today())
          and not exists (
            select 1 from abril_trainer_class_exceptions x
            where x.class_id = c.id and x.date = abril_trainer_app_today()
          )
        union all
        select x.date, x.new_start_time, true
        from abril_trainer_class_exceptions x
        where x.class_id = c.id
          and x.kind = 'movida'
          and x.new_date = abril_trainer_app_today()
        limit 1
      ) o on true
      where c.active
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
        )),
        'sin_rutina_lista', coalesce((
          select jsonb_agg(x)
          from (
            select jsonb_build_object(
              'id', s2.id, 'first_name', s2.first_name,
              'last_name', s2.last_name, 'photo_url', s2.photo_url
            ) as x
            from abril_trainer_students s2
            where s2.status = 'activo'
              and not exists (
                select 1 from abril_trainer_training_blocks b
                where b.student_id = s2.id and b.status = 'activo'
              )
            order by s2.first_name
            limit 5
          ) t
        ), '[]'::jsonb)
      )
      from abril_trainer_students s
      where s.status = 'activo'
    )

  );
$$;
