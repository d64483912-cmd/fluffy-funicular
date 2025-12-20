# Nelson-GPT Architecture Guide

## Animation Patterns (Framer Motion)

The app uses Framer Motion for 60fps animations following these patterns:

### Splash Screen
- **Fade in/out**: Full-screen overlay with opacity transitions (0.4s duration)
- **Spring scale**: Hero card scales from 0.94 to 1 with spring physics (stiffness: 120, damping: 12)
- **Typewriter effect**: Animated width expansion (1.4s easeInOut) with pulsing cursor

### Page Transitions
- **Fade up**: Pages fade in with subtle upward motion (16px y-offset, 0.35s duration)
- **Exit animation**: Pages fade out with downward motion (-12px y-offset)
- **AnimatePresence**: Smooth transitions between routes using `mode="wait"`

### Interactive Elements
- **Layout animations**: Footer tab active indicator uses `layoutId="footer-active"` for smooth tab switching
- **Hover states**: CSS transitions for button hover effects (preserves 60fps)
- **Message bubbles**: Fade-in animation for new messages
- **Typing indicator**: Three-dot pulsing loader using CSS animations

### Performance Tips
- Use `React.memo()` for components that don't need frequent re-renders
- Avoid animating expensive properties (use `transform` and `opacity` only)
- Lazy load route components to reduce initial bundle size
- Use `layoutId` for shared element transitions instead of manual coordination

## Design System

### Color Palette (Warm Medical Theme)

Primary amber tones with soft neutrals for trust and warmth:

```js
// Primary accent
amber: '#C9843B'
amberSoft: '#E5AF74'
amberDeep: '#A86424'

// Neutral backgrounds
ivory: '#FFF9F1'
linen: '#F8F1E7'
sand: '#F0E2D1'
beige: '#E6D6C4'

// Secondary accent (clinical)
sage: '#7AA085'
jade: '#4E7B61'

// Text colors
bark: '#2C1A15'      // Primary text
charcoal: '#3A2B24'  // Secondary text
dusk: '#6F5B4B'      // Muted text
cloud: '#B9A89A'     // Disabled text
```

### Component Tokens

**Border Radius**
- `20px` - fluid (cards, panels)
- `999px` - pill (buttons, toggles)
- `28px` - hero composer
- `32px` - major panels

**Shadow Elevation**
- `soft` - 10px blur, 12% opacity
- `panel` - 18px blur, 15% opacity
- `hero` - 25px blur, 18% opacity
- `glow` - 20px blur with amber tint (25% opacity)

**Spacing Scale**
- Base: 4px, 8px, 12px, 16px, 24px, 32px, 48px
- Container padding: 4-8 (mobile), 8 (tablet+)

**Typography**
- Font family: Inter
- Base size: 16px (1rem)
- Scale: Responsive via CSS custom property `--font-scale`
- Letter spacing: -0.01em for body text

### Responsive Breakpoints

- **Mobile**: 375px minimum (base styles)
- **Tablet**: 768px (`sm:` prefix in Tailwind)
- **Desktop**: 1920px (max-width: 1536px container)

All layouts are mobile-first with progressive enhancement for larger screens.

### Component Library

Located in `src/components/shared/`:

**ModeToggle** (`ModeToggle.tsx`)
- Pill-style toggle for Academic/Clinical modes
- Props: `layout?: 'row' | 'stack'`
- Uses Zustand `chatStore` for mode state
- Accent colors: amber (academic), sage (clinical)

**Reusable Patterns**
- All buttons follow `rounded-full` with `shadow-glow` for primary actions
- Input fields use `rounded-[28px]` with soft borders
- Cards use `rounded-[28px]` to `rounded-[32px]` with white/80 backgrounds and backdrop-blur
- Badges and chips use `rounded-full` with 15% opacity backgrounds

## State Management

### Chat Store (`src/store/chatStore.ts`)

Manages all chat session data and message streaming:

```typescript
interface ChatStore {
  sessions: ChatSession[]        // All chat sessions
  activeSessionId: string | null // Currently active session
  mode: ChatMode                 // 'academic' | 'clinical'
  isStreaming: boolean           // Streaming in progress
  typingIndicator: boolean       // Show typing animation
  error: string | null           // Error message
  activeController: AbortController | null // For canceling streams
  
  // Actions
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
```

**Persistence**: Uses Zustand persist middleware with localStorage. Only stores mode and last 5 sessions for offline access.

### UI Store (`src/store/uiStore.ts`)

Manages global UI state and user preferences:

```typescript
interface UIStore {
  showSplash: boolean
  settings: SettingsState
  
  // Actions
  hideSplash: () => void
  setTheme: (theme: ThemeMode) => void
  setFontScale: (scale: FontScale) => void
  setAIStyle: (style: AIStyle) => void
  toggleDisclaimer: (value?: boolean) => void
}

interface SettingsState {
  theme: 'light' | 'dark'
  fontScale: 'sm' | 'md' | 'lg'
  aiStyle: 'concise' | 'balanced' | 'detailed'
  showDisclaimer: boolean
}
```

**Persistence**: Settings are persisted to localStorage.

## Routing Structure

### Route Definitions

The app uses React Router v6 with the following structure:

```typescript
/ → Navigate to /splash
/splash → SplashScreen (auto-redirects to /welcome after 2.4s)
/welcome → WelcomeScreen (hero composer + quick tools)
/chat/:id → ChatView (active conversation)
/history → HistoryPanel (pinned + recent sessions)
/settings → SettingsPanel (theme, font, AI style, disclaimer)
/profile → ProfilePanel (placeholder)
```

### Navigation Flow

1. **App Load**: Shows splash screen at `/splash`
2. **After Splash**: Auto-navigates to `/welcome`
3. **New Message**: HeroComposer creates session and navigates to `/chat/:id`
4. **Footer Tabs**: Direct navigation to /history, /settings, /profile
5. **Chat Tab**: 
   - If active session exists → `/chat/:activeSessionId`
   - Otherwise → `/welcome`
6. **History Cards**: Click to navigate to `/chat/:id`
7. **Back Button**: In chat header, navigates to `/history`

### Route Components

All routes except `/splash` are wrapped in `MainLayout` which provides:
- Consistent header with Nelson-GPT branding
- Page animations (fade up/down)
- Optional disclaimer banner (shown in chat view)

## Component Architecture

### Layout Components (`src/components/layout/`)

**SplashScreen**
- Full-screen overlay with typewriter animation
- Auto-hides after 2.4s
- Uses Framer Motion for spring scale and fade transitions

**WelcomeScreen**
- Hero section with centered heading
- HeroComposer component
- QuickToolsPanel below (growth charts, vaccine schedules, dosing)

### Chat Components (`src/components/chat/`)

**HeroComposer**
- Large composer for welcome screen
- Mode toggle
- Multi-line textarea with auto-sizing
- Send button (amber, circular)
- Feature badges below

**ChatView**
- Container for active chat session
- Uses React Router params to get session ID
- Shows ChatHeader, ChatTimeline, ChatFooterDock

**ChatHeader**
- Back button to history
- Session title and metadata
- Menu with rename, share, pin, delete actions

**ChatTimeline**
- Scrollable message list
- User bubbles (right-aligned, beige)
- AI bubbles (left-aligned, white with amber accent)
- Markdown rendering for AI responses
- Citation badges and follow-up chips

**ChatFooterDock**
- Fixed bottom input (64px height)
- Voice button (placeholder)
- Auto-expanding textarea (max 2 lines)
- Send button
- Mode toggle above

**MessageBubble**
- Renders individual messages
- Different styles for user vs assistant
- Markdown support with react-markdown
- Citation and follow-up rendering

**TypingIndicator**
- Three-dot pulsing animation
- Shows "Nelson-GPT is thinking..."

**MarkdownContent**
- Wrapper for react-markdown with remark/rehype plugins
- Supports GFM (tables, strikethrough, task lists)
- Auto-linked headings
- Sanitized HTML
- Custom styling for medical content

### Navigation Components (`src/components/navigation/`)

**FooterNav**
- Fixed bottom tab bar (z-50)
- 4 tabs: Chat, History, Settings, Profile
- Animated active indicator (layoutId)
- Uses React Router for navigation
- Chat tab intelligently routes to /chat/:id or /welcome

### Panel Components (`src/components/panels/`)

**HistoryPanel**
- Grid layout for session cards
- Sections: Pinned, Recent
- Cards show title, mode, message count, timestamp
- Actions: Open, Pin, Rename, Delete

**SettingsPanel**
- Theme toggle (light/dark)
- Font scale selector
- AI style selector (concise/balanced/detailed)
- Disclaimer toggle

**ProfilePanel**
- Placeholder for future user account features

### Shared Components (`src/components/shared/`)

**ModeToggle**
- Dual-mode toggle (Academic/Clinical)
- Pill-style with icon + label
- Controlled by chatStore.mode
- Used in HeroComposer and ChatFooterDock

## Hooks

### useAutosizeTextArea

Auto-resizes textarea based on content:

```typescript
useAutosizeTextArea(textareaRef: RefObject<HTMLTextAreaElement>, value: string)
```

- Adjusts height to fit content
- Maintains max-height constraints
- Used in HeroComposer and ChatFooterDock

### useThemeSync

Syncs theme and font scale from UIStore to CSS custom properties:

```typescript
useThemeSync()
```

- Sets `data-theme` attribute on root
- Updates `--font-scale` CSS variable
- Called once in App.tsx

## Code Style Guidelines

### File Organization
- One component per file
- Co-locate types with components when specific to that component
- Shared types in `src/types/`
- Use named exports for components

### Component Patterns
- Functional components with hooks
- Props interfaces above component definition
- Use `React.memo()` for expensive renders
- Prefer composition over prop drilling

### Naming Conventions
- Components: PascalCase (e.g., `HeroComposer`)
- Hooks: camelCase with "use" prefix (e.g., `useThemeSync`)
- Store actions: camelCase verbs (e.g., `sendMessage`, `togglePin`)
- CSS classes: Tailwind utility classes

### TypeScript
- Strict mode enabled
- Explicit return types for exported functions
- Prefer `interface` over `type` for object shapes
- Use `unknown` instead of `any` when type is truly unknown

### Styling
- Tailwind classes in component files
- Custom CSS properties in `index.css` for theme tokens
- Component-scoped animations in Tailwind config
- Avoid inline styles except for dynamic values
