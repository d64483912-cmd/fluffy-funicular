import { useRef, useState } from 'react'
import { Mic, Send, Square } from 'lucide-react'
import clsx from 'clsx'
import { useChatStore } from '@/store/chatStore'
import { useAutosizeTextArea } from '@/hooks/useAutosizeTextArea'
import { ModeToggle } from '@/components/shared/ModeToggle'
import { TypingIndicator } from '@/components/chat/TypingIndicator'

export function ChatFooterDock() {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const stopStreaming = useChatStore((state) => state.stopStreaming)
  const regenerateLast = useChatStore((state) => state.regenerateLast)
  const isStreaming = useChatStore((state) => state.isStreaming)
  const typingIndicator = useChatStore((state) => state.typingIndicator)
  const hasAssistantMessage = useChatStore((state) => {
    const session = state.sessions.find((item) => item.id === state.activeSessionId)
    return Boolean(session && session.messages.some((message) => message.role === 'assistant'))
  })

  useAutosizeTextArea(textareaRef, value)

  const handleSend = () => {
    if (!value.trim()) return
    void sendMessage(value)
    setValue('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 sm:bottom-28">
      <div className="pointer-events-auto w-full max-w-3xl">
        <div className="mb-3 flex justify-center">
          <ModeToggle />
        </div>
        <div className="rounded-[28px] border border-white/60 bg-white/95 p-4 shadow-panel backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-sand/60 text-brand-dusk"
              aria-label="Voice input"
            >
              <Mic size={18} />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask about pediatric conditions, guidelines, or treatments…"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 resize-none bg-transparent text-base text-brand-bark placeholder:text-brand-dusk/60 focus:outline-none"
              disabled={isStreaming}
            />
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-dusk/10 px-3 py-2 text-sm font-semibold text-brand-dusk"
                >
                  <Square size={14} /> Stop
                </button>
              ) : (
                hasAssistantMessage && (
                  <button
                    type="button"
                    onClick={() => void regenerateLast()}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-amber/40 px-3 py-2 text-sm font-semibold text-brand-amber"
                  >
                    Regenerate
                  </button>
                )
              )}
              <button
                type="button"
                onClick={handleSend}
                disabled={!value.trim() || isStreaming}
                className={clsx(
                  'flex h-11 w-11 items-center justify-center rounded-full text-white shadow-glow transition',
                  value.trim() && !isStreaming ? 'bg-brand-amber hover:bg-brand-amberDeep' : 'bg-brand-amber/40'
                )}
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          {typingIndicator && <TypingIndicator />}
        </div>
      </div>
    </div>
  )
}
