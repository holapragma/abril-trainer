'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

type Theme = 'light' | 'dark' | 'system'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Auto' },
]

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const saved = localStorage.getItem('tema')
    if (saved === 'light' || saved === 'dark') setTheme(saved)
  }, [])

  function apply(next: Theme) {
    setTheme(next)
    if (next === 'system') {
      localStorage.removeItem('tema')
      delete document.documentElement.dataset.theme
    } else {
      localStorage.setItem('tema', next)
      document.documentElement.dataset.theme = next
    }
  }

  return (
    <div className="flex shrink-0 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Tema">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => apply(o.value)}
          className={cn(
            'h-9 rounded-lg px-3 text-xs font-semibold transition-colors',
            theme === o.value ? 'bg-surface text-text shadow-sm' : 'text-text-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
