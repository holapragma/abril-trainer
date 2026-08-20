'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Field, Input } from '@/components/ui/field'
import { ErrorNote } from '@/components/ui/states'
import { createSession, duplicateWeek } from '@/lib/actions/planning'
import { SESSION_LABELS } from '@/lib/constants'
import { pluralize } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { TrainingBlock, TrainingSession } from '@/types/domain'

type SessionRow = TrainingSession & { exerciseCount: number }

export function WeekList({
  studentId,
  block,
  weeks,
}: {
  studentId: string
  block: TrainingBlock
  weeks: { week: number; sessions: SessionRow[] }[]
}) {
  const router = useRouter()
  const path = `/alumnos/${studentId}/entrenamiento/${block.id}`

  const [newSessionWeek, setNewSessionWeek] = useState<number | null>(null)
  const [dupFrom, setDupFrom] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-6">
      {error && <ErrorNote>{error}</ErrorNote>}

      {weeks.map(({ week, sessions }) => (
        <section key={week}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Semana {week}</h2>
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={() => setDupFrom(week)}
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-50"
              >
                <Copy size={15} />
                Duplicar
              </button>
            )}
          </div>

          {sessions.length === 0 ? (
            <button
              type="button"
              onClick={() => setNewSessionWeek(week)}
              className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border-strong p-5 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Plus size={17} />
              Agregar sesión
            </button>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`${path}/${s.id}`}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5 transition-colors hover:border-border-strong"
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      'font-display bg-accent-soft text-base font-bold text-accent',
                    )}
                  >
                    {s.day_label.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name || `Sesión ${s.day_label}`}</p>
                    <p className="text-sm text-text-2">
                      {s.exerciseCount === 0
                        ? 'Sin ejercicios'
                        : pluralize(s.exerciseCount, 'ejercicio', 'ejercicios')}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-text-3" />
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setNewSessionWeek(week)}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-text-2 hover:bg-surface-2 hover:text-text"
              >
                <Plus size={16} />
                Agregar sesión
              </button>
            </div>
          )}
        </section>
      ))}

      {/* Nueva sesión */}
      <NewSessionSheet
        key={`new-${newSessionWeek}`}
        open={newSessionWeek !== null}
        week={newSessionWeek ?? 1}
        blockId={block.id}
        studentId={studentId}
        existing={weeks.find((w) => w.week === newSessionWeek)?.sessions ?? []}
        onClose={() => setNewSessionWeek(null)}
        onCreated={() => {
          setNewSessionWeek(null)
          router.refresh()
        }}
      />

      {/* Duplicar semana */}
      <Sheet
        open={dupFrom !== null}
        onClose={() => setDupFrom(null)}
        title={`Duplicar semana ${dupFrom ?? ''}`}
        description="Se copian todas las sesiones con sus ejercicios, series y notas."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDupFrom(null)} className="flex-1">
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={pending}
              onClick={() => {
                if (dupFrom === null) return
                setError(null)
                startTransition(async () => {
                  const res = await duplicateWeek(block.id, dupFrom, path)
                  setDupFrom(null)
                  if (res.ok) router.refresh()
                  else setError(res.error)
                })
              }}
            >
              {pending ? 'Duplicando…' : 'Duplicar'}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-text-2">
          La copia se agrega como una semana nueva al final del bloque. Después podés ajustar cargas y
          repeticiones sin tocar la original.
        </p>
      </Sheet>
    </div>
  )
}

function NewSessionSheet({
  open,
  week,
  blockId,
  studentId,
  existing,
  onClose,
  onCreated,
}: {
  open: boolean
  week: number
  blockId: string
  studentId: string
  existing: SessionRow[]
  onClose: () => void
  onCreated: () => void
}) {
  // Sugiere la siguiente etiqueta libre: A, B, C…
  const used = new Set(existing.map((s) => s.day_label))
  const suggested = SESSION_LABELS.find((l) => !used.has(l)) ?? String(existing.length + 1)

  const [label, setLabel] = useState(suggested)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Nueva sesión · semana ${week}`}
      footer={
        <Button
          full
          disabled={pending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const res = await createSession(
                { block_id: blockId, week_number: week, day_label: label, name: null },
                studentId,
              )
              if (res.ok) onCreated()
              else setError(res.error)
            })
          }}
        >
          {pending ? 'Creando…' : 'Crear sesión'}
        </Button>
      }
    >
      <div className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <Field label="Etiqueta" hint="Cómo la vas a reconocer: A, B, Empuje, Lunes…">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={24} autoFocus />
        </Field>

        <div className="flex flex-wrap gap-1.5">
          {SESSION_LABELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(l)}
              className={cn(
                'h-10 w-10 rounded-lg border text-sm font-semibold transition-colors',
                label === l
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface text-text-2',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
