import { useEffect, useRef } from 'react'
import type { Message } from '@/types/chat'
import { MessageBubble } from '@/components/chat/MessageBubble'

interface ChatTimelineProps {
  messages: Message[]
}

export function ChatTimeline({ messages }: ChatTimelineProps) {
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  return (
    <div className="space-y-5">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={anchorRef} />
    </div>
  )
}
