import { GraduationCap, Stethoscope } from 'lucide-react'
import clsx from 'clsx'
import { useChatStore } from '@/store/chatStore'

interface ModeToggleProps {
  layout?: 'row' | 'stack'
}

const MODES = [
  { id: 'academic', label: 'Academic', icon: GraduationCap, accent: 'bg-brand-amber/10 text-brand-amberDeep' },
  { id: 'clinical', label: 'Clinical', icon: Stethoscope, accent: 'bg-brand-sage/15 text-brand-sage' },
] as const

export function ModeToggle({ layout = 'row' }: ModeToggleProps) {
  const mode = useChatStore((state) => state.mode)
  const setMode = useChatStore((state) => state.setMode)

  return (
    <div
      className={clsx(
        'flex rounded-full border border-white/40 bg-white/80 p-1 text-xs font-semibold shadow-soft backdrop-blur',
        layout === 'row' ? 'flex-row gap-1' : 'flex-col gap-2'
      )}
    >
      {MODES.map((option) => {
        const Icon = option.icon
        const isActive = mode === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 transition-all',
              isActive ? `${option.accent} shadow-soft` : 'text-brand-dusk'
            )}
          >
            <Icon size={16} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
