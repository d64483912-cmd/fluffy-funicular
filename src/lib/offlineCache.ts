import type { ChatSession } from '@/types/chat'
import { capSessionsForOffline } from '@/lib/utils'

const HISTORY_ENDPOINT = '/offline/chat-history'

export function syncHistoryOffline(sessions: ChatSession[]) {
  if (typeof window === 'undefined') return
  if (!navigator.serviceWorker?.controller) return
  const payload = capSessionsForOffline(sessions)
  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_CHAT_HISTORY',
    payload,
  })
}

export async function readCachedHistory(): Promise<ChatSession[]> {
  try {
    const response = await fetch(HISTORY_ENDPOINT)
    if (!response.ok) return []
    return (await response.json()) as ChatSession[]
  } catch {
    return []
  }
}
