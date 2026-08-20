'use server'

import { revalidatePath } from 'next/cache'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { exerciseSchema, fieldErrorsOf } from '@/lib/schemas'
import { STORAGE } from '@/lib/constants'
import { fail, ok, type ActionResult } from '@/types/domain'

export async function toggleFavorite(exerciseId: string): Promise<ActionResult<{ fav: boolean }>> {
  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('exercise_favorites')
    .select('exercise_id')
    .eq('exercise_id', exerciseId)
    .eq('trainer_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('exercise_favorites')
      .delete()
      .eq('exercise_id', exerciseId)
      .eq('trainer_id', userId)
    if (error) {
      console.error('toggleFavorite/delete:', error.message)
      return fail('No se pudo quitar de favoritos')
    }
    revalidatePath('/ejercicios')
    return ok({ fav: false })
  }

  const { error } = await supabase
    .from('exercise_favorites')
    .insert({ exercise_id: exerciseId, trainer_id: userId })

  if (error) {
    console.error('toggleFavorite/insert:', error.message)
    return fail('No se pudo marcar como favorito')
  }

  revalidatePath('/ejercicios')
  return ok({ fav: true })
}

export async function createExercise(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = exerciseSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  // Los del catálogo usan el id original de GymMane; los propios llevan prefijo
  // para que se distingan de un vistazo en la base.
  const id = `c_${crypto.randomUUID()}`

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      id,
      owner_id: userId,
      name: parsed.data.name,
      primary_muscle: parsed.data.primary_muscle,
      equipment: parsed.data.equipment,
      difficulty: parsed.data.difficulty,
      steps: parsed.data.steps.filter((s) => s.trim() !== ''),
    })
    .select('id')
    .single()

  if (error) {
    console.error('createExercise:', error.message)
    return fail('No se pudo crear el ejercicio')
  }

  revalidatePath('/ejercicios')
  return ok({ id: data.id })
}

export async function updateExercise(id: string, input: unknown): Promise<ActionResult> {
  const parsed = exerciseSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { error } = await supabase
    .from('exercises')
    .update({
      name: parsed.data.name,
      primary_muscle: parsed.data.primary_muscle,
      equipment: parsed.data.equipment,
      difficulty: parsed.data.difficulty,
      steps: parsed.data.steps.filter((s) => s.trim() !== ''),
    })
    .eq('id', id)

  if (error) {
    console.error('updateExercise:', error.message)
    return fail('No se pudo guardar el ejercicio')
  }

  revalidatePath('/ejercicios')
  revalidatePath(`/ejercicios/${id}`)
  return ok(undefined)
}

export async function deleteExercise(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('exercises').delete().eq('id', id)

  if (error) {
    // session_exercises.exercise_id es on delete restrict: borrar un ejercicio
    // no puede vaciar en silencio las planificaciones que lo usan.
    if (error.code === '23503') {
      return fail('Este ejercicio está en alguna planificación. Quitalo de ahí primero.')
    }
    console.error('deleteExercise:', error.message)
    return fail('No se pudo eliminar el ejercicio')
  }

  revalidatePath('/ejercicios')
  return ok(undefined)
}

/** Sube foto o vídeo para un ejercicio propio. */
export async function uploadExerciseMedia(
  exerciseId: string,
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  const file = formData.get('media')
  if (!(file instanceof File) || file.size === 0) return fail('No se recibió ningún archivo')
  if (file.size > 25 * 1024 * 1024) return fail('El archivo no puede pasar de 25 MB')

  const isVideo = file.type.startsWith('video/')
  const isImage = file.type.startsWith('image/')
  if (!isVideo && !isImage) return fail('Tiene que ser una imagen o un vídeo')

  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  const ext = file.name.split('.').pop()?.toLowerCase() ?? (isVideo ? 'mp4' : 'jpg')
  const path = `${userId}/${exerciseId}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(STORAGE.media)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (upErr) {
    console.error('uploadExerciseMedia:', upErr.message)
    return fail('No se pudo subir el archivo')
  }

  const { error } = await supabase.from('exercises').update({ media_url: path }).eq('id', exerciseId)
  if (error) {
    console.error('uploadExerciseMedia/update:', error.message)
    return fail('El archivo se subió pero no se pudo asociar')
  }

  revalidatePath(`/ejercicios/${exerciseId}`)
  return ok({ path })
}
