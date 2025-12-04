import { useState } from 'react'
import { BookOpenCheck, ShieldCheck, UserRound } from 'lucide-react'
import clsx from 'clsx'
import type { Message } from '@/types/chat'
import { MarkdownContent } from '@/components/chat/MarkdownContent'
import { useChatStore } from '@/store/chatStore'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div
      className={clsx('flex w-full gap-3', {
        'justify-end': isUser,
        'justify-start': !isUser,
      })}
    >
      {!isUser && (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-amber/20 text-brand-amber font-semibold text-lg shadow-soft">
          N
        </div>
      )}
      <div
        className={clsx(
          'relative max-w-2xl rounded-[24px] border px-5 py-4 shadow-soft',
          isUser
            ? 'border-brand-sand bg-brand-linen text-brand-bark'
            : 'border-white/50 bg-white/95 text-brand-charcoal'
        )}
      >
        {isUser ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-dusk">
            <UserRound size={16} />
            You
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-dusk">
            <ShieldCheck size={16} className="text-brand-amber" />
            Nelson-GPT · {message.mode === 'academic' ? 'Academic' : 'Clinical'} mode
          </div>
        )}

        <div className="mt-3 text-base leading-relaxed">
          <MarkdownContent content={message.content} />
        </div>

        {!isUser && (
          <div className="mt-4 space-y-3 text-sm">
            {message.evidenceAligned && (
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-sage/15 px-3 py-1 text-xs font-semibold text-brand-sage">
                <ShieldCheck size={14} /> Evidence-aligned answer
              </div>
            )}
            {message.citations && message.citations.length > 0 && (
              <div className="rounded-2xl border border-dashed border-brand-sand/70 bg-brand-linen/60 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-dusk">
                    <BookOpenCheck size={16} /> Citations
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {message.citations.map((citation, index) => (
                      <span
                        key={citation.id}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-amber"
                      >
                        {index + 1}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSources((prev) => !prev)}
                    className="ml-auto text-xs font-semibold text-brand-amber hover:text-brand-amberDeep"
                  >
                    {showSources ? 'Hide sources' : 'Show sources'}
                  </button>
                </div>
                {showSources && (
                  <div className="mt-3 space-y-3 text-sm">
                    {message.citations.map((citation, index) => (
                      <div key={citation.id} className="rounded-2xl bg-white/80 px-4 py-3 shadow-inset">
                        <div className="flex items-center gap-2 text-brand-bark">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-amber/20 text-xs font-semibold text-brand-amber">
                            {index + 1}
                          </span>
                          <div className="font-semibold">{citation.title}</div>
                        </div>
                        <p className="text-xs text-brand-dusk">{citation.chapter ? `${citation.chapter} · ` : ''}p.{citation.page}</p>
                        {citation.snippet && <p className="text-sm text-brand-charcoal">{citation.snippet}</p>}
                        {citation.url && (
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-brand-amber hover:text-brand-amberDeep"
                          >
                            Open reference
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <FollowUpChips prompts={message.followUps} />
          </div>
        )}
      </div>
    </div>
  )
}

function FollowUpChips({ prompts }: { prompts?: string[] }) {
  const sendMessage = useChatStore((state) => state.sendMessage)
  if (!prompts || prompts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => void sendMessage(prompt)}
          className="rounded-full border border-brand-amber/40 px-3 py-1 text-xs font-semibold text-brand-amber hover:bg-brand-amber/10"
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
