-- 0016_planificacion.sql
-- Copiar una planificación entera, para que armarle la rutina a alguien no
-- empiece siempre de cero.
--
-- El caso real: Abril tiene cinco alumnos con el mismo objetivo y les arma
-- cinco veces la misma base, con ajustes. Hoy la única ayuda es duplicar una
-- semana dentro del mismo bloque.
--
-- No hace falta una tabla de plantillas: una plantilla es un bloque que ya
-- existe. La misma función copia a otro alumno (reutilizar) o al mismo
-- (versionar), y así no hay dos conceptos que mantener sincronizados.
--
-- security invoker, como duplicate_week: la RLS decide de qué bloques se puede
-- leer y a qué alumnos se puede escribir. Si el bloque de origen no es de esta
-- entrenadora, el select interno no devuelve nada y no se copia nada.

create or replace function abril_trainer_copy_block(
  p_block_id   uuid,
  p_student_id uuid,
  p_name       text default null,
  p_starts_on  date default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  r_src    record;
  v_new    uuid;
  r_ses    record;
  v_new_ses uuid;
begin
  select * into r_src from abril_trainer_training_blocks where id = p_block_id;

  if r_src is null then
    raise exception 'El bloque de origen no existe o no es tuyo'
      using errcode = 'check_violation';
  end if;

  insert into abril_trainer_training_blocks (student_id, name, goal, starts_on, total_weeks, status)
  values (
    p_student_id,
    coalesce(nullif(trim(p_name), ''), r_src.name),
    r_src.goal,
    coalesce(p_starts_on, abril_trainer_app_today()),
    r_src.total_weeks,
    'activo'
  )
  returning id into v_new;

  for r_ses in
    select * from abril_trainer_training_sessions
     where block_id = p_block_id
     order by week_number, order_index
  loop
    insert into abril_trainer_training_sessions (block_id, week_number, day_label, name, order_index, notes)
    values (v_new, r_ses.week_number, r_ses.day_label, r_ses.name, r_ses.order_index, r_ses.notes)
    returning id into v_new_ses;

    insert into abril_trainer_session_exercises (
      session_id, exercise_id, order_index,
      sets, reps, load, time_seconds, rest_seconds, tempo, notes
    )
    select
      v_new_ses, exercise_id, order_index,
      sets, reps, load, time_seconds, rest_seconds, tempo, notes
    from abril_trainer_session_exercises
    where session_id = r_ses.id;
  end loop;

  return v_new;
end;
$$;

comment on function abril_trainer_copy_block is
  'Copia un bloque completo —semanas, sesiones, ejercicios y prescripciones— a un alumno. NO copia asistencia, pagos ni nada personal. Devuelve el id del bloque nuevo.';

grant execute on function abril_trainer_copy_block(uuid, uuid, text, date) to authenticated;
