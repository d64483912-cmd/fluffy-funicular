import type { ReactNode } from 'react'
import { Palette, Type, ShieldCheck } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

const themeOptions = [
  { id: 'light', label: 'Warm Light', description: 'Ivory surfaces · clinic friendly' },
  { id: 'dark', label: 'Calming Dark', description: 'Low-light ward ready' },
] as const

const fontOptions = [
  { id: 'sm', label: 'Small', description: 'Dense data views' },
  { id: 'md', label: 'Comfort', description: 'Balanced readability' },
  { id: 'lg', label: 'Large', description: 'Rounds & bedside use' },
] as const

const aiStyles = [
  { id: 'concise', label: 'Concise', description: 'Key recommendations only' },
  { id: 'detailed', label: 'Detailed', description: 'Reasoning & pearls' },
  { id: 'evidence', label: 'Evidence heavy', description: 'Highlights data + citations' },
] as const

export function SettingsPanel() {
  const settings = useUIStore((state) => state.settings)
  const setTheme = useUIStore((state) => state.setTheme)
  const setFontScale = useUIStore((state) => state.setFontScale)
  const setAIStyle = useUIStore((state) => state.setAIStyle)
  const toggleDisclaimer = useUIStore((state) => state.toggleDisclaimer)

  return (
    <div className="space-y-10">
      <SettingGroup icon={<Palette size={18} />} title="Theme">
        <div className="grid gap-4 sm:grid-cols-2">
          {themeOptions.map((option) => (
            <label key={option.id} className={`rounded-3xl border px-4 py-4 ${settings.theme === option.id ? 'border-brand-amber bg-brand-amber/5' : 'border-white/50 bg-white/60'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-brand-bark">{option.label}</p>
                  <p className="text-sm text-brand-dusk">{option.description}</p>
                </div>
                <input type="radio" name="theme" checked={settings.theme === option.id} onChange={() => setTheme(option.id)} />
              </div>
            </label>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup icon={<Type size={18} />} title="Typography">
        <div className="grid gap-3 sm:grid-cols-3">
          {fontOptions.map((option) => (
            <label key={option.id} className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${settings.fontScale === option.id ? 'border-brand-amber bg-brand-amber/10 text-brand-amberDeep' : 'border-white/60 text-brand-dusk'}`}>
              <input type="radio" name="font" className="sr-only" checked={settings.fontScale === option.id} onChange={() => setFontScale(option.id)} />
              {option.label}
              <p className="text-xs font-normal text-brand-dusk">{option.description}</p>
            </label>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup icon={<ShieldCheck size={18} />} title="AI style">
        <div className="space-y-3">
          {aiStyles.map((option) => (
            <label key={option.id} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${settings.aiStyle === option.id ? 'border-brand-sage bg-brand-sage/10 text-brand-sage' : 'border-white/60 text-brand-dusk'}`}>
              <div>
                <p className="text-lg font-semibold">{option.label}</p>
                <p className="text-sm text-brand-dusk">{option.description}</p>
              </div>
              <input type="radio" name="aiStyle" checked={settings.aiStyle === option.id} onChange={() => setAIStyle(option.id)} />
            </label>
          ))}
        </div>
      </SettingGroup>

      <div className="rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold text-brand-bark">Clinical disclaimer</p>
            <p className="text-sm text-brand-dusk">Toggle bedside reminder about verifying plans.</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" checked={settings.showDisclaimer} onChange={() => toggleDisclaimer()} />
            <span className="h-6 w-12 rounded-full bg-brand-sand peer-checked:bg-brand-amber" />
            <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:left-7" />
          </label>
        </div>
      </div>

      <div className="rounded-[28px] border border-dashed border-brand-sand/60 bg-brand-linen/50 p-6 text-sm text-brand-dusk">
        <p className="font-semibold text-brand-bark">About Nelson-GPT</p>
        <p>Version 1.0 · Powered by Supabase pgvector, LangChain orchestration, and the Mistral API for streaming completions.</p>
        <p className="mt-2">Offline caching stores your five most recent conversations for safe ward access.</p>
      </div>
    </div>
  )
}

function SettingGroup({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.4em] text-brand-dusk">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}
