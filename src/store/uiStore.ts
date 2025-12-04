import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AIStyle, FontScale, SettingsState, ThemeMode } from '@/types/chat'

type Tab = 'chat' | 'history' | 'settings' | 'profile'

interface UIStore {
  showSplash: boolean
  activeTab: Tab
  settings: SettingsState
  hideSplash: () => void
  setActiveTab: (tab: Tab) => void
  setTheme: (theme: ThemeMode) => void
  setFontScale: (scale: FontScale) => void
  setAIStyle: (style: AIStyle) => void
  toggleDisclaimer: (value?: boolean) => void
}

const defaultSettings: SettingsState = {
  theme: 'light',
  fontScale: 'md',
  aiStyle: 'detailed',
  showDisclaimer: true,
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      showSplash: true,
      activeTab: 'chat',
      settings: defaultSettings,
      hideSplash: () => set({ showSplash: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setTheme: (theme) =>
        set((state) => ({ settings: { ...state.settings, theme } })),
      setFontScale: (fontScale) =>
        set((state) => ({ settings: { ...state.settings, fontScale } })),
      setAIStyle: (aiStyle) =>
        set((state) => ({ settings: { ...state.settings, aiStyle } })),
      toggleDisclaimer: (value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            showDisclaimer: typeof value === 'boolean' ? value : !state.settings.showDisclaimer,
          },
        })),
    }),
    {
      name: 'nelson-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)
