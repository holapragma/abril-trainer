-- rls_test.sql
-- Verificación de aislamiento entre entrenadoras y de las reglas de negocio
-- que viven en la base.
--
-- Una política RLS mal escrita NO falla ruidosamente: simplemente devuelve
-- filas que no debería. Por eso este archivo existe y se corre después de cada
-- migración que toque políticas.
--
-- Uso (contra el stack local):
--     supabase db reset
--     psql "$DB_URL" -f supabase/tests/rls_test.sql
--
-- Todo lo que imprima "FALLO" es un agujero de seguridad.

\pset pager off
\set ON_ERROR_STOP off

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Datos: dos entrenadoras, una con todo, la otra vacía
-- ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.com', '{"full_name":"Entrenadora A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.com', '{"full_name":"Entrenadora B"}');

insert into abril_trainer_students (id, trainer_id, first_name, last_name, notes) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Juan','Pérez','nota privada');
insert into abril_trainer_plans (id, trainer_id, name, price) values
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Fuerza', 45000);
insert into abril_trainer_memberships (student_id, plan_id, price) values
  ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002', 45000);
insert into abril_trainer_payments (student_id, amount, due_date, paid_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 45000, current_date - 10, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 45000, current_date + 10, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 45000, current_date - 40, now());
-- on conflict: el test tiene que correr igual con el catálogo ya sembrado.
insert into abril_trainer_exercises (id, name, primary_muscle) values
  ('EIeI8Vf','Press de banca con barra','chest')
on conflict (id) do nothing;
insert into abril_trainer_training_blocks (id, student_id, name, total_weeks) values
  ('aaaaaaaa-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Bloque 01', 4);
insert into abril_trainer_training_sessions (id, block_id, week_number, day_label, order_index) values
  ('aaaaaaaa-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000003',1,'A',0),
  ('aaaaaaaa-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000003',1,'B',1);
insert into abril_trainer_session_exercises (session_id, exercise_id, order_index, sets, reps, load) values
  ('aaaaaaaa-0000-0000-0000-000000000004','EIeI8Vf',0,4,'8-10','60kg'),
  ('aaaaaaaa-0000-0000-0000-000000000005','EIeI8Vf',0,5,'5','70%');
insert into abril_trainer_classes (id, trainer_id, name, weekday, start_time, capacity) values
  ('aaaaaaaa-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Fuerza',
   extract(isodow from current_date)::smallint, '18:00', 2);
insert into abril_trainer_class_enrollments (class_id, student_id) values
  ('aaaaaaaa-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000001');
insert into abril_trainer_attendance (class_id, student_id, date, status) values
  ('aaaaaaaa-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000001', current_date, 'presente');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Aislamiento de lectura: B no ve nada de A
-- ─────────────────────────────────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';

\echo '── 1. La entrenadora B no ve datos de A (todo debe dar 0) ──'
select 'abril_trainer_students'         as tabla, count(*) as visibles from abril_trainer_students
union all select 'abril_trainer_plans',             count(*) from abril_trainer_plans
union all select 'abril_trainer_memberships',       count(*) from abril_trainer_memberships
union all select 'abril_trainer_payments',          count(*) from abril_trainer_payments
union all select 'payments_view',     count(*) from abril_trainer_payments_with_status
union all select 'abril_trainer_training_blocks',   count(*) from abril_trainer_training_blocks
union all select 'abril_trainer_training_sessions', count(*) from abril_trainer_training_sessions
union all select 'abril_trainer_session_exercises', count(*) from abril_trainer_session_exercises
union all select 'abril_trainer_workout_logs',      count(*) from abril_trainer_workout_logs
union all select 'abril_trainer_classes',           count(*) from abril_trainer_classes
union all select 'abril_trainer_class_enrollments', count(*) from abril_trainer_class_enrollments
union all select 'abril_trainer_attendance',        count(*) from abril_trainer_attendance
order by 1;

\echo '── 1b. Pero sí ve el catálogo global (debe ser > 0) ──'
select count(*) as catalogo_global from abril_trainer_exercises where owner_id is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Aislamiento de escritura
-- ─────────────────────────────────────────────────────────────────────────────

\echo '── 2. B no puede escribir sobre datos de A ──'
do $$
declare n int;
begin
  update abril_trainer_students set first_name = 'HACKEADO'
   where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n > 0 then raise warning 'FALLO: B modificó % alumno(s) de A', n;
  else raise notice 'OK: update de B no afectó ninguna fila';
  end if;

  delete from abril_trainer_payments;
  get diagnostics n = row_count;
  if n > 0 then raise warning 'FALLO: B borró % pago(s) de A', n;
  else raise notice 'OK: delete de B no afectó ninguna fila';
  end if;
end $$;

\echo '── 2b. B no puede duplicar una semana de A (debe copiar 0) ──'
select abril_trainer_duplicate_week('aaaaaaaa-0000-0000-0000-000000000003', 1, 9) as copiadas_por_B;

\echo '── 2c. abril_trainer_dashboard_summary de B viene vacío ──'
select jsonb_pretty(abril_trainer_dashboard_summary()) as dashboard_de_B;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. A sí opera con lo suyo
-- ─────────────────────────────────────────────────────────────────────────────

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

\echo '── 3. A ve lo suyo ──'
select 'abril_trainer_students' as tabla, count(*) from abril_trainer_students
union all select 'abril_trainer_payments', count(*) from abril_trainer_payments
union all select 'abril_trainer_session_exercises', count(*) from abril_trainer_session_exercises
order by 1;

\echo '── 3b. Estado derivado de los pagos ──'
select status, count(*) from abril_trainer_payments_with_status group by status order by status;

-- Reparación de perfil (getProfile lo recrea si el trigger no llegó a correr).
-- Se distinguen dos errores: insufficient_privilege = RLS lo bloqueó (mal);
-- unique_violation = RLS lo dejó pasar y chocó con la PK (bien, la fila ya está).
\echo '── 3b2. Reparación de perfil: propio permitido, ajeno bloqueado ──'
do $$ begin
  insert into abril_trainer_profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','Reparada');
  raise notice 'OK: RLS permite recrear el perfil propio';
exception
  when unique_violation then raise notice 'OK: RLS permite el alta propia (la fila ya existía)';
  when insufficient_privilege then
    raise warning 'FALLO: sin política de INSERT no hay forma de reparar un perfil ausente';
end $$;

do $$ begin
  insert into abril_trainer_profiles (id, full_name) values ('33333333-3333-3333-3333-333333333333','Ajena');
  raise warning 'FALLO DE SEGURIDAD: creó un perfil a nombre de otra persona';
exception when insufficient_privilege then
  raise notice 'OK: no puede crear un perfil ajeno';
end $$;

\echo '── 3c. WITH CHECK: A no puede crear datos a nombre de B ──'
do $$ begin
  insert into abril_trainer_students (trainer_id, first_name, last_name)
  values ('22222222-2222-2222-2222-222222222222','Robado','Ajeno');
  raise warning 'FALLO: A creó un alumno para B';
exception when insufficient_privilege then
  raise notice 'OK: WITH CHECK rechazó el alta a nombre ajeno';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Reglas de negocio en la base
-- ─────────────────────────────────────────────────────────────────────────────

\echo '── 4. abril_trainer_duplicate_week copia sesiones y ejercicios ──'
select abril_trainer_duplicate_week('aaaaaaaa-0000-0000-0000-000000000003', 1) as sesiones_copiadas;
select ts.week_number, ts.day_label, se.exercise_id, se.sets, se.reps, se.load
  from abril_trainer_training_sessions ts
  left join abril_trainer_session_exercises se on se.session_id = ts.id
 where ts.block_id = 'aaaaaaaa-0000-0000-0000-000000000003'
 order by ts.week_number, ts.order_index;

\echo '── 4b. No se puede duplicar sobre una semana ocupada ──'
do $$ begin
  perform abril_trainer_duplicate_week('aaaaaaaa-0000-0000-0000-000000000003', 1, 2);
  raise warning 'FALLO: permitió duplicar sobre una semana ocupada';
exception when check_violation then
  raise notice 'OK: rechazado -> %', sqlerrm;
end $$;

\echo '── 4c. Cupo de clase (capacity 2, ya hay 1) ──'
insert into abril_trainer_students (id, trainer_id, first_name, last_name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111','Sofía','Gómez'),
  ('aaaaaaaa-0000-0000-0000-00000000000b','11111111-1111-1111-1111-111111111111','Lucas','Díaz');
insert into abril_trainer_class_enrollments (class_id, student_id)
values ('aaaaaaaa-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-00000000000a');
do $$ begin
  insert into abril_trainer_class_enrollments (class_id, student_id)
  values ('aaaaaaaa-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-00000000000b');
  raise warning 'FALLO: permitió superar el cupo';
exception when check_violation then
  raise notice 'OK: rechazado -> %', sqlerrm;
end $$;

\echo '── 4d. Una sola membresía activa por alumno ──'
do $$ begin
  insert into abril_trainer_memberships (student_id, plan_id, price)
  values ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002', 50000);
  raise warning 'FALLO: permitió dos membresías activas';
exception when unique_violation then
  raise notice 'OK: rechazado -> índice único parcial';
end $$;

\echo '── 4e. No se borra un ejercicio propio en uso ──'
insert into abril_trainer_exercises (id, owner_id, name, primary_muscle)
values ('c_test','11111111-1111-1111-1111-111111111111','Sentadilla propia','quads')
on conflict (id) do nothing;
insert into abril_trainer_session_exercises (session_id, exercise_id, order_index, sets, reps)
values ('aaaaaaaa-0000-0000-0000-000000000004','c_test',9,3,'10');
do $$ begin
  delete from abril_trainer_exercises where id = 'c_test';
  raise warning 'FALLO: borró un ejercicio en uso';
exception when foreign_key_violation then
  raise notice 'OK: rechazado -> on delete restrict';
end $$;

\echo '── 4f. Nadie borra el catálogo global (RLS lo hace invisible) ──'
do $$
declare n int;
begin
  delete from abril_trainer_exercises where owner_id is null;
  get diagnostics n = row_count;
  if n > 0 then raise warning 'FALLO: borró % fila(s) del catálogo global', n;
  else raise notice 'OK: el catálogo global no es borrable';
  end if;
end $$;

\echo '── 4g. Asistencia única por clase + alumno + fecha ──'
do $$ begin
  insert into abril_trainer_attendance (class_id, student_id, date, status)
  values ('aaaaaaaa-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000001', current_date, 'ausente');
  raise warning 'FALLO: permitió doble asistencia el mismo día';
exception when unique_violation then
  raise notice 'OK: rechazado -> unique(class_id, student_id, date)';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Cobertura: ninguna tabla sin RLS
-- ─────────────────────────────────────────────────────────────────────────────

reset role;

\echo '── 5. RLS activa y con políticas en todas las tablas ──'
select c.relname as tabla,
       c.relrowsecurity as rls,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as politicas
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relrowsecurity, c.relname;

\echo '── 5b. Tablas SIN RLS (debe venir vacío) ──'
select c.relname as tabla_desprotegida
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

rollback;
