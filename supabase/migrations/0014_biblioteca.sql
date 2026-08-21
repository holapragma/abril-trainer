-- 0014_biblioteca.sql
-- Búsqueda de ejercicios sin acentos, un estado muerto menos y el dashboard
-- devolviendo de una vez lo que la app recalculaba por su cuenta.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Buscar «triceps» y encontrar «Tríceps»
-- ─────────────────────────────────────────────────────────────────────────────
--
-- El catálogo está en español y la búsqueda era ilike '%q%' sobre el nombre
-- crudo: quien escribe sin acentos —que en un teclado de teléfono es casi
-- todo el mundo— no encontraba nada. Y con 361 ejercicios, buscar es la única
-- forma real de llegar a uno.
--
-- unaccent() NO es inmutable (depende de un diccionario que se puede cambiar),
-- así que Postgres no la acepta dentro de una columna generada. El envoltorio
-- de abajo fija el diccionario explícitamente y se declara inmutable: es el
-- patrón habitual para este caso. Si se cambiara el diccionario 'unaccent'
-- habría que reindexar, cosa que no pasa nunca en este proyecto.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

create or replace function abril_trainer_unaccent(t text)
returns text
language sql
immutable
strict
parallel safe
set search_path = extensions, public
as $$
  select unaccent('unaccent', t);
$$;

comment on function abril_trainer_unaccent is
  'unaccent() con el diccionario fijado, declarada inmutable para poder usarla en una columna generada e indexarla. Su cara cliente es normalize() en src/lib/queries/exercises.ts: las dos tienen que normalizar igual.';

alter table abril_trainer_exercises
  add column name_norm text
  generated always as (abril_trainer_unaccent(lower(name))) stored;

comment on column abril_trainer_exercises.name_norm is
  'Nombre en minúsculas y sin acentos. Es la columna contra la que se busca; name sigue siendo la que se muestra.';

create index abril_trainer_exercises_name_norm_idx
  on abril_trainer_exercises using gin (name_norm extensions.gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fuera el estado «borrador»
-- ─────────────────────────────────────────────────────────────────────────────
--
-- El enum lo tenía y la app nunca lo produce: createBlock fuerza 'activo'. Un
-- estado que solo existe en el tipo es una promesa que la UI no cumple — se
-- muestra como badge y no hay forma de llegar a él.
--
-- Postgres no permite quitar un valor de un enum: hay que recrear el tipo. El
-- bloque de abajo aborta si alguna fila lo estuviera usando, en vez de
-- convertirla en silencio.

do $$
declare n int;
begin
  -- Comparado como texto: una vez que el valor sale del enum, `status =
  -- 'borrador'` deja de ser una comparación válida y esta guarda ya no podría
  -- ni ejecutarse sobre una base actualizada.
  select count(*) into n from abril_trainer_training_blocks where status::text = 'borrador';
  if n > 0 then
    raise exception 'Hay % bloque(s) en estado borrador: la migración no puede continuar sin decidir qué hacer con ellos', n;
  end if;
end $$;

alter type abril_trainer_block_status rename to abril_trainer_block_status_old;
create type abril_trainer_block_status as enum ('activo', 'terminado');

alter table abril_trainer_training_blocks
  alter column status drop default,
  alter column status type abril_trainer_block_status
    using status::text::abril_trainer_block_status,
  alter column status set default 'activo';

drop type abril_trainer_block_status_old;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. El dashboard devuelve también QUIÉNES están sin rutina
-- ─────────────────────────────────────────────────────────────────────────────
--
-- La app contaba los alumnos sin planificación por segunda vez en TypeScript,
-- con dos escaneos de tabla, para poder listarlos: el número ya venía en
-- sin_rutina. Dos implementaciones de la misma regla es exactamente lo que el
-- proyecto evita en todo lo demás.

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

    'pagos', (
      select jsonb_build_object(
        'cobrado_mes', coalesce(sum(amount) filter (
                         where abril_trainer_app_date(paid_at)
                               >= date_trunc('month', abril_trainer_app_today())::date), 0),
        'pendientes',  count(*) filter (where paid_at is null and due_date >= abril_trainer_app_today()),
        'vencidos',    count(*) filter (where paid_at is null and due_date <  abril_trainer_app_today())
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
        -- Los primeros cinco, para poder tocarlos desde el inicio y no solo contarlos.
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

grant execute on function abril_trainer_unaccent(text) to authenticated;
