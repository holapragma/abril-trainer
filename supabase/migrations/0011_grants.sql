-- 0011_grants.sql
-- Privilegios de tabla para los roles de la API.
--
-- SIN ESTO LA APP NO FUNCIONA. Y el síntoma despista: Postgres rechaza por
-- permisos (42501) antes de llegar a evaluar la RLS, así que toda consulta
-- devuelve «permission denied for table …» aunque las políticas estén perfectas.
--
-- Las tablas creadas por estas migraciones no heredan los ALTER DEFAULT
-- PRIVILEGES que Supabase aplica a lo creado desde el panel, así que hay que
-- otorgarlos explícitamente.
--
-- Reparto de responsabilidades:
--   GRANT  → decide a QUÉ TABLAS puede llegar un rol
--   RLS    → decide QUÉ FILAS ve dentro de esas tablas
-- Las dos hacen falta. Ninguna sustituye a la otra.

-- ─────────────────────────────────────────────────────────────────────────────
-- authenticated: la entrenadora (y en el futuro el alumno)
-- ─────────────────────────────────────────────────────────────────────────────

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- anon: NADA.
-- ─────────────────────────────────────────────────────────────────────────────
-- La app exige login para todo; quien no se autenticó no tiene por qué leer ni
-- el catálogo. Es una postura más cerrada que la de Supabase por defecto, y una
-- capa extra por si alguna política tuviera un hueco.

grant usage on schema public to anon;
revoke all on all tables in schema public from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- Futuras tablas: que esto no vuelva a pasar
-- ─────────────────────────────────────────────────────────────────────────────

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;

alter default privileges in schema public
  grant execute on functions to authenticated;
