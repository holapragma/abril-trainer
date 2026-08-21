-- 0015_cobros.sql
-- El ciclo de cobro deja de ser un cuaderno y pasa a salir de la membresía.
--
-- Hasta acá, cobrar era tipear a mano el mismo importe, para el mismo alumno,
-- el mismo día de cada mes, doce veces al año, por persona — mientras la
-- membresía activa ya sabía el precio pactado, desde cuándo y cada cuánto.
-- membership_id existía en la tabla y la app mandaba siempre NULL.
--
-- La renovación NO depende de un cron: se encadena a lo que Abril ya hace
-- (cobrar) y tiene una red de seguridad idempotente para lo que nadie saldó.
-- Un proceso de fondo se rompe, se atrasa o se olvida, que es exactamente el
-- motivo por el que un pago tampoco tiene columna de estado.

-- ─────────────────────────────────────────────────────────────────────────────
-- El día del ciclo
-- ─────────────────────────────────────────────────────────────────────────────
--
-- El ciclo queda anclado al día en que arrancó la membresía: si entró un 12,
-- vence todos los 12. Si el mes destino es más corto, cae en su último día —
-- un plan que empezó un 31 vence el 28 de febrero, no el 3 de marzo.
-- Es la misma regla que addMonths() en src/lib/today.ts.

create or replace function abril_trainer_cycle_due(p_starts_on date, p_month date)
returns date
language sql
immutable
strict
set search_path = public
as $$
  -- Primer día del mes destino + (día del ciclo − 1), recortado al último día
  -- que ese mes tenga.
  select date_trunc('month', p_month)::date
         + (least(
              extract(day from p_starts_on)::int,
              extract(day from (date_trunc('month', p_month) + interval '1 month - 1 day'))::int
            ) - 1);
$$;

comment on function abril_trainer_cycle_due is
  'El vencimiento del ciclo de p_month para una membresía que arrancó el p_starts_on. Su equivalente en el cliente es addMonths() de src/lib/today.ts.';

-- ─────────────────────────────────────────────────────────────────────────────
-- assign_plan ahora abre también el primer cobro
-- ─────────────────────────────────────────────────────────────────────────────
--
-- El disparador del cobro es la membresía, no el alta del alumno: es el único
-- momento en que el sistema conoce precio, ciclo y fecha de inicio. Un alumno
-- sin plan no genera cobros porque no hay importe que cobrarle.
--
-- Los tres pasos —cerrar la anterior, abrir la nueva, crear su primer cobro—
-- viven en la misma transacción. p_charge existe para poder asignar un plan sin
-- generar cobro (una beca, un canje), sin tener que borrar el pago después.

-- Se agrega un parámetro, así que la firma cambia: sin este drop, Postgres
-- deja las dos versiones conviviendo y toda llamada con cuatro argumentos
-- queda ambigua.
drop function if exists abril_trainer_assign_plan(uuid, uuid, numeric, date);

create or replace function abril_trainer_assign_plan(
  p_student_id uuid,
  p_plan_id    uuid,
  p_price      numeric,
  p_starts_on  date default null,
  p_charge     boolean default true
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_start date := coalesce(p_starts_on, abril_trainer_app_today());
  v_id    uuid;
begin
  update abril_trainer_memberships
     set status  = 'finalizada',
         ends_on = greatest(starts_on, abril_trainer_app_today())
   where student_id = p_student_id
     and status = 'activa';

  insert into abril_trainer_memberships (student_id, plan_id, starts_on, price, status)
  values (p_student_id, p_plan_id, v_start, p_price, 'activa')
  returning id into v_id;

  if p_charge then
    insert into abril_trainer_payments (student_id, membership_id, amount, due_date)
    values (p_student_id, v_id, p_price, v_start);
  end if;

  return v_id;
end;
$$;

comment on function abril_trainer_assign_plan(uuid, uuid, numeric, date, boolean) is
  'Finaliza la membresía activa, crea la nueva y abre su primer cobro, todo en una transacción. security invoker: la RLS decide sobre qué alumno se puede.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Cobrar encadena el ciclo siguiente
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Marcar un pago como pagado abre el del mes que viene, con el precio congelado
-- de la membresía. Así «se renueva solo» sin que nada corra de fondo.
--
-- Desmarcar NO borra el siguiente: sería destruir una fila que Abril quizá ya
-- editó o incluso cobró. Solo vuelve el pago a pendiente.
--
-- No encadena si: el pago no viene de una membresía, la membresía dejó de estar
-- activa, el alumno no está activo (pausa o baja), o ya existe un cobro de esa
-- membresía en el mes destino. Esa última condición es la que hace que tocar
-- dos veces no duplique.

create or replace function abril_trainer_settle_payment(
  p_payment_id uuid,
  p_paid       boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  r_pay    record;
  r_mem    record;
  v_next   date;
  v_new_id uuid;
begin
  update abril_trainer_payments
     set paid_at = case when p_paid then now() else null end
   where id = p_payment_id
  returning * into r_pay;

  -- Sin fila, la RLS lo filtró: no es asunto de esta entrenadora.
  if r_pay is null then
    return null;
  end if;

  if not p_paid or r_pay.membership_id is null then
    return null;
  end if;

  select m.* into r_mem
    from abril_trainer_memberships m
    join abril_trainer_students s on s.id = m.student_id
   where m.id = r_pay.membership_id
     and m.status = 'activa'
     and s.status = 'activo';

  if r_mem is null then
    return null;
  end if;

  v_next := abril_trainer_cycle_due(r_mem.starts_on, (r_pay.due_date + interval '1 month')::date);

  if exists (
    select 1 from abril_trainer_payments
    where membership_id = r_mem.id
      and date_trunc('month', due_date) = date_trunc('month', v_next)
  ) then
    return null;
  end if;

  insert into abril_trainer_payments (student_id, membership_id, amount, due_date)
  values (r_mem.student_id, r_mem.id, r_mem.price, v_next)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

comment on function abril_trainer_settle_payment is
  'Marca un pago como pagado o pendiente. Al cobrar, abre el cobro del ciclo siguiente si corresponde y no existe. Devuelve el id del nuevo cobro, o NULL si no creó ninguno.';

-- ─────────────────────────────────────────────────────────────────────────────
-- La red de seguridad mensual
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Para lo que nadie saldó: crea el cobro del mes de cada membresía activa que
-- todavía no lo tenga. Idempotente — tocarla dos veces no duplica nada — así
-- que el botón puede apretarse sin miedo.

create or replace function abril_trainer_generate_monthly_charges(p_month date default null)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_month date := coalesce(p_month, abril_trainer_app_today());
  v_count int  := 0;
begin
  insert into abril_trainer_payments (student_id, membership_id, amount, due_date)
  select m.student_id, m.id, m.price, abril_trainer_cycle_due(m.starts_on, v_month)
    from abril_trainer_memberships m
    join abril_trainer_students s on s.id = m.student_id
   where m.status = 'activa'
     and s.status = 'activo'
     -- Una membresía que arranca el mes que viene no debe cobrar este.
     and m.starts_on <= (date_trunc('month', v_month) + interval '1 month - 1 day')::date
     and not exists (
       select 1 from abril_trainer_payments p
       where p.membership_id = m.id
         and date_trunc('month', p.due_date) = date_trunc('month', v_month)
     );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function abril_trainer_generate_monthly_charges is
  'Abre el cobro del mes de cada membresía activa que no lo tenga. Idempotente. Devuelve cuántos creó.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Los totales, una sola vez
-- ─────────────────────────────────────────────────────────────────────────────
--
-- /pagos los calculaba en TypeScript sobre las filas que había traído y el
-- dashboard los calculaba en SQL: dos implementaciones de la misma regla que
-- podían mostrar números distintos en la misma pantalla. Ahora hay una sola, y
-- el dashboard la llama en vez de repetirla.

create or replace function abril_trainer_payment_totals()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
    'cobrado_mes', coalesce(sum(amount) filter (
                     where abril_trainer_app_date(paid_at)
                           >= date_trunc('month', abril_trainer_app_today())::date), 0),
    'pendientes',  count(*) filter (where paid_at is null and due_date >= abril_trainer_app_today()),
    'vencidos',    count(*) filter (where paid_at is null and due_date <  abril_trainer_app_today()),
    'adeudado',    coalesce(sum(amount) filter (where paid_at is null), 0)
  )
  from abril_trainer_payments;
$$;

comment on function abril_trainer_payment_totals is
  'Los cuatro números de pagos. Única fuente: la usan /pagos y el dashboard.';

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

    -- Los cobros sin saldar que Abril puede tocar desde el inicio, los más
    -- atrasados primero.
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

    -- Cuántos cobros del mes faltan abrir: si es 0, el botón de generar ni
    -- aparece.
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
          'hora',      c.start_time,
          'cupo',      c.capacity,
          'inscritos', (select count(*) from abril_trainer_class_enrollments e where e.class_id = c.id),
          'asistencia_tomada', exists (
            select 1 from abril_trainer_attendance a where a.class_id = c.id and a.date = abril_trainer_app_today()
          )
        ) order by c.start_time
      ), '[]'::jsonb)
      from abril_trainer_classes c
      where c.active
        and c.weekday = extract(isodow from abril_trainer_app_today())
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

-- Un índice para la pregunta que ahora se hace en cada carga del inicio:
-- «¿esta membresía ya tiene cobro este mes?».
create index abril_trainer_payments_membership_due_idx
  on abril_trainer_payments (membership_id, due_date desc)
  where membership_id is not null;

grant execute on function abril_trainer_cycle_due(date, date)                                to authenticated;
grant execute on function abril_trainer_assign_plan(uuid, uuid, numeric, date, boolean)      to authenticated;
grant execute on function abril_trainer_settle_payment(uuid, boolean)                        to authenticated;
grant execute on function abril_trainer_generate_monthly_charges(date)                       to authenticated;
grant execute on function abril_trainer_payment_totals()                                     to authenticated;
