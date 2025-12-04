import type { ReactNode } from 'react'
import { Download, LogOut, Mail, UserRoundCog } from 'lucide-react'

export function ProfilePanel() {
  return (
    <div className="rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-panel backdrop-blur">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-amber/20 text-3xl font-semibold text-brand-amber">
          JW
        </div>
        <h3 className="text-2xl font-semibold text-brand-bark">Dr. Jordan Winters</h3>
        <p className="text-sm text-brand-dusk">Pediatric Hospitalist · Children&apos;s Clinical Network</p>
        <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/70 px-4 py-1 text-sm text-brand-dusk">
          <Mail size={16} /> jordan.winters@nelson.ai
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ProfileAction icon={<Download size={18} />} label="Export data" description="Download all chats & settings." />
        <ProfileAction icon={<UserRoundCog size={18} />} label="Manage access" description="Device logins & alerts." />
      </div>

      <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-dusk/10 px-4 py-3 text-sm font-semibold text-brand-dusk">
        <LogOut size={16} /> Sign out
      </button>
    </div>
  )
}

function ProfileAction({ icon, label, description }: { icon: ReactNode; label: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-left">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-brand-sand/60 p-2 text-brand-dusk">{icon}</div>
        <div>
          <p className="text-lg font-semibold text-brand-bark">{label}</p>
          <p className="text-sm text-brand-dusk">{description}</p>
        </div>
      </div>
    </div>
  )
}
