import { ButtonLink } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-5xl font-bold text-text-3">404</p>
      <h1 className="font-display text-2xl font-bold">No encontramos esto</h1>
      <p className="max-w-sm text-sm text-text-2">
        Puede que se haya eliminado, o que el enlace esté mal.
      </p>
      <ButtonLink href="/">Ir al inicio</ButtonLink>
    </main>
  )
}
