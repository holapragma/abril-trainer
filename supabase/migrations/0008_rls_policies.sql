-- 0008_rls_policies.sql
-- Row Level Security. Se aplica ANTES de cargar un solo dato.
--
-- La clave anónima de Supabase viaja en el JavaScript del navegador y es
-- pública por diseño. RLS es lo único que separa esa clave de la base de datos
-- entera. Una tabla sin RLS, aunque sea cinco minutos, es una tabla abierta.
--
-- Las políticas permisivas se combinan con OR, así que la de la entrenadora y
-- la del alumno conviven sin interferir.

alter table abril_trainer_profiles           enable row level security;
alter table abril_trainer_students           enable row level security;
alter table abril_trainer_plans              enable row level security;
alter table abril_trainer_memberships        enable row level security;
alter table abril_trainer_payments           enable row level security;
alter table abril_trainer_exercises          enable row level security;
alter table abril_trainer_exercise_favorites enable row level security;
alter table abril_trainer_training_blocks    enable row level security;
alter table abril_trainer_training_sessions  enable row level security;
alter table abril_trainer_session_exercises  enable row level security;
alter table abril_trainer_workout_logs       enable row level security;
alter table abril_trainer_classes            enable row level security;
alter table abril_trainer_class_enrollments  enable row level security;
alter table abril_trainer_attendance         enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_profiles
-- ─────────────────────────────────────────────────────────────────────────────

create policy "propio perfil: lectura" on abril_trainer_profiles
  for select to authenticated
  using (id = auth.uid());

create policy "propio perfil: escritura" on abril_trainer_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Normalmente el perfil lo crea el trigger abril_trainer_on_auth_user_created, que es
-- security definer y no pasa por RLS. Esta política es la vía de recuperación:
-- si el usuario se creó ANTES de aplicar el esquema, el trigger no existía y la
-- fila falta. Sin esto no habría forma de repararlo desde la app.
create policy "propio perfil: alta" on abril_trainer_profiles
  for insert to authenticated
  with check (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_students
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sus alumnos" on abril_trainer_students
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- El alumno LEE su ficha, nunca la escribe. La columna notes es privada de la
-- entrenadora: cuando exista el acceso del alumno se le sirve una vista sin ella.
create policy "alumno lee su ficha" on abril_trainer_students
  for select to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_plans
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sus planes" on abril_trainer_plans
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_memberships
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona membresías" on abril_trainer_memberships
  for all to authenticated
  using (abril_trainer_owns_student(student_id))
  with check (abril_trainer_owns_student(student_id));

create policy "alumno lee su membresía" on abril_trainer_memberships
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_payments
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona pagos" on abril_trainer_payments
  for all to authenticated
  using (abril_trainer_owns_student(student_id))
  with check (abril_trainer_owns_student(student_id));

create policy "alumno lee sus pagos" on abril_trainer_payments
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_exercises
-- ─────────────────────────────────────────────────────────────────────────────

create policy "catálogo global: lectura" on abril_trainer_exercises
  for select to authenticated
  using (owner_id is null);

create policy "propios: lectura" on abril_trainer_exercises
  for select to authenticated
  using (owner_id = auth.uid());

create policy "propios: alta" on abril_trainer_exercises
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "propios: edición" on abril_trainer_exercises
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "propios: baja" on abril_trainer_exercises
  for delete to authenticated
  using (owner_id = auth.uid());

create policy "alumno lee los de su entrenadora" on abril_trainer_exercises
  for select to authenticated
  using (exists (
    select 1 from abril_trainer_students s
    where s.user_id = auth.uid() and s.trainer_id = abril_trainer_exercises.owner_id
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_exercise_favorites
-- ─────────────────────────────────────────────────────────────────────────────

create policy "favoritos propios" on abril_trainer_exercise_favorites
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_training_blocks
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona bloques" on abril_trainer_training_blocks
  for all to authenticated
  using (abril_trainer_owns_student(student_id))
  with check (abril_trainer_owns_student(student_id));

create policy "alumno lee sus bloques" on abril_trainer_training_blocks
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_training_sessions
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sesiones" on abril_trainer_training_sessions
  for all to authenticated
  using (exists (
    select 1 from abril_trainer_training_blocks b
    where b.id = abril_trainer_training_sessions.block_id and abril_trainer_owns_student(b.student_id)
  ))
  with check (exists (
    select 1 from abril_trainer_training_blocks b
    where b.id = abril_trainer_training_sessions.block_id and abril_trainer_owns_student(b.student_id)
  ));

create policy "alumno lee sus sesiones" on abril_trainer_training_sessions
  for select to authenticated
  using (exists (
    select 1 from abril_trainer_training_blocks b
    where b.id = abril_trainer_training_sessions.block_id and abril_trainer_is_my_student_record(b.student_id)
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_session_exercises
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona ejercicios de sesión" on abril_trainer_session_exercises
  for all to authenticated
  using (abril_trainer_owns_training_session(session_id))
  with check (abril_trainer_owns_training_session(session_id));

create policy "alumno lee ejercicios de su sesión" on abril_trainer_session_exercises
  for select to authenticated
  using (exists (
    select 1
    from abril_trainer_training_sessions ts
    join abril_trainer_training_blocks   b on b.id = ts.block_id
    where ts.id = abril_trainer_session_exercises.session_id and abril_trainer_is_my_student_record(b.student_id)
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_workout_logs — única tabla donde el alumno escribe
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora lee registros" on abril_trainer_workout_logs
  for select to authenticated
  using (abril_trainer_owns_student(student_id));

create policy "entrenadora crea registros" on abril_trainer_workout_logs
  for insert to authenticated
  with check (abril_trainer_owns_student(student_id));

create policy "entrenadora edita registros" on abril_trainer_workout_logs
  for update to authenticated
  using (abril_trainer_owns_student(student_id))
  with check (abril_trainer_owns_student(student_id));

create policy "entrenadora borra registros" on abril_trainer_workout_logs
  for delete to authenticated
  using (abril_trainer_owns_student(student_id));

create policy "alumno gestiona sus registros" on abril_trainer_workout_logs
  for all to authenticated
  using (abril_trainer_is_my_student_record(student_id))
  with check (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_classes
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona clases" on abril_trainer_classes
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "alumno lee clases donde está inscrito" on abril_trainer_classes
  for select to authenticated
  using (exists (
    select 1
    from abril_trainer_class_enrollments e
    join abril_trainer_students s on s.id = e.student_id
    where e.class_id = abril_trainer_classes.id and s.user_id = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_class_enrollments
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona inscripciones" on abril_trainer_class_enrollments
  for all to authenticated
  using (abril_trainer_owns_class(class_id))
  with check (abril_trainer_owns_class(class_id));

-- Solo su propia inscripción: un alumno no ve con quién más entrena.
create policy "alumno lee su inscripción" on abril_trainer_class_enrollments
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- abril_trainer_attendance
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona asistencia" on abril_trainer_attendance
  for all to authenticated
  using (abril_trainer_owns_class(class_id))
  with check (abril_trainer_owns_class(class_id));

create policy "alumno lee su asistencia" on abril_trainer_attendance
  for select to authenticated
  using (abril_trainer_is_my_student_record(student_id));
