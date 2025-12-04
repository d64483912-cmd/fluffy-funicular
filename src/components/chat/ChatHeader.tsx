import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MoreHorizontal, PenLine, Pin, Share2, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ChatSession } from '@/types/chat'
import { useUIStore } from '@/store/uiStore'
import { useChatStore } from '@/store/chatStore'
import { shortDate } from '@/lib/utils'

interface ChatHeaderProps {
  session: ChatSession
}

export function ChatHeader({ session }: ChatHeaderProps) {
  const setActiveTab = useUIStore((state) => state.setActiveTab)
  const renameSession = useChatStore((state) => state.renameSession)
  const deleteSession = useChatStore((state) => state.deleteSession)
  const togglePin = useChatStore((state) => state.togglePin)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleRename = () => {
    const next = window.prompt('Rename conversation', session.title)
    if (next && next.trim()) {
      renameSession(session.id, next.trim())
    }
  }

  const handleShare = async () => {
    const joined = session.messages
      .map((message) => `${message.role === 'user' ? 'You' : 'Nelson-GPT'}: ${message.content}`)
      .join('\n\n')
    try {
      await navigator.clipboard.writeText(joined)
      alert('Conversation copied to clipboard')
    } catch (error) {
      alert('Unable to copy conversation on this device.')
    }
    setMenuOpen(false)
  }

  const handleDelete = () => {
    if (window.confirm('Delete this conversation?')) {
      deleteSession(session.id)
    }
    setMenuOpen(false)
  }

  return (
    <div className="sticky top-2 z-20 mb-6 flex items-center justify-between rounded-[24px] border border-white/50 bg-white/90 px-4 py-3 shadow-panel backdrop-blur">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-white/60 px-3 py-1.5 text-sm font-semibold text-brand-dusk"
        onClick={() => setActiveTab('history')}
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">History</span>
      </button>
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-brand-dusk/70">Active chat</p>
        <h2 className="text-lg font-semibold text-brand-bark">{session.title}</h2>
        <p className="text-xs text-brand-dusk">Updated {shortDate(session.updatedAt)}</p>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="rounded-full border border-white/60 bg-white/60 p-2 text-brand-dusk"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-3 w-48 rounded-2xl border border-white/70 bg-white/95 p-2 text-sm shadow-panel">
            <MenuItem icon={PenLine} label="Rename" onClick={handleRename} />
            <MenuItem icon={Share2} label="Share" onClick={handleShare} />
            <MenuItem icon={Pin} label={session.pinned ? 'Unpin' : 'Pin'} onClick={() => togglePin(session.id)} />
            <MenuItem icon={Trash2} label="Delete" tone="error" onClick={handleDelete} />
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, tone }: { icon: LucideIcon; label: string; onClick: () => void; tone?: 'error' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-brand-bark hover:bg-brand-linen/60'
      }
    >
      <Icon size={16} className={tone === 'error' ? 'text-red-500' : 'text-brand-dusk'} />
      <span className={tone === 'error' ? 'text-red-500' : ''}>{label}</span>
    </button>
  )
}
