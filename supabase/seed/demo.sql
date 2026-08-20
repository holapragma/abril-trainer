-- demo.sql — datos de ejemplo para probar la app en local.
--
-- NO correr en producción. Crea alumnos, planes, clases y pagos ficticios
-- colgando de la primera entrenadora que exista en abril_trainer_profiles.
--
--   psql "$DB_URL" -f supabase/seed/demo.sql

do $$
declare
  t uuid;
  juan uuid; sofia uuid; martin uuid; lucas uuid; carla uuid;
  p_fuerza uuid; p_running uuid; p_virtual uuid;
  c_lun uuid; c_mie uuid;
  bloque uuid; s_a uuid; s_b uuid;
begin
  select id into t from abril_trainer_profiles order by created_at limit 1;
  if t is null then
    raise exception 'No hay ningún perfil. Creá el usuario primero.';
  end if;

  -- ── Planes ────────────────────────────────────────────────────────────────
  insert into abril_trainer_plans (trainer_id, name, description, modality, sessions_per_week, price, duration_weeks)
  values (t, 'Fuerza + Potencia', 'Trabajo de básicos con énfasis en velocidad', 'presencial', 3, 45000, null)
  returning id into p_fuerza;

  insert into abril_trainer_plans (trainer_id, name, modality, sessions_per_week, price, duration_weeks)
  values (t, 'Running', 'virtual', 4, 32000, 6)
  returning id into p_running;

  insert into abril_trainer_plans (trainer_id, name, modality, sessions_per_week, price, duration_weeks)
  values (t, 'Entrenamiento virtual', 'virtual', 3, 28000, 4)
  returning id into p_virtual;

  -- ── Alumnos ───────────────────────────────────────────────────────────────
  insert into abril_trainer_students (trainer_id, first_name, last_name, phone, email, birthdate, goal, modality, status, joined_at, notes)
  values (t,'Juan','Pérez','+54 9 11 5555 1111','juan@ejemplo.com','1992-04-18',
          'Subir fuerza en básicos','presencial','activo', abril_trainer_app_today() - 240,
          'Molestia vieja en hombro derecho: evitar press militar con barra.')
  returning id into juan;

  insert into abril_trainer_students (trainer_id, first_name, last_name, phone, birthdate, goal, modality, status, joined_at)
  values (t,'Sofía','Gómez','+54 9 11 5555 2222','1996-11-02',
          'Preparar medio maratón','virtual','activo', abril_trainer_app_today() - 95)
  returning id into sofia;

  insert into abril_trainer_students (trainer_id, first_name, last_name, phone, goal, modality, status, joined_at)
  values (t,'Martín','Díaz','+54 9 11 5555 3333','Volver a entrenar después de la lesión','presencial','activo', abril_trainer_app_today() - 20)
  returning id into martin;

  insert into abril_trainer_students (trainer_id, first_name, last_name, goal, modality, status, joined_at)
  values (t,'Lucas','Fernández','Pádel: potencia y cambios de dirección','presencial','activo', abril_trainer_app_today() - 12)
  returning id into lucas;

  insert into abril_trainer_students (trainer_id, first_name, last_name, modality, status, joined_at)
  values (t,'Carla','Ruiz','virtual','pausa', abril_trainer_app_today() - 400)
  returning id into carla;

  -- ── Membresías ────────────────────────────────────────────────────────────
  insert into abril_trainer_memberships (student_id, plan_id, price, starts_on) values
    (juan,   p_fuerza,  45000, abril_trainer_app_today() - 240),
    (sofia,  p_running, 32000, abril_trainer_app_today() - 95),
    (martin, p_fuerza,  45000, abril_trainer_app_today() - 20),
    (lucas,  p_fuerza,  48000, abril_trainer_app_today() - 12);

  -- ── Pagos: uno de cada estado, para ver el dashboard con datos ────────────
  insert into abril_trainer_payments (student_id, amount, due_date, paid_at, method, note) values
    (juan,   45000, abril_trainer_app_today() - 5,  now() - interval '4 days', 'Transferencia', 'Marzo'),
    (sofia,  32000, abril_trainer_app_today() - 3,  now() - interval '2 days', 'Efectivo',      'Marzo'),
    (juan,   45000, abril_trainer_app_today() + 25, null, null, 'Abril'),
    (martin, 45000, abril_trainer_app_today() + 10, null, null, 'Primer mes'),
    (lucas,  48000, abril_trainer_app_today() - 8,  null, null, 'Marzo'),
    (sofia,  32000, abril_trainer_app_today() - 15, null, null, 'Febrero');

  -- ── Clases ────────────────────────────────────────────────────────────────
  -- La primera cae hoy, para que el dashboard tenga algo que mostrar.
  insert into abril_trainer_classes (trainer_id, name, weekday, start_time, duration_minutes, capacity)
  values (t, 'Fuerza', extract(isodow from abril_trainer_app_today())::smallint, '18:00', 60, 6)
  returning id into c_lun;

  insert into abril_trainer_classes (trainer_id, name, weekday, start_time, duration_minutes, capacity)
  values (t, 'Potencia', ((extract(isodow from abril_trainer_app_today())::int % 7) + 1)::smallint, '19:00', 60, 5)
  returning id into c_mie;

  insert into abril_trainer_class_enrollments (class_id, student_id) values
    (c_lun, juan), (c_lun, martin), (c_lun, lucas),
    (c_mie, juan), (c_mie, sofia);

  insert into abril_trainer_attendance (class_id, student_id, date, status) values
    (c_lun, juan,   abril_trainer_app_today() - 7, 'presente'),
    (c_lun, martin, abril_trainer_app_today() - 7, 'presente'),
    (c_lun, lucas,  abril_trainer_app_today() - 7, 'justificado'),
    (c_lun, juan,   abril_trainer_app_today() - 14,'presente'),
    (c_lun, martin, abril_trainer_app_today() - 14,'ausente');

  -- ── Planificación de Juan: 2 semanas × 2 sesiones ─────────────────────────
  insert into abril_trainer_training_blocks (student_id, name, goal, starts_on, total_weeks)
  values (juan, 'Bloque 01', 'Acumulación', abril_trainer_app_today() - 14, 4)
  returning id into bloque;

  insert into abril_trainer_training_sessions (block_id, week_number, day_label, name, order_index)
  values (bloque, 1, 'A', 'Empuje', 0) returning id into s_a;
  insert into abril_trainer_training_sessions (block_id, week_number, day_label, name, order_index)
  values (bloque, 1, 'B', 'Tracción y pierna', 1) returning id into s_b;

  insert into abril_trainer_session_exercises (session_id, exercise_id, order_index, sets, reps, load, rest_seconds, notes)
  select s_a, id, 0, 4, '8-10', '60kg', 90, 'Bajar controlado'
    from abril_trainer_exercises where id = 'EIeI8Vf';
  insert into abril_trainer_session_exercises (session_id, exercise_id, order_index, sets, reps, load, rest_seconds)
  select s_a, id, 1, 3, 'AMRAP', 'peso corporal', 60 from abril_trainer_exercises where id = 'I4hDWkc';
  insert into abril_trainer_session_exercises (session_id, exercise_id, order_index, sets, reps, load, rest_seconds)
  select s_a, id, 2, 4, '12', '20kg', 60 from abril_trainer_exercises where id = 'yz9nUhF';

  insert into abril_trainer_session_exercises (session_id, exercise_id, order_index, sets, reps, load, rest_seconds)
  select s_b, id, 0, 5, '5', 'RPE 8', 150 from abril_trainer_exercises where id = '0CXGHya';
  insert into abril_trainer_session_exercises (session_id, exercise_id, order_index, sets, reps, load, rest_seconds)
  select s_b, id, 1, 3, '10-12', '70%', 90 from abril_trainer_exercises where id = 'C5jncD2';

  -- Semana 2, copiada de la 1: es exactamente lo que hace el botón «Duplicar».
  perform abril_trainer_duplicate_week(bloque, 1, 2);

  -- Sofía tiene plan pero no planificación: el dashboard lo marca.
  raise notice 'Demo lista: 5 alumnos, 3 planes, 2 clases, 6 pagos, 1 bloque con 2 semanas.';
end $$;
