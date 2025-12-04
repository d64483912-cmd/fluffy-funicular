import { motion } from 'framer-motion'
import { HeroComposer } from '@/components/chat/HeroComposer'
import { QuickToolsPanel } from '@/components/quick-tools/QuickToolsPanel'

export function WelcomeScreen() {
  return (
    <div className="flex flex-col gap-10">
      <motion.div
        className="mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-sm uppercase tracking-[0.4em] text-brand-dusk">Pediatric Knowledge Assistant</p>
        <h1 className="mt-4 text-4xl font-semibold text-brand-bark sm:text-5xl">
          Ask about pediatric conditions, guidelines, or treatments…
        </h1>
        <p className="mt-4 text-lg text-brand-dusk">
          Evidence-based reasoning inspired by the Nelson Textbook of Pediatrics with citations every step of the way.
        </p>
      </motion.div>

      <HeroComposer />

      <QuickToolsPanel />
    </div>
  )
}
