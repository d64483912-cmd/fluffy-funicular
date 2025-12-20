import type { ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock3, MessageCircleMore, Pin, Trash2, PencilLine } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { formatSessionTimestamp } from '@/lib/utils'

export function HistoryPanel() {
  const navigate = useNavigate()
  const sessions = useChatStore((state) => state.sessions)
  const selectSession = useChatStore((state) => state.selectSession)
  const deleteSession = useChatStore((state) => state.deleteSession)
  const renameSession = useChatStore((state) => state.renameSession)
  const togglePin = useChatStore((state) => state.togglePin)

  const pinned = sessions.filter((session) => session.pinned)
  const recent = sessions.filter((session) => !session.pinned)

  const openSession = (id: string) => {
    selectSession(id)
    navigate(`/chat/${id}`)
  }

  const handleRename = (id: string, current: string) => {
    const next = window.prompt('Rename conversation', current)
    if (next && next.trim()) {
      renameSession(id, next.trim())
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeading title="Pinned" icon={Pin} />
      {pinned.length === 0 && <EmptyState message="Pin chats you revisit often." />}
      <div className="grid gap-4 md:grid-cols-2">
        {pinned.map((session) => (
          <HistoryCard
            key={session.id}
            session={session}
            onOpen={() => openSession(session.id)}
            onRename={() => handleRename(session.id, session.title)}
            onDelete={() => deleteSession(session.id)}
            onPin={() => togglePin(session.id)}
          />
        ))}
      </div>

      <SectionHeading title="Recent" icon={Clock3} />
      {recent.length === 0 && <EmptyState message="Your future consults will appear here." />}
      <div className="grid gap-4 md:grid-cols-2">
        {recent.map((session) => (
          <HistoryCard
            key={session.id}
            session={session}
            onOpen={() => openSession(session.id)}
            onRename={() => handleRename(session.id, session.title)}
            onDelete={() => deleteSession(session.id)}
            onPin={() => togglePin(session.id)}
          />
        ))}
      </div>
    </div>
  )
}

type SessionType = ReturnType<typeof useChatStore.getState>['sessions'][number]

function SectionHeading({ title, icon: Icon }: { title: string; icon: ComponentType<{ size?: number }> }) {
  return (
    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.4em] text-brand-dusk">
      <Icon size={16} />
      {title}
    </div>
  )
}

function HistoryCard({
  session,
  onOpen,
  onRename,
  onDelete,
  onPin,
}: {
  session: SessionType
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
  onPin: () => void
}) {
  const summary = `${session.messages.filter((message) => message.role === 'user').length} questions · ${session.messages.filter((message) => message.role === 'assistant').length} answers`
  return (
    <article className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur">
      <button onClick={onOpen} className="text-left">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-brand-dusk">
          <MessageCircleMore size={16} />
          {session.mode} mode
        </div>
        <h3 className="mt-2 text-2xl font-semibold text-brand-bark">{session.title}</h3>
        <p className="text-sm text-brand-dusk">{summary}</p>
        <p className="text-xs text-brand-dusk">Updated {formatSessionTimestamp(session.updatedAt)}</p>
      </button>
      <div className="mt-4 flex gap-2">
        <PanelButton icon={Pin} label={session.pinned ? 'Unpin' : 'Pin'} onClick={onPin} />
        <PanelButton icon={PencilLine} label="Rename" onClick={onRename} />
        <PanelButton icon={Trash2} label="Delete" tone="error" onClick={onDelete} />
      </div>
    </article>
  )
}

function PanelButton({ icon: Icon, label, onClick, tone }: { icon: ComponentType<{ size?: number }>; label: string; onClick: () => void; tone?: 'error' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 rounded-2xl border px-3 py-2 text-sm font-semibold ${tone === 'error' ? 'border-red-200 text-red-500' : 'border-brand-sand text-brand-dusk'}`}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-3xl border border-dashed border-brand-sand/60 bg-white/60 px-4 py-6 text-brand-dusk">{message}</div>
}
