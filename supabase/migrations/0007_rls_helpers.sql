-- 0007_rls_helpers.sql
-- Funciones auxiliares para las políticas RLS.
--
-- Son security definer a propósito: la consulta interna NO vuelve a pasar por
-- RLS, que es justo lo que se necesita cuando una política de abril_trainer_students tendría
-- que consultar abril_trainer_students. Sin esto habría recursión infinita.
--
-- set search_path = public es obligatorio en toda función security definer: sin
-- él, un search_path manipulado puede desviar la función a tablas falsas.
-- El linter de Supabase (get_advisors) lo marca como vulnerabilidad.

-- ¿Este alumno es de la entrenadora autenticada?
create or replace function abril_trainer_owns_student(sid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from abril_trainer_students
    where id = sid and trainer_id = auth.uid()
  );
$$;

-- ¿Esta clase es de la entrenadora autenticada?
create or replace function abril_trainer_owns_class(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from abril_trainer_classes
    where id = cid and trainer_id = auth.uid()
  );
$$;

-- ¿Esta sesión de entrenamiento cuelga de un alumno de la entrenadora autenticada?
create or replace function abril_trainer_owns_training_session(tsid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from abril_trainer_training_sessions ts
    join abril_trainer_training_blocks   b on b.id = ts.block_id
    join abril_trainer_students          s on s.id = b.student_id
    where ts.id = tsid and s.trainer_id = auth.uid()
  );
$$;

-- ¿Esta ficha de alumno es la del usuario autenticado?
-- Para el acceso del alumno. Hoy no devuelve nada porque abril_trainer_students.user_id es
-- NULL en todas las filas, pero las políticas que la usan quedan escritas ya:
-- retrofitear RLS sobre datos en producción es de lo más doloroso que hay.
create or replace function abril_trainer_is_my_student_record(sid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from abril_trainer_students
    where id = sid and user_id = auth.uid()
  );
$$;
