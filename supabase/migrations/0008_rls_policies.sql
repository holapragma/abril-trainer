-- 0008_rls_policies.sql
-- Row Level Security. Se aplica ANTES de cargar un solo dato.
--
-- La clave anónima de Supabase viaja en el JavaScript del navegador y es
-- pública por diseño. RLS es lo único que separa esa clave de la base de datos
-- entera. Una tabla sin RLS, aunque sea cinco minutos, es una tabla abierta.
--
-- Las políticas permisivas se combinan con OR, así que la de la entrenadora y
-- la del alumno conviven sin interferir.

alter table profiles           enable row level security;
alter table students           enable row level security;
alter table plans              enable row level security;
alter table memberships        enable row level security;
alter table payments           enable row level security;
alter table exercises          enable row level security;
alter table exercise_favorites enable row level security;
alter table training_blocks    enable row level security;
alter table training_sessions  enable row level security;
alter table session_exercises  enable row level security;
alter table workout_logs       enable row level security;
alter table classes            enable row level security;
alter table class_enrollments  enable row level security;
alter table attendance         enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────

create policy "propio perfil: lectura" on profiles
  for select to authenticated
  using (id = auth.uid());

create policy "propio perfil: escritura" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Normalmente el perfil lo crea el trigger on_auth_user_created, que es
-- security definer y no pasa por RLS. Esta política es la vía de recuperación:
-- si el usuario se creó ANTES de aplicar el esquema, el trigger no existía y la
-- fila falta. Sin esto no habría forma de repararlo desde la app.
create policy "propio perfil: alta" on profiles
  for insert to authenticated
  with check (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- students
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sus alumnos" on students
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- El alumno LEE su ficha, nunca la escribe. La columna notes es privada de la
-- entrenadora: cuando exista el acceso del alumno se le sirve una vista sin ella.
create policy "alumno lee su ficha" on students
  for select to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- plans
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sus planes" on plans
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- memberships
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona membresías" on memberships
  for all to authenticated
  using (owns_student(student_id))
  with check (owns_student(student_id));

create policy "alumno lee su membresía" on memberships
  for select to authenticated
  using (is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- payments
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona pagos" on payments
  for all to authenticated
  using (owns_student(student_id))
  with check (owns_student(student_id));

create policy "alumno lee sus pagos" on payments
  for select to authenticated
  using (is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- exercises
-- ─────────────────────────────────────────────────────────────────────────────

create policy "catálogo global: lectura" on exercises
  for select to authenticated
  using (owner_id is null);

create policy "propios: lectura" on exercises
  for select to authenticated
  using (owner_id = auth.uid());

create policy "propios: alta" on exercises
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "propios: edición" on exercises
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "propios: baja" on exercises
  for delete to authenticated
  using (owner_id = auth.uid());

create policy "alumno lee los de su entrenadora" on exercises
  for select to authenticated
  using (exists (
    select 1 from students s
    where s.user_id = auth.uid() and s.trainer_id = exercises.owner_id
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- exercise_favorites
-- ─────────────────────────────────────────────────────────────────────────────

create policy "favoritos propios" on exercise_favorites
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- training_blocks
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona bloques" on training_blocks
  for all to authenticated
  using (owns_student(student_id))
  with check (owns_student(student_id));

create policy "alumno lee sus bloques" on training_blocks
  for select to authenticated
  using (is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- training_sessions
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona sesiones" on training_sessions
  for all to authenticated
  using (exists (
    select 1 from training_blocks b
    where b.id = training_sessions.block_id and owns_student(b.student_id)
  ))
  with check (exists (
    select 1 from training_blocks b
    where b.id = training_sessions.block_id and owns_student(b.student_id)
  ));

create policy "alumno lee sus sesiones" on training_sessions
  for select to authenticated
  using (exists (
    select 1 from training_blocks b
    where b.id = training_sessions.block_id and is_my_student_record(b.student_id)
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- session_exercises
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona ejercicios de sesión" on session_exercises
  for all to authenticated
  using (owns_training_session(session_id))
  with check (owns_training_session(session_id));

create policy "alumno lee ejercicios de su sesión" on session_exercises
  for select to authenticated
  using (exists (
    select 1
    from training_sessions ts
    join training_blocks   b on b.id = ts.block_id
    where ts.id = session_exercises.session_id and is_my_student_record(b.student_id)
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- workout_logs — única tabla donde el alumno escribe
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora lee registros" on workout_logs
  for select to authenticated
  using (owns_student(student_id));

create policy "entrenadora crea registros" on workout_logs
  for insert to authenticated
  with check (owns_student(student_id));

create policy "entrenadora edita registros" on workout_logs
  for update to authenticated
  using (owns_student(student_id))
  with check (owns_student(student_id));

create policy "entrenadora borra registros" on workout_logs
  for delete to authenticated
  using (owns_student(student_id));

create policy "alumno gestiona sus registros" on workout_logs
  for all to authenticated
  using (is_my_student_record(student_id))
  with check (is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- classes
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona clases" on classes
  for all to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "alumno lee clases donde está inscrito" on classes
  for select to authenticated
  using (exists (
    select 1
    from class_enrollments e
    join students s on s.id = e.student_id
    where e.class_id = classes.id and s.user_id = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- class_enrollments
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona inscripciones" on class_enrollments
  for all to authenticated
  using (owns_class(class_id))
  with check (owns_class(class_id));

-- Solo su propia inscripción: un alumno no ve con quién más entrena.
create policy "alumno lee su inscripción" on class_enrollments
  for select to authenticated
  using (is_my_student_record(student_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- attendance
-- ─────────────────────────────────────────────────────────────────────────────

create policy "entrenadora gestiona asistencia" on attendance
  for all to authenticated
  using (owns_class(class_id))
  with check (owns_class(class_id));

create policy "alumno lee su asistencia" on attendance
  for select to authenticated
  using (is_my_student_record(student_id));
