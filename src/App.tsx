import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { WelcomeScreen } from '@/components/layout/WelcomeScreen'
import { ChatView } from '@/components/chat/ChatView'
import { FooterNav } from '@/components/navigation/FooterNav'
import { HistoryPanel } from '@/components/panels/HistoryPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ProfilePanel } from '@/components/panels/ProfilePanel'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { useThemeSync } from '@/hooks/useThemeSync'

function useActiveSessionExists() {
  return useChatStore((state) => {
    if (!state.activeSessionId) return false
    const session = state.sessions.find((item) => item.id === state.activeSessionId)
    return Boolean(session && session.messages.length > 0)
  })
}

export default function App() {
  const showSplash = useUIStore((state) => state.showSplash)
  const hideSplash = useUIStore((state) => state.hideSplash)
  const activeTab = useUIStore((state) => state.activeTab)
  const showDisclaimer = useUIStore((state) => state.settings.showDisclaimer)
  const hasChat = useActiveSessionExists()

  useThemeSync()

  useEffect(() => {
    if (!showSplash) return
    const timer = window.setTimeout(() => hideSplash(), 2400)
    return () => window.clearTimeout(timer)
  }, [showSplash, hideSplash])

  const content = useMemo(() => {
    if (activeTab === 'history') return <HistoryPanel />
    if (activeTab === 'settings') return <SettingsPanel />
    if (activeTab === 'profile') return <ProfilePanel />
    return hasChat ? <ChatView /> : <WelcomeScreen />
  }, [activeTab, hasChat])

  return (
    <div className="relative flex min-h-screen flex-col items-center pb-32 pt-8">
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
      <motion.div
        className="w-full max-w-6xl flex-1 px-4 sm:px-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <header className="mb-10 flex flex-col gap-3 text-center sm:text-left">
          <div className="mx-auto flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.5em] text-brand-dusk shadow-soft backdrop-blur sm:mx-0">
            Nelson-GPT
            <span className="h-1.5 w-1.5 rounded-full bg-brand-amber" />
            Trusted Pediatric AI
          </div>
          <h1 className="text-3xl font-semibold text-brand-bark sm:text-4xl">Pediatric knowledge at your fingertips.</h1>
          <p className="text-base text-brand-dusk">
            Inspired by the Nelson Textbook of Pediatrics · Retrieval augmented generation · Inline citations every time.
          </p>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${hasChat}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="pb-32"
          >
            {content}
            {activeTab === 'chat' && showDisclaimer && (
              <div className="mt-6 rounded-3xl border border-dashed border-brand-sand/70 bg-brand-linen/70 px-5 py-4 text-sm text-brand-dusk">
                Nelson-GPT does not replace clinical judgment. Confirm dosing and plans within your institution&apos;s policies before acting.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <FooterNav />
    </div>
  )
}
