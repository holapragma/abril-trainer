'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { updateProfile } from '@/lib/actions/auth'
import type { Tables } from '@/types/database.types'

export function ProfileForm({ profile }: { profile: Tables<'profiles'> }) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const res = await updateProfile({
        full_name: fd.get('full_name'),
        business_name: fd.get('business_name'),
        phone: fd.get('phone'),
      })
      if (res.ok) setSaved(true)
      else setError(res.error)
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}

      <Field label="Nombre" htmlFor="full_name" required>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} required maxLength={80} />
      </Field>

      <Field label="Negocio" htmlFor="business_name" hint="Aparece en tu perfil">
        <Input
          id="business_name"
          name="business_name"
          defaultValue={profile.business_name ?? ''}
          maxLength={80}
          placeholder="Abril Trainer"
        />
      </Field>

      <Field label="Teléfono" htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={profile.phone ?? ''}
          maxLength={30}
          placeholder="+54 9 11 ..."
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
        {saved && !pending && <span className="text-sm font-medium text-ok">Guardado</span>}
      </div>
    </form>
  )
}
