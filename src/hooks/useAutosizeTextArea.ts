import { useEffect } from 'react'

export function useAutosizeTextArea(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.style.height = 'auto'
    const next = Math.min(node.scrollHeight, 220)
    node.style.height = `${next}px`
  }, [ref, value])
}
