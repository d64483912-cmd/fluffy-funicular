# Nelson-GPT — Pediatric Knowledge Assistant

Nelson-GPT is a Perplexity-inspired conversational experience tailored to pediatricians and trainees. It combines a warm medical UI with Retrieval Augmented Generation (RAG), inline citations, and pediatric quick-access tools—all optimized for offline-ready PWA delivery.

## Feature Highlights

- **Perplexity-style chat UI** with animated splash screen, hero composer, and docked composer once a chat begins.
- **Dual reasoning modes** (Academic & Clinical) surfaced via pill toggles across the hero and chat dock.
- **Evidence-focused responses** featuring inline citation badges, expandable source lists, evidence badges, plus contextual follow-up chips.
- **Chat history management**: pin, rename, delete, and reopen prior consults through a dedicated history view.
- **Settings & profile panels** for theme, typography scale, AI tone, disclaimer toggles, and user account actions.
- **Pediatric quick tools** for growth, vaccines, and dosing calculators directly on the welcome screen.
- **PWA + offline support**: manifest + service worker cache shell assets and the five most recent conversations, allowing installs on tablets/phones.
- **Streaming RAG pipeline** backed by Supabase pgvector retrieval, LangChain/LangGraph orchestration, and Mistral streaming completions. A local mock stream auto-falls back for offline demos.

## Tech Stack

| Layer        | Tooling |
| ------------ | ------- |
| UI           | React 19 + Vite + TypeScript + TailwindCSS + Framer Motion |
| Routing      | React Router v6 |
| State        | Zustand (chat + UI stores) |
| Markdown     | `react-markdown` with remark/rehype plugins (GFM, sanitize, slug, autolink) |
| RAG Client   | Custom fetch + `eventsource-parser` stream management |
| Offline/PWA  | `vite-plugin-pwa`, Workbox (precaching + runtime routes), `virtual:pwa-register` |
| Backend APIs | Supabase (pgvector) + Mistral streaming (assumed via `/api/rag` proxy) |

## Local Development

```bash
# Install dependencies
npm install

# Start Vite dev server with PWA dev SW
npm run dev

# Type-check + build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

### Environment Variables

Create a `.env` file (or export vars) to point at your backend orchestrator:

```bash
VITE_API_URL=https://your-edge-worker.example.com
```

The RAG client automatically falls back to a mock Nelson response whenever the endpoint is unreachable, enabling confident UI work offline.

## Routing & Navigation

The app uses React Router v6 with the following routes:

- `/` - Redirects to `/splash`
- `/splash` - Animated splash screen with typewriter effect (auto-redirects to `/welcome` after 2.4s)
- `/welcome` - Hero welcome screen with HeroComposer and QuickTools
- `/chat/:id` - Active chat session view with message timeline and footer dock
- `/history` - Chat history with pinned and recent conversations
- `/settings` - Settings panel for theme, font scale, AI style, and disclaimer toggles
- `/profile` - User profile panel (placeholder for future implementation)

Navigation is handled via:
- Footer tab bar (fixed at bottom) for switching between main sections
- Programmatic navigation when creating new chats (from HeroComposer)
- Back button in chat header to return to history
- History panel cards to open existing conversations

## Project Structure

```
src/
├─ components/
│  ├─ chat/            // Hero composer, timeline, header, footer dock, markdown, typing indicator
│  ├─ layout/          // Splash + welcome hero experience
│  ├─ navigation/      // Fixed footer tab bar
│  ├─ panels/          // History + profile modules
│  ├─ quick-tools/     // Growth/vaccine/dosing panels
│  └─ settings/        // Theme, font scale, AI style, disclaimer toggles
├─ data/               // Static quick tool + mock RAG data
├─ hooks/              // Autosize textarea + theme/font sync
├─ lib/                // RAG client, offline cache helpers, shared utils
├─ store/              // Zustand chat + UI stores (persisted + offline synced)
├─ types/              // Chat/session/citation contracts
├─ sw.ts               // Workbox-powered service worker (injectManifest)
├─ main.tsx            // Entry point + service worker registration
└─ index.css           // Global variables, typography, glassmorphism helpers
```

## RAG & Streaming Workflow

1. **User prompt sanitization** ensures trimmed, single-spaced queries before sending.
2. **Context construction** gathers up to six historical exchanges plus the new prompt.
3. The client POSTs to `POST /api/rag` (proxied via `VITE_API_URL`) with `{ prompt, mode, aiStyle, history }`.
4. Streaming responses are parsed with `eventsource-parser`, emitting tokens, citations, follow-ups, and evidence badges in real time.
5. Each assistant message persists in the Zustand store, surfaces inline citations, and syncs to IndexedDB via the service worker for offline replay.
6. If the network call fails, the mock Nelson response simulates streaming so the UI remains demonstrable.

## Offline & PWA Details

- `vite-plugin-pwa` injects the Workbox service worker defined in `src/sw.ts`.
- Static assets, routes, and `/api` calls leverage tailored caching strategies (Network First for docs/API, Stale While Revalidate for static, Cache First for icons).
- The last five conversations are serialized to the `nelson-chat-history` cache for read-only offline access.
- Manifest + icons (`192px`, `512px`, maskable) enable install prompts across Android, iOS (add-to-home), and desktop browsers.

## Testing the Experience

1. `npm run dev` and open `http://localhost:5173`.
2. Observe the animated splash → welcome hero → Perplexity-inspired flow.
3. Submit a prompt; watch streaming tokens, citations, follow-up chips, and typing indicator.
4. Add multiple chats, pin/rename from History, tweak preferences in Settings, and confirm the footer nav transitions.
5. Install the PWA via the browser menu, then toggle airplane mode to validate offline history rendering.

---
Nelson-GPT keeps pediatric knowledge at clinicians’ fingertips with an emphatically warm UI, trustworthy sourcing, and resilient offline behavior. Contributions that deepen the dataset, clinical quick tools, or backend orchestration are welcome!
