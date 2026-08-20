'use server'

import { revalidatePath } from 'next/cache'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { fieldErrorsOf, studentSchema } from '@/lib/schemas'
import { STORAGE } from '@/lib/constants'
import { fail, ok, type ActionResult } from '@/types/domain'

export async function createStudent(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = studentSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos del formulario', fieldErrorsOf(parsed.error))

  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  const { joined_at, ...rest } = parsed.data
  const { data, error } = await supabase
    .from('abril_trainer_students')
    .insert({
      ...rest,
      trainer_id: userId,
      ...(joined_at ? { joined_at } : {}),
    })
    .select('id')
    .single()

  if (error) {
    console.error('createStudent:', error.message)
    return fail('No se pudo crear el alumno')
  }

  revalidatePath('/alumnos')
  revalidatePath('/')
  return ok({ id: data.id })
}

export async function updateStudent(id: string, input: unknown): Promise<ActionResult> {
  const parsed = studentSchema.safeParse(input)
  if (!parsed.success) return fail('Revisá los datos del formulario', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { joined_at, ...rest } = parsed.data

  const { error } = await supabase
    .from('abril_trainer_students')
    .update({ ...rest, ...(joined_at ? { joined_at } : {}) })
    .eq('id', id)

  if (error) {
    console.error('updateStudent:', error.message)
    return fail('No se pudo guardar')
  }

  revalidatePath('/alumnos')
  revalidatePath(`/alumnos/${id}`)
  return ok(undefined)
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('abril_trainer_students').delete().eq('id', id)

  if (error) {
    console.error('deleteStudent:', error.message)
    return fail('No se pudo eliminar el alumno')
  }

  revalidatePath('/alumnos')
  revalidatePath('/')
  return ok(undefined)
}

/**
 * Sube la foto del alumno. La ruta es {trainer_id}/{student_id}, que es lo que
 * comprueban las políticas de Storage.
 */
export async function uploadStudentPhoto(
  studentId: string,
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) return fail('No se recibió ninguna imagen')
  if (file.size > 5 * 1024 * 1024) return fail('La imagen no puede pasar de 5 MB')
  if (!file.type.startsWith('image/')) return fail('El archivo tiene que ser una imagen')

  const userId = await currentUserId()
  if (!userId) return fail('Se cerró la sesión. Volvé a entrar.')
  const supabase = await createClient()

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${studentId}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(STORAGE.avatars)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (upErr) {
    console.error('uploadStudentPhoto:', upErr.message)
    return fail('No se pudo subir la foto')
  }

  const { error } = await supabase.from('abril_trainer_students').update({ photo_url: path }).eq('id', studentId)
  if (error) {
    console.error('uploadStudentPhoto/update:', error.message)
    return fail('La foto se subió pero no se pudo asociar al alumno')
  }

  revalidatePath(`/alumnos/${studentId}`)
  revalidatePath('/alumnos')
  return ok({ path })
}
