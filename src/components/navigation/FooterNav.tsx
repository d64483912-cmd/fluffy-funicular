import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, History, Settings2, UserRound } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

type Tab = 'chat' | 'history' | 'settings' | 'profile'

const tabs: Array<{ id: Tab; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

export function FooterNav() {
  const activeTab = useUIStore((state) => state.activeTab)
  const setActiveTab = useUIStore((state) => state.setActiveTab)

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[min(520px,calc(100%-32px))] -translate-x-1/2 rounded-[28px] border border-white/60 bg-white/80 p-2 shadow-panel backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold text-brand-dusk"
            >
              {isActive && (
                <motion.span layoutId="footer-active" className="absolute inset-0 rounded-2xl bg-brand-amber/15" />
              )}
              <Icon size={18} className={isActive ? 'text-brand-amber' : 'text-brand-dusk'} />
              <span className={isActive ? 'text-brand-amber' : ''}>{tab.label}</span>
            </button>
          )}
        })}
      </div>
    </nav>
  )
}
