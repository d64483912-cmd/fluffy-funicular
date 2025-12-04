export type ChatMode = 'academic' | 'clinical'
export type MessageRole = 'user' | 'assistant'
export type AIStyle = 'concise' | 'detailed' | 'evidence'
export type ThemeMode = 'light' | 'dark'
export type FontScale = 'sm' | 'md' | 'lg'

export interface Citation {
  id: string
  title: string
  chapter?: string
  page?: string
  snippet?: string
  url?: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  mode: ChatMode
  citations?: Citation[]
  followUps?: string[]
  streaming?: boolean
  evidenceAligned?: boolean
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  mode: ChatMode
  pinned: boolean
  messages: Message[]
}

export interface QuickToolItem {
  label: string
  value: string
  description?: string
}

export interface QuickTool {
  id: string
  title: string
  accent: 'amber' | 'sage' | 'mauve'
  summary: string
  meta: string
  items: QuickToolItem[]
  link?: {
    label: string
    href: string
  }
}

export interface SettingsState {
  theme: ThemeMode
  fontScale: FontScale
  aiStyle: AIStyle
  showDisclaimer: boolean
}
