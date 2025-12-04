import { ExternalLink } from 'lucide-react'
import { quickTools } from '@/data/quickTools'

const accentMap: Record<string, string> = {
  amber: 'from-brand-amber/15 to-brand-amber/5 border-brand-amber/40 text-brand-amberDeep',
  sage: 'from-brand-sage/15 to-brand-sage/5 border-brand-sage/30 text-brand-sage',
  mauve: 'from-brand-dusk/15 to-brand-dusk/5 border-brand-dusk/30 text-brand-dusk',
}

export function QuickToolsPanel() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {quickTools.map((tool) => (
        <article
          key={tool.id}
          className={`rounded-3xl border bg-gradient-to-br p-6 shadow-soft backdrop-blur ${accentMap[tool.accent]}`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-brand-dusk/70">Quick Access</p>
              <h3 className="text-2xl font-semibold text-brand-bark">{tool.title}</h3>
              <p className="text-sm text-brand-dusk">{tool.summary}</p>
            </div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-brand-dusk">
              {tool.meta}
            </span>
          </div>
          <div className="space-y-3">
            {tool.items.map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/70 px-4 py-3 text-left shadow-inset">
                <div className="flex items-center justify-between text-sm font-semibold text-brand-charcoal">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                {item.description && <p className="text-xs text-brand-dusk">{item.description}</p>}
              </div>
            ))}
          </div>
          {tool.link && (
            <a
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-amber hover:text-brand-amberDeep"
              href={tool.link.href}
              target="_blank"
              rel="noreferrer"
            >
              {tool.link.label}
              <ExternalLink size={16} />
            </a>
          )}
        </article>
      ))}
    </section>
  )
}
