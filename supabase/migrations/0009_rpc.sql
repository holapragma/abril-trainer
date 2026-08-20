-- 0009_rpc.sql
-- Las dos únicas funciones RPC. Todo lo demás son consultas normales.

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_duplicate_week — la operación estrella de la planificación
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Copia todas las sesiones de una semana y sus ejercicios a otra semana,
-- atómicamente. Es lo que convierte «armar 6 semanas» en «armar 1 y ajustar 5».
--
-- security invoker, NO definer: así la RLS sigue aplicando y la entrenadora
-- solo puede duplicar semanas de bloques que le pertenecen. Con definer, esto
-- sería un agujero por el que cualquiera escribiría en la planificación de
-- cualquiera.

create or replace function abril_trainer_duplicate_week(
  p_block_id  uuid,
  p_from_week int,
  p_to_week   int default null
)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_target int;
  r        record;
  v_new_id uuid;
  v_count  int := 0;
begin
  v_target := coalesce(
    p_to_week,
    (select max(week_number) + 1 from abril_trainer_training_sessions where block_id = p_block_id),
    1
  );

  if v_target = p_from_week then
    raise exception 'La semana origen y la destino son la misma (%)', v_target
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from abril_trainer_training_sessions
    where block_id = p_block_id and week_number = v_target
  ) then
    raise exception 'La semana % ya tiene sesiones', v_target
      using errcode = 'check_violation';
  end if;

  for r in
    select * from abril_trainer_training_sessions
    where block_id = p_block_id and week_number = p_from_week
    order by order_index
  loop
    insert into abril_trainer_training_sessions (block_id, week_number, day_label, name, order_index, notes)
    values (r.block_id, v_target, r.day_label, r.name, r.order_index, r.notes)
    returning id into v_new_id;

    insert into abril_trainer_session_exercises (
      session_id, exercise_id, order_index,
      sets, reps, load, time_seconds, rest_seconds, tempo, notes
    )
    select
      v_new_id, exercise_id, order_index,
      sets, reps, load, time_seconds, rest_seconds, tempo, notes
    from abril_trainer_session_exercises
    where session_id = r.id;

    v_count := v_count + 1;
  end loop;

  update abril_trainer_training_blocks
     set total_weeks = greatest(total_weeks, v_target)
   where id = p_block_id;

  return v_count;
end;
$$;

comment on function abril_trainer_duplicate_week is
  'Duplica una semana completa de un bloque. Devuelve cuántas sesiones copió. Si p_to_week es NULL, la agrega al final.';

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_dashboard_summary — ocho agregados en un solo viaje
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Los agregados van en SQL, no en el cliente. Traerse todos los alumnos y todos
-- los pagos para contarlos en JavaScript funciona con 20 alumnos y se degrada
-- solo. Postgres ya sabe contar.
--
-- No hay un solo `where trainer_id = auth.uid()` acá abajo, y es a propósito:
-- con security invoker la RLS ya filtró cada tabla a lo que le pertenece a quien
-- llama. Repetir el filtro sería duplicar la fuente de verdad, y además obligaría
-- al rol authenticated a tener acceso al esquema auth.

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
        'nuevos',  count(*) filter (where joined_at >= current_date - 30)
      )
      from abril_trainer_students
    ),

    'pagos', (
      select jsonb_build_object(
        'cobrado_mes', coalesce(sum(amount) filter (
                         where paid_at >= date_trunc('month', now())), 0),
        'pendientes',  count(*) filter (where paid_at is null and due_date >= current_date),
        'vencidos',    count(*) filter (where paid_at is null and due_date <  current_date)
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
            select 1 from abril_trainer_attendance a where a.class_id = c.id and a.date = current_date
          )
        ) order by c.start_time
      ), '[]'::jsonb)
      from abril_trainer_classes c
      where c.active
        and c.weekday = extract(isodow from current_date)
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
            and b.starts_on + (b.total_weeks * 7) <= current_date + 7
        ))
      )
      from abril_trainer_students s
      where s.status = 'activo'
    )

  );
$$;

comment on function abril_trainer_dashboard_summary is
  'Todos los números del dashboard en una sola llamada. security invoker: cada entrenadora ve solo lo suyo vía RLS.';
