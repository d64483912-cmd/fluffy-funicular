import { createParser } from 'eventsource-parser'
import { mockNelsonResponse } from '@/data/mockNelsonResponse'
import type { AIStyle, ChatMode, Citation, Message } from '@/types/chat'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface StreamNelsonOptions {
  prompt: string
  mode: ChatMode
  aiStyle: AIStyle
  history: Pick<Message, 'role' | 'content'>[]
  signal: AbortSignal
  onToken: (token: string) => void
  onSources?: (citations: Citation[]) => void
  onFollowups?: (followUps: string[]) => void
  onEvidence?: (value: boolean) => void
}

interface StreamPayload {
  type: 'token' | 'sources' | 'followups' | 'evidence' | 'done' | 'error'
  token?: string
  citations?: Citation[]
  followUps?: string[]
  value?: boolean
  message?: string
}

async function callNelsonApi({
  prompt,
  mode,
  aiStyle,
  history,
  signal,
  onToken,
  onSources,
  onFollowups,
  onEvidence,
}: StreamNelsonOptions) {
  const response = await fetch(`${API_BASE}/rag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, mode, aiStyle, history }),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error('RAG endpoint unavailable')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  const parser = createParser((event) => {
    if (event.type !== 'event') return
    try {
      const payload = JSON.parse(event.data) as StreamPayload
      switch (payload.type) {
        case 'token':
          if (payload.token) onToken(payload.token)
          break
        case 'sources':
          if (payload.citations) onSources?.(payload.citations)
          break
        case 'followups':
          if (payload.followUps) onFollowups?.(payload.followUps)
          break
        case 'evidence':
          if (typeof payload.value === 'boolean') onEvidence?.(payload.value)
          break
        case 'error':
          throw new Error(payload.message ?? 'Stream error')
        default:
          break
      }
    } catch (error) {
      console.error('Unable to parse stream payload', error)
    }
  })

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parser.feed(decoder.decode(value, { stream: true }))
  }
}

async function mockStream(options: StreamNelsonOptions) {
  const mock = await mockNelsonResponse(options.prompt)
  for (const token of mock.tokens) {
    if (options.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    options.onToken(`${token} `)
    await new Promise((resolve) => setTimeout(resolve, 35))
  }
  options.onSources?.(mock.citations)
  options.onFollowups?.(mock.followUps)
  options.onEvidence?.(mock.evidenceAligned ?? false)
}

export const ragClient = {
  async streamChat(options: StreamNelsonOptions) {
    try {
      await callNelsonApi(options)
    } catch (error) {
      console.warn('Falling back to mock Nelson response', error)
      await mockStream(options)
    }
  },
  async healthcheck() {
    try {
      const res = await fetch(`${API_BASE}/health`)
      return res.ok
    } catch (error) {
      return false
    }
  },
}
