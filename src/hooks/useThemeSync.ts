import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

const FONT_SCALE: Record<string, number> = {
  sm: 0.94,
  md: 1,
  lg: 1.08,
}

export function useThemeSync() {
  const theme = useUIStore((state) => state.settings.theme)
  const fontScale = useUIStore((state) => state.settings.fontScale)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const scale = FONT_SCALE[fontScale] ?? 1
    document.documentElement.style.setProperty('--font-scale', String(scale))
  }, [fontScale])
}
