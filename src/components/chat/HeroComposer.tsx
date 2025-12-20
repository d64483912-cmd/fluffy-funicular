import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useAutosizeTextArea } from '@/hooks/useAutosizeTextArea'
import { ModeToggle } from '@/components/shared/ModeToggle'

export function HeroComposer() {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()
  const sendMessage = useChatStore((state) => state.sendMessage)
  const isStreaming = useChatStore((state) => state.isStreaming)

  useAutosizeTextArea(textareaRef, value)

  const handleSend = async () => {
    if (!value.trim()) return
    await sendMessage(value)
    setValue('')
    const sessionId = useChatStore.getState().activeSessionId
    if (sessionId) {
      navigate(`/chat/${sessionId}`)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <section className="relative rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-hero backdrop-blur-xl sm:p-10">
      <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-br from-brand-amber/5 via-transparent to-brand-sage/10" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-brand-dusk">Dual Operating Modes</p>
            <h2 className="text-2xl font-semibold text-brand-bark">Academic depth or clinical brevity, you choose.</h2>
          </div>
          <ModeToggle />
        </div>

        <div className="rounded-[28px] border border-outline-subtle bg-surface-raised px-5 py-4 shadow-soft">
          <textarea
            ref={textareaRef}
            rows={3}
            maxLength={1200}
            placeholder="Ask about pediatric conditions, guidelines, or treatments…"
            className="w-full resize-none bg-transparent text-lg text-brand-bark placeholder:text-brand-dusk/60 focus:outline-none"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <div className="mt-4 flex items-center justify-between text-sm text-brand-dusk">
            <span>Streaming answers with inline citations & follow-up prompts.</span>
            <button
              type="button"
              onClick={handleSend}
              disabled={!value.trim() || isStreaming}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-amber text-white shadow-glow transition hover:bg-brand-amberDeep disabled:cursor-not-allowed disabled:bg-brand-amber/40"
              aria-label="Send question"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-brand-dusk/80">
          <span className="rounded-full bg-brand-amber/15 px-4 py-1 text-brand-amberDeep">Evidence linked</span>
          <span className="rounded-full bg-brand-sage/15 px-4 py-1 text-brand-sage">Citation badges</span>
          <span className="rounded-full bg-brand-dusk/10 px-4 py-1 text-brand-dusk">Streaming token view</span>
        </div>
      </div>
    </section>
  )
}
