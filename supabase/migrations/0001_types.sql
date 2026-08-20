-- 0001_types.sql
-- Tipos del dominio y funciones utilitarias.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

create type abril_trainer_user_role         as enum ('trainer', 'student');
create type abril_trainer_modality          as enum ('presencial', 'virtual');
create type abril_trainer_student_status    as enum ('activo', 'pausa', 'baja');
create type abril_trainer_membership_status as enum ('activa', 'pausada', 'finalizada');
create type abril_trainer_attendance_status as enum ('presente', 'ausente', 'justificado');
create type abril_trainer_block_status      as enum ('borrador', 'activo', 'terminado');

-- No existe payment_status: el estado de un pago se deriva de paid_at y
-- due_date. Ver la vista abril_trainer_payments_with_status en 0003.

-- ─────────────────────────────────────────────────────────────────────────────
-- Utilidades
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function abril_trainer_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Crea el perfil automáticamente cuando se da de alta un usuario en auth.users.
-- security definer porque el trigger corre en el contexto de auth, que no tiene
-- permiso de escritura sobre public.abril_trainer_profiles.
create or replace function abril_trainer_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.abril_trainer_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce((new.raw_user_meta_data ->> 'role')::abril_trainer_user_role, 'trainer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
