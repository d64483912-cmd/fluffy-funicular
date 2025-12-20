import type { ComponentType } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, History, Settings2, UserRound } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'

type Tab = 'chat' | 'history' | 'settings' | 'profile'

const tabs: Array<{ id: Tab; label: string; icon: ComponentType<{ size?: number }>; path: string }> = [
  { id: 'chat', label: 'Chat', icon: MessageCircle, path: '/welcome' },
  { id: 'history', label: 'History', icon: History, path: '/history' },
  { id: 'settings', label: 'Settings', icon: Settings2, path: '/settings' },
  { id: 'profile', label: 'Profile', icon: UserRound, path: '/profile' },
]

export function FooterNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeSessionId = useChatStore((state) => state.activeSessionId)

  const getActiveTab = (): Tab => {
    if (location.pathname.startsWith('/chat/')) return 'chat'
    if (location.pathname.startsWith('/history')) return 'history'
    if (location.pathname.startsWith('/settings')) return 'settings'
    if (location.pathname.startsWith('/profile')) return 'profile'
    return 'chat'
  }

  const activeTab = getActiveTab()

  const handleTabClick = (tab: Tab, path: string) => {
    if (tab === 'chat') {
      if (activeSessionId) {
        navigate(`/chat/${activeSessionId}`)
      } else {
        navigate('/welcome')
      }
    } else {
      navigate(path)
    }
  }

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
              onClick={() => handleTabClick(tab.id, tab.path)}
              className="relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold text-brand-dusk"
            >
              {isActive && (
                <motion.span layoutId="footer-active" className="absolute inset-0 rounded-2xl bg-brand-amber/15" />
              )}
              <div className={isActive ? 'text-brand-amber' : 'text-brand-dusk'}>
                <Icon size={18} />
              </div>
              <span className={isActive ? 'text-brand-amber' : ''}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
