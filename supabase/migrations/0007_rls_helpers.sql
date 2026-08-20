-- 0007_rls_helpers.sql
-- Funciones auxiliares para las políticas RLS.
--
-- Son security definer a propósito: la consulta interna NO vuelve a pasar por
-- RLS, que es justo lo que se necesita cuando una política de students tendría
-- que consultar students. Sin esto habría recursión infinita.
--
-- set search_path = public es obligatorio en toda función security definer: sin
-- él, un search_path manipulado puede desviar la función a tablas falsas.
-- El linter de Supabase (get_advisors) lo marca como vulnerabilidad.

-- ¿Este alumno es de la entrenadora autenticada?
create or replace function owns_student(sid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from students
    where id = sid and trainer_id = auth.uid()
  );
$$;

-- ¿Esta clase es de la entrenadora autenticada?
create or replace function owns_class(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from classes
    where id = cid and trainer_id = auth.uid()
  );
$$;

-- ¿Esta sesión de entrenamiento cuelga de un alumno de la entrenadora autenticada?
create or replace function owns_training_session(tsid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from training_sessions ts
    join training_blocks   b on b.id = ts.block_id
    join students          s on s.id = b.student_id
    where ts.id = tsid and s.trainer_id = auth.uid()
  );
$$;

-- ¿Esta ficha de alumno es la del usuario autenticado?
-- Para el acceso del alumno. Hoy no devuelve nada porque students.user_id es
-- NULL en todas las filas, pero las políticas que la usan quedan escritas ya:
-- retrofitear RLS sobre datos en producción es de lo más doloroso que hay.
create or replace function is_my_student_record(sid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from students
    where id = sid and user_id = auth.uid()
  );
$$;
