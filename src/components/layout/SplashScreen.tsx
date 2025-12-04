import { motion } from 'framer-motion'

export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-brand-ivory via-brand-sand to-brand-beige text-brand-bark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="rounded-[36px] border border-white/40 bg-white/70 px-12 py-10 text-center shadow-glow backdrop-blur-xl"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
      >
        <div className="mb-6 text-sm uppercase tracking-[0.35em] text-brand-dusk">
          Nelson-GPT
        </div>
        <motion.div
          className="relative mb-4 overflow-hidden whitespace-nowrap text-4xl font-semibold"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        >
          Nelson-GPT
          <span className="ml-1 animate-pulse text-brand-amber">▌</span>
        </motion.div>
        <p className="text-lg text-brand-dusk">Trusted Pediatric AI</p>
        <div className="mt-8 text-sm text-brand-dusk/80">
          Pediatric Knowledge at Your Fingertips — Powered by Nelson Textbook of Pediatrics.
        </div>
      </motion.div>
    </motion.div>
  )
}
