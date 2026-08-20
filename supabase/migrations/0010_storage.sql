-- 0010_storage.sql
-- Buckets de Storage y sus políticas.

-- avatars: privado. Fotos de alumnos y de la entrenadora.
--   Ruta: {trainer_id}/{student_id}.jpg
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- exercise-media: público. Catálogo y media de ejercicios propios.
--   Ruta: catalog/{exercise_id}.mp4  ·  {trainer_id}/{exercise_id}.mp4
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- avatars — cada entrenadora solo toca su propia carpeta
-- ─────────────────────────────────────────────────────────────────────────────

create policy "avatars: lectura propia" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: alta propia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: reemplazo propio" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: borrado propio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- exercise-media — lectura pública, escritura solo en la carpeta propia
-- ─────────────────────────────────────────────────────────────────────────────
-- El catálogo se sirve por CDN público: es lo que permite cachearlo bien.
-- El bucket público hace la lectura abierta; estas políticas cierran la escritura.

create policy "media: alta propia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exercise-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media: reemplazo propio" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'exercise-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media: borrado propio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exercise-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Nota: la carpeta catalog/ se sube una sola vez con la service_role desde el
-- script de semilla, así que no necesita política de escritura.
