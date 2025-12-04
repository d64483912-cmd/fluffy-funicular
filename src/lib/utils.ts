import { format, formatDistanceToNow } from 'date-fns'
import type { ChatSession } from '@/types/chat'

export const nowISO = () => new Date().toISOString()

export function deriveTitleFromPrompt(prompt: string) {
  const trimmed = prompt.replace(/\s+/g, ' ').trim()
  if (!trimmed) return 'Untitled'
  const words = trimmed.split(' ').slice(0, 6)
  return words.map((word, index) => {
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1)
    }
    return word
  }).join(' ')
}

export function formatSessionTimestamp(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch (error) {
    return ''
  }
}

export function shortDate(iso: string) {
  try {
    return format(new Date(iso), 'MMM d, HH:mm')
  } catch (error) {
    return iso
  }
}

export function sanitizePrompt(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export function capSessionsForOffline(sessions: ChatSession[], limit = 5) {
  return [...sessions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
}
