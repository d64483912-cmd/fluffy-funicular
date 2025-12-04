import { motion } from 'framer-motion'
import { useChatStore } from '@/store/chatStore'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ChatTimeline } from '@/components/chat/ChatTimeline'
import { ChatFooterDock } from '@/components/chat/ChatFooterDock'

export function ChatView() {
  const session = useChatStore((state) => state.sessions.find((item) => item.id === state.activeSessionId))

  if (!session) {
    return (
      <div className="rounded-[32px] border border-dashed border-brand-sand/60 bg-white/70 p-10 text-center text-brand-dusk">
        Start a conversation to see Nelson-GPT in action.
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
