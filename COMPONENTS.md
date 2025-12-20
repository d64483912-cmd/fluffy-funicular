# Component Library Documentation

This document provides inline documentation for the Nelson-GPT component library following the warm medical design system.

## Layout Components

### SplashScreen

**Location**: `src/components/layout/SplashScreen.tsx`

**Description**: Full-screen animated splash screen with typewriter effect and spring-based scaling.

**Animation Pattern**:
- Fade in/out: 0.4s duration
- Spring scale: stiffness 120, damping 12
- Typewriter: 1.4s ease-in-out with pulsing cursor

**Usage**:
```tsx
<SplashScreen />
```

Shows on app load and auto-hides after 2.4s.

---

### WelcomeScreen

**Location**: `src/components/layout/WelcomeScreen.tsx`

**Description**: Hero landing screen with centered heading, HeroComposer, and QuickTools panel.

**Layout**:
- Vertically stacked layout
- Centered content (max-width: 768px)
- Fade-up animation on mount

**Usage**:
```tsx
<WelcomeScreen />
```

Default route after splash screen.

---

## Chat Components

### HeroComposer

**Location**: `src/components/chat/HeroComposer.tsx`

**Description**: Large prominent composer for the welcome screen with mode toggle and feature badges.

**Features**:
- Auto-sizing textarea (max 3 rows visible)
- Mode toggle (Academic/Clinical)
- Amber circular send button
- Character limit: 1200
- Enter to send, Shift+Enter for newline

**Props**: None (controlled by Zustand store)

**Usage**:
```tsx
<HeroComposer />
```

---

### ChatView

**Location**: `src/components/chat/ChatView.tsx`

**Description**: Container component for active chat sessions. Uses React Router params to get session ID.

**Features**:
- Dynamic session loading from route
- Fallback for missing sessions
- Integrates ChatHeader, ChatTimeline, ChatFooterDock

**Props**: None (reads from route params)

**Usage**:
```tsx
// In React Router
<Route path="/chat/:id" element={<ChatView />} />
```

---

### ChatHeader

**Location**: `src/components/chat/ChatHeader.tsx`

**Description**: Sticky header for active chat with navigation and actions menu.

**Features**:
- Back button to history
- Session title and timestamp
- Three-dot menu: Rename, Share, Pin, Delete
- Glassmorphism backdrop blur

**Props**:
```tsx
interface ChatHeaderProps {
  session: ChatSession
}
```

**Usage**:
```tsx
<ChatHeader session={currentSession} />
```

---

### ChatTimeline

**Location**: `src/components/chat/ChatTimeline.tsx`

**Description**: Scrollable message timeline with user and AI message bubbles.

**Features**:
- Auto-scroll to latest message
- Fade-in animations for new messages
- Alternating left/right alignment
- Typing indicator support

**Props**:
```tsx
interface ChatTimelineProps {
  messages: Message[]
}
```

**Usage**:
```tsx
<ChatTimeline messages={session.messages} />
```

---

### ChatFooterDock

**Location**: `src/components/chat/ChatFooterDock.tsx`

**Description**: Fixed bottom input dock for active chat sessions.

**Features**:
- Auto-expanding textarea (max 2 lines)
- Voice button placeholder (left)
- Send button (right, amber when active)
- Mode toggle above input
- 64px height

**Props**: None (controlled by Zustand store)

**Usage**:
```tsx
<ChatFooterDock />
```

---

### MessageBubble

**Location**: `src/components/chat/MessageBubble.tsx`

**Description**: Individual message bubble with markdown support for AI messages.

**Features**:
- User bubbles: right-aligned, beige background (#F4EFEA)
- AI bubbles: left-aligned, white with amber accent and "N" avatar
- Citation badges (inline)
- Follow-up suggestion chips
- Evidence alignment badge
- Markdown rendering for AI messages

**Props**:
```tsx
interface MessageBubbleProps {
  message: Message
  onFollowUp?: (text: string) => void
}
```

**Usage**:
```tsx
<MessageBubble message={msg} onFollowUp={handleFollowUp} />
```

---

### MarkdownContent

**Location**: `src/components/chat/MarkdownContent.tsx`

**Description**: Wrapper for react-markdown with medical content styling.

**Features**:
- GitHub Flavored Markdown (tables, strikethrough, task lists)
- Auto-linked headings with slugs
- Sanitized HTML output
- Custom code block styling
- Table rendering with brand colors

**Props**:
```tsx
interface MarkdownContentProps {
  content: string
}
```

**Usage**:
```tsx
<MarkdownContent content={aiResponse} />
```

---

### TypingIndicator

**Location**: `src/components/chat/TypingIndicator.tsx`

**Description**: Three-dot pulsing animation indicating AI is generating response.

**Animation**: CSS keyframes with staggered pulse (1.4s cycle)

**Props**: None

**Usage**:
```tsx
{isStreaming && <TypingIndicator />}
```

---

## Navigation Components

### FooterNav

**Location**: `src/components/navigation/FooterNav.tsx`

**Description**: Fixed bottom navigation bar with 4 tabs.

**Features**:
- Fixed positioning (bottom: 16px)
- 4 tabs: Chat, History, Settings, Profile
- Animated active indicator (layoutId)
- React Router navigation
- Glassmorphism with backdrop blur

**Tabs**:
- 💬 Chat → /welcome or /chat/:id
- 🕘 History → /history
- ⚙️ Settings → /settings
- 👤 Profile → /profile

**Props**: None (controlled by React Router)

**Usage**:
```tsx
<FooterNav />
```

---

## Panel Components

### HistoryPanel

**Location**: `src/components/panels/HistoryPanel.tsx`

**Description**: Chat history with pinned and recent sections.

**Features**:
- Grid layout (1 col mobile, 2 cols tablet+)
- Pinned section (top)
- Recent section (below)
- Card actions: Open, Pin, Rename, Delete
- Empty states

**Props**: None (reads from Zustand store)

**Usage**:
```tsx
<HistoryPanel />
```

---

### SettingsPanel

**Location**: `src/components/settings/SettingsPanel.tsx`

**Description**: User preferences and app settings.

**Settings**:
- **Theme**: Light (Warm Light) or Dark (Calming Dark)
- **Typography**: Small, Comfort, Large
- **AI Style**: Concise, Detailed, Evidence heavy
- **Disclaimer**: Toggle clinical disclaimer banner

**Props**: None (controlled by UIStore)

**Usage**:
```tsx
<SettingsPanel />
```

---

### ProfilePanel

**Location**: `src/components/panels/ProfilePanel.tsx`

**Description**: User profile with placeholder actions.

**Features**:
- Avatar with initials
- User info display
- Action buttons: Export data, Manage access
- Sign out button

**Props**: None (placeholder data)

**Usage**:
```tsx
<ProfilePanel />
```

---

## Shared Components

### ModeToggle

**Location**: `src/components/shared/ModeToggle.tsx`

**Description**: Dual-mode pill toggle for Academic/Clinical reasoning modes.

**Features**:
- Two modes: Academic (amber) and Clinical (sage)
- Icons: GraduationCap and Stethoscope
- Layout variants: row (default) or stack
- Smooth transitions

**Props**:
```tsx
interface ModeToggleProps {
  layout?: 'row' | 'stack'
}
```

**Usage**:
```tsx
<ModeToggle layout="row" />
```

**State**: Controlled by `chatStore.mode`

---

## Quick Tools Components

### QuickToolsPanel

**Location**: `src/components/quick-tools/QuickToolsPanel.tsx`

**Description**: Grid of pediatric quick-access tools (growth charts, vaccines, dosing).

**Features**:
- Grid layout (1 col mobile, 3 cols desktop)
- Color-coded cards (amber, sage, mauve)
- Static data from `src/data/quickTools.ts`
- External links to detailed tools

**Props**: None (reads from static data)

**Usage**:
```tsx
<QuickToolsPanel />
```

---

## Design Tokens Reference

### Colors

**Primary**:
- `brand-amber`: #C9843B
- `brand-amberSoft`: #E5AF74
- `brand-amberDeep`: #A86424

**Backgrounds**:
- `brand-ivory`: #FFF9F1
- `brand-linen`: #F8F1E7
- `brand-sand`: #F0E2D1
- `brand-beige`: #E6D6C4

**Accents**:
- `brand-sage`: #7AA085
- `brand-jade`: #4E7B61

**Text**:
- `brand-bark`: #2C1A15 (primary)
- `brand-charcoal`: #3A2B24 (secondary)
- `brand-dusk`: #6F5B4B (muted)
- `brand-cloud`: #B9A89A (disabled)

### Border Radius

- `rounded-fluid`: 24px
- `rounded-pill`: 999px
- `rounded-[28px]`: Hero cards
- `rounded-[32px]`: Major panels

### Shadows

- `shadow-soft`: 0 10px 30px rgba(56, 33, 17, 0.12)
- `shadow-panel`: 0 18px 70px rgba(23, 15, 10, 0.15)
- `shadow-hero`: 0 25px 65px rgba(130, 86, 52, 0.18)
- `shadow-glow`: 0 20px 60px rgba(194, 132, 59, 0.25)

### Spacing

Base scale: 4, 8, 12, 16, 24, 32, 48 (px)

### Typography

- Font: Inter
- Base size: 16px
- Letter spacing: -0.01em (body)
- Tracking: 0.3-0.5em (uppercase labels)

---

## Component Patterns

### Glassmorphism Cards

```tsx
<div className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur">
  {/* Content */}
</div>
```

### Primary Action Button

```tsx
<button className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-amber text-white shadow-glow transition hover:bg-brand-amberDeep disabled:cursor-not-allowed disabled:bg-brand-amber/40">
  <Send size={18} />
</button>
```

### Pill Badge

```tsx
<span className="rounded-full bg-brand-amber/15 px-4 py-1 text-xs font-semibold text-brand-amberDeep">
  Evidence linked
</span>
```

### Section Heading

```tsx
<div className="flex items-center gap-2 text-sm uppercase tracking-[0.4em] text-brand-dusk">
  <Icon size={16} />
  Section Title
</div>
```

---

## Animation Guidelines

### Page Transitions

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -12 }}
  transition={{ duration: 0.35 }}
>
  {content}
</motion.div>
```

### Spring Animations

```tsx
<motion.div
  initial={{ scale: 0.94, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 120, damping: 12 }}
>
  {content}
</motion.div>
```

### Layout Transitions

```tsx
{isActive && (
  <motion.span 
    layoutId="unique-id" 
    className="absolute inset-0 rounded-2xl bg-brand-amber/15" 
  />
)}
```

---

## Responsive Patterns

### Mobile-First Grid

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Cards */}
</div>
```

### Conditional Display

```tsx
<span className="hidden sm:inline">Desktop Text</span>
```

### Container Constraints

```tsx
<div className="w-full max-w-6xl px-4 sm:px-8">
  {/* Content */}
</div>
```

---

## Accessibility Notes

- All interactive elements have proper ARIA labels
- Keyboard navigation supported (Tab, Enter, Escape)
- Focus states visible for all controls
- Color contrast meets WCAG AA standards
- Screen reader friendly (semantic HTML)

---

## Performance Best Practices

1. Use `React.memo()` for expensive renders
2. Animate only `transform` and `opacity`
3. Lazy load components with React Router
4. Debounce textarea resize events
5. Use CSS animations for simple loops
6. Prefer layoutId over manual coordination
