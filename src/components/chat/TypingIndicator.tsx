export function TypingIndicator() {
  return (
    <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-brand-dusk shadow-soft">
      Nelson-GPT is thinking
      <span className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-brand-amber animate-pulse-dots" />
        <span className="h-2 w-2 rounded-full bg-brand-amber animate-pulse-dots" style={{ animationDelay: '120ms' }} />
        <span className="h-2 w-2 rounded-full bg-brand-amber animate-pulse-dots" style={{ animationDelay: '240ms' }} />
      </span>
    </div>
  )
}
