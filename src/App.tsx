import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { WelcomeScreen } from '@/components/layout/WelcomeScreen'
import { ChatView } from '@/components/chat/ChatView'
import { FooterNav } from '@/components/navigation/FooterNav'
import { HistoryPanel } from '@/components/panels/HistoryPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ProfilePanel } from '@/components/panels/ProfilePanel'
import { useUIStore } from '@/store/uiStore'
import { useThemeSync } from '@/hooks/useThemeSync'

export default function App() {
  const showSplash = useUIStore((state) => state.showSplash)
  const hideSplash = useUIStore((state) => state.hideSplash)
  const location = useLocation()
  const navigate = useNavigate()

  useThemeSync()

  useEffect(() => {
    if (!showSplash) return
    const timer = window.setTimeout(() => {
      hideSplash()
      if (location.pathname === '/' || location.pathname === '/splash') {
        navigate('/welcome')
      }
    }, 2400)
    return () => window.clearTimeout(timer)
  }, [showSplash, hideSplash, navigate, location.pathname])

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-gradient-to-b from-brand-ivory via-surface-base to-brand-linen pb-32 pt-8">
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
      <motion.div
        className="w-full max-w-6xl flex-1 px-4 sm:px-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/splash" replace />} />
            <Route path="/splash" element={<SplashScreen />} />
            <Route
              path="/welcome"
              element={
                <MainLayout>
                  <WelcomeScreen />
                </MainLayout>
              }
            />
            <Route
              path="/chat/:id"
              element={
                <MainLayout showDisclaimer>
                  <ChatView />
                </MainLayout>
              }
            />
            <Route
              path="/history"
              element={
                <MainLayout>
                  <HistoryPanel />
                </MainLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <MainLayout>
                  <SettingsPanel />
                </MainLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <MainLayout>
                  <ProfilePanel />
                </MainLayout>
              }
            />
          </Routes>
        </AnimatePresence>
      </motion.div>
      <FooterNav />
    </div>
  )
}

function MainLayout({ children, showDisclaimer }: { children: React.ReactNode; showDisclaimer?: boolean }) {
  const disclaimerEnabled = useUIStore((state) => state.settings.showDisclaimer)

  return (
    <>
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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35 }}
        className="pb-32"
      >
        {children}
        {showDisclaimer && disclaimerEnabled && (
          <div className="mt-6 rounded-3xl border border-dashed border-brand-sand/70 bg-brand-linen/70 px-5 py-4 text-sm text-brand-dusk">
            Nelson-GPT does not replace clinical judgment. Confirm dosing and plans within your institution&apos;s
            policies before acting.
          </div>
        )}
      </motion.div>
    </>
  )
}
