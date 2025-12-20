import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { ChatMode, ChatSession, Message } from '@/types/chat'
import { ragClient } from '@/lib/ragClient'
import { deriveTitleFromPrompt, nowISO, sanitizePrompt, capSessionsForOffline } from '@/lib/utils'
import { syncHistoryOffline } from '@/lib/offlineCache'
import { useUIStore } from '@/store/uiStore'

interface ChatStore {
  sessions: ChatSession[]
  activeSessionId: string | null
  mode: ChatMode
  isStreaming: boolean
  typingIndicator: boolean
  error: string | null
  activeController: AbortController | null
  createSession: (title?: string) => string
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
  togglePin: (id: string) => void
  sendMessage: (prompt: string) => Promise<void>
  stopStreaming: () => void
  regenerateLast: () => Promise<void>
  setMode: (mode: ChatMode) => void
  clearError: () => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      mode: 'academic',
      isStreaming: false,
      typingIndicator: false,
      error: null,
      activeController: null,
      setMode: (mode) => set({ mode }),
      clearError: () => set({ error: null }),
      createSession: (title) => {
        const id = nanoid()
        const now = nowISO()
        const session: ChatSession = {
          id,
          title: title ?? 'Untitled',
          createdAt: now,
          updatedAt: now,
          mode: get().mode,
          pinned: false,
          messages: [],
        }
        set((state) => {
          const nextSessions = [session, ...state.sessions]
          syncHistoryOffline(nextSessions)
          return {
            sessions: nextSessions,
            activeSessionId: id,
          }
        })
        return id
      },
      selectSession: (id) => set({ activeSessionId: id, error: null }),
      deleteSession: (id) =>
        set((state) => {
          const nextSessions = state.sessions.filter((session) => session.id !== id)
          const nextActive = state.activeSessionId === id ? nextSessions[0]?.id ?? null : state.activeSessionId
          syncHistoryOffline(nextSessions)
          return { sessions: nextSessions, activeSessionId: nextActive }
        }),
      renameSession: (id, title) =>
        set((state) => {
          const nextSessions = state.sessions.map((session) =>
            session.id === id ? { ...session, title: title || session.title } : session
          )
          syncHistoryOffline(nextSessions)
          return { sessions: nextSessions }
        }),
      togglePin: (id) =>
        set((state) => {
          const nextSessions = state.sessions.map((session) =>
            session.id === id ? { ...session, pinned: !session.pinned } : session
          )
          syncHistoryOffline(nextSessions)
          return { sessions: nextSessions }
        }),
      stopStreaming: () => {
        const controller = get().activeController
        if (controller) {
          controller.abort()
        }
        set({ isStreaming: false, typingIndicator: false, activeController: null })
      },
      regenerateLast: async () => {
        const state = get()
        const active = state.sessions.find((session) => session.id === state.activeSessionId)
        if (!active) return
        const lastUser = [...active.messages].reverse().find((message) => message.role === 'user')
        if (!lastUser) return
        await state.sendMessage(lastUser.content)
      },
      sendMessage: async (rawPrompt: string) => {
        const prompt = sanitizePrompt(rawPrompt)
        if (!prompt || get().isStreaming) return

        const mode = get().mode
        const now = nowISO()
        const aiStyle = useUIStore.getState().settings.aiStyle

        let sessionId = get().activeSessionId
        if (!sessionId) {
          sessionId = get().createSession(deriveTitleFromPrompt(prompt))
        }

        let targetSession = get().sessions.find((session) => session.id === sessionId)
        if (!targetSession) {
          sessionId = get().createSession(deriveTitleFromPrompt(prompt))
          targetSession = get().sessions.find((session) => session.id === sessionId)
        }

        const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
          ...((targetSession?.messages ?? []).slice(-6).map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          })) ?? []),
          { role: 'user' as const, content: prompt },
        ]

        const userMessage: Message = {
          id: nanoid(),
          role: 'user',
          content: prompt,
          createdAt: now,
          mode,
        }

        const assistantMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: '',
          createdAt: now,
          mode,
          streaming: true,
        }

        set((state) => {
          const nextSessions = state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  title: session.messages.length === 0 ? deriveTitleFromPrompt(prompt) : session.title,
                  updatedAt: now,
                  messages: [...session.messages, userMessage, assistantMessage],
                }
              : session
          )
          return {
            sessions: nextSessions,
            isStreaming: true,
            typingIndicator: true,
            error: null,
          }
        })

        const controller = new AbortController()
        set({ activeController: controller })

        const finishStreaming = (nextSessions?: ChatSession[]) => {
          set({
            isStreaming: false,
            typingIndicator: false,
            activeController: null,
          })
          const sessionsToSync = nextSessions ?? get().sessions
          syncHistoryOffline(sessionsToSync)
        }

        try {
          await ragClient.streamChat({
            prompt,
            mode,
            aiStyle,
            history,
            signal: controller.signal,
            onToken: (token) => {
              set((state) => ({
                sessions: state.sessions.map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        messages: session.messages.map((message) =>
                          message.id === assistantMessage.id
                            ? { ...message, content: `${message.content}${token}` }
                            : message
                        ),
                      }
                    : session
                ),
              }))
            },
            onSources: (citations) => {
              set((state) => ({
                sessions: state.sessions.map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        messages: session.messages.map((message) =>
                          message.id === assistantMessage.id
                            ? { ...message, citations }
                            : message
                        ),
                      }
                    : session
                ),
              }))
            },
            onFollowups: (followUps) => {
              set((state) => ({
                sessions: state.sessions.map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        messages: session.messages.map((message) =>
                          message.id === assistantMessage.id
                            ? { ...message, followUps }
                            : message
                        ),
                      }
                    : session
                ),
              }))
            },
            onEvidence: (value) => {
              set((state) => ({
                sessions: state.sessions.map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        messages: session.messages.map((message) =>
                          message.id === assistantMessage.id
                            ? { ...message, evidenceAligned: value }
                            : message
                        ),
                      }
                    : session
                ),
              }))
            },
          })

          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    updatedAt: nowISO(),
                    messages: session.messages.map((message) =>
                      message.id === assistantMessage.id
                        ? { ...message, streaming: false }
                        : message
                    ),
                  }
                : session
            ),
          }))

          finishStreaming()
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            finishStreaming()
            return
          }
          set((state) => ({
            error: 'Unable to reach Nelson-GPT. Please try again.',
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: session.messages.map((message) =>
                      message.id === assistantMessage.id
                        ? {
                            ...message,
                            streaming: false,
                            content:
                              message.content ||
                              'We were unable to retrieve a sourced answer. Please retry when your connection is stable.',
                          }
                        : message
                    ),
                  }
                : session
            ),
          }))
          finishStreaming()
        }
      },
    }),
    {
      name: 'nelson-chat-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        sessions: capSessionsForOffline(state.sessions),
      }),
    }
  )
)
