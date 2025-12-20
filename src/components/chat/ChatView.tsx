import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useChatStore } from '@/store/chatStore'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatTimeline } from '@/components/chat/ChatTimeline'
import { ChatFooterDock } from '@/components/chat/ChatFooterDock'

export function ChatView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const selectSession = useChatStore((state) => state.selectSession)
  const session = useChatStore((state) => state.sessions.find((item) => item.id === id))

  useEffect(() => {
    if (id) {
      selectSession(id)
    }
  }, [id, selectSession])

  if (!session) {
    return (
      <div className="rounded-[32px] border border-dashed border-brand-sand/60 bg-white/70 p-10 text-center text-brand-dusk">
        <p className="mb-4">Session not found.</p>
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          className="rounded-full bg-brand-amber px-6 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-amberDeep"
        >
          Start New Chat
        </button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pb-48">
      <ChatHeader session={session} />
      <ChatTimeline messages={session.messages} />
      <ChatFooterDock />
    </motion.div>
  )
}
