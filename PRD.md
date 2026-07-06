# Kuma — Cat Caretaker Chatbot PRD

## Project Goal

A lightweight, stateless web application that allows designated cat caretakers to ask questions about cat care routines when the owner is unreachable. Replaces a static Word document handoff with a conversational chatbot that references instructional videos. The system must be ephemeral, cheap to run, privacy-conscious, and fully portable across domains.

## Tech Stack

- Frontend: React + Vite (static SPA), React Router, Tailwind CSS
- Backend: Cloudflare Workers (single `POST /api/chat` endpoint)
- Auth: Google OAuth 2.0 + email allowlist + stateless JWT (HS256)
- LLM: Anthropic Claude Haiku 4.5 (text-only), behind a `LLMProvider` interface
- Video: YouTube unlisted embeds (youtube-nocookie.com domain)
- Hosting: Cloudflare Pages (frontend) + Cloudflare Workers (API)
- Portability: `BASE_PATH` env var drives all routing, asset paths, and cookie scoping

## Architecture Constraints

- No database, no session store, no conversation persistence — all state lives in browser memory only
- No photo or video upload feature in V1 (deferred to V2)
- Care guide is a markdown file bundled into the Worker at deploy time, injected as the LLM system prompt
- Sensitive contact information (vet phone, owner phone, address) is kept in a separate file served as an authenticated static page — never sent to the LLM
- App must work at `/kuma` subpath on a shared domain AND at root on a standalone domain, driven by a single `BASE_PATH` env var with no code changes

## Module Breakdown

### Module 1: Frontend SPA (`src/`)

**Responsibility:** React single-page application providing the caretaker chat interface.

**Key files:**

- `src/App.tsx` — Root component, handles auth state and routing between Landing and Chat pages. Uses `BrowserRouter` with `basename` set from `import.meta.env.VITE_BASE_PATH`.
- `src/pages/Landing.tsx` — Landing page with "Sign in with Google" button. Redirects to `/api/auth/login` (prepended with `BASE_PATH`) on click.
- `src/pages/Chat.tsx` — Main chat interface. Manages message history in React `useState` (in-memory only, lost on refresh). Fetches `/api/chat` with cookie auth. Renders LLM text responses and detects YouTube URLs to render inline iframe embeds.
- `src/pages/Contacts.tsx` — Emergency contacts page. Fetches and renders `emergency-contacts.md` as formatted text. Authenticated but never sent to LLM.
- `src/components/ChatMessage.tsx` — Renders a single message bubble. Parses text for YouTube URLs and replaces them with `<VideoEmbed />` components.
- `src/components/ChatInput.tsx` — Text input area with send button. No file upload in V1.
- `src/components/VideoEmbed.tsx` — Renders a YouTube iframe using `youtube-nocookie.com` domain. Lazy-loaded.
- `src/lib/api.ts` — Fetch wrapper for `POST /api/chat`. Includes credentials (cookies). Constructs the request body as `{ messages: [...] }`.
- `src/lib/youtube.ts` — Utility to detect YouTube URLs in text and extract video IDs. Regex: `/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/g`.
- `src/styles/global.css` — Tailwind CSS imports + responsive mobile-first styles.

**Build config:**

- `vite.config.ts` — Sets `base: import.meta.env.VITE_BASE_PATH || '/'` so all asset paths are relative to the configured base path. Output is a static build to `dist/`.

**Routing behavior:**

- `BASE_PATH=/kuma` → routes are `/kuma/` (landing), `/kuma/chat`, `/kuma/contacts`
- `BASE_PATH=/` → routes are `/` (landing), `/chat`, `/contacts`
- All `<Link>` and `navigate()` calls use the router's `basename` automatically — no hardcoded paths.

**Success criteria:**

- SPA builds to `dist/` with correct asset paths for a given `BASE_PATH`
- Landing page renders Google sign-in button
- Chat page sends messages to `/api/chat` and renders responses
- YouTube URLs in LLM responses render as inline iframes using `youtube-nocookie.com`
- Contacts page renders markdown content after auth
- Page refresh clears all chat history (ephemeral)
- App works correctly at both `/kuma` subpath and root `/`

### Module 2: Cloudflare Worker API (`worker/`)

**Responsibility:** Single Cloudflare Worker handling auth callbacks, JWT verification, and the chat endpoint.

**Key files:**

- `worker/index.ts` — Worker entry point. Routes incoming requests based on path prefix (derived from `BASE_PATH` env). Routes: `/api/auth/login`, `/api/auth/callback`, `/api/chat`, and static file serving for `/contacts`.
- `worker/handlers/authLogin.ts` — Redirects user to Google OAuth consent screen with `redirect_uri` constructed dynamically from the request origin + `BASE_PATH` + `/api/auth/callback`. Includes PKCE challenge.
- `worker/handlers/authCallback.ts` — Exchanges Google auth code for ID token. Verifies token signature. Checks email against `ALLOWED_EMAILS` env var. If authorized, signs a JWT (HS256, 60-min TTL) with `email` and `exp` claims. Sets cookie: `jwt=<token>; Path=${BASE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`. Redirects to `${BASE_PATH}/chat`. If unauthorized, returns 403.
- `worker/handlers/chat.ts` — Main chat endpoint. Verifies JWT from cookie. Re-checks email against allowlist. Reads bundled `care-guide.md`. Constructs Anthropic API call with `system` = system prompt + care guide, `messages` = user history from request body. Returns LLM response text. No data stored after response.
- `worker/middleware/verifyAuth.ts` — Extracts JWT from cookie, verifies signature and expiry using `jose` library. Returns the decoded email or null.
- `worker/lib/jwt.ts` — JWT sign and verify utilities wrapping the `jose` library. Signs with `JWT_SECRET` env var (HS256).
- `worker/lib/llm.ts` — Defines `LLMProvider` interface and `AnthropicProvider` implementation. The interface: `chat(messages: ChatMessage[], systemPrompt: string): Promise<string>`. The Anthropic implementation calls `https://api.anthropic.com/v1/messages` with model `claude-haiku-4-5`, `x-api-key` header, `anthropic-version: 2023-06-01`. Includes stub `BasetenProvider` and `TEEProvider` classes for future migration.
- `worker/lib/careGuide.ts` — Imports `data/care-guide.md` as a string at build time. Exports the content for injection into the system prompt. Also exports a function to serve `data/emergency-contacts.md` as a static authenticated response.

**Wrangler config:**

- `wrangler.toml` — Configures the Worker. Route pattern: `*domain.com/kuma/api/*` (adjustable). Environment bindings: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `ALLOWED_EMAILS`, `BASE_PATH`.

**Success criteria:**

- Worker correctly routes requests prefixed with `BASE_PATH`
- `POST /api/chat` returns 401 without valid JWT cookie
- `POST /api/chat` with valid auth returns LLM response text
- OAuth callback issues JWT with correct cookie attributes (HttpOnly, Secure, SameSite=Lax, Path=BASE_PATH)
- Unauthorized email returns 403 with friendly message
- Care guide is injected into system prompt server-side, never sent raw to client
- Emergency contacts are served only after auth verification

### Module 3: Care Guide Data (`data/`)

**Responsibility:** Markdown knowledge base files bundled into the Worker at deploy time.

**Key files:**

- `data/care-guide.md` — LLM-safe care guide content. Includes: feeding routine (brand, amount, schedule, forbidden foods), litter box instructions (frequency, litter type, video URL), medication details, behavioral notes and quirks. Does NOT include phone numbers or addresses.
- `data/emergency-contacts.md` — Sensitive contact information. Includes: vet name/phone/address, emergency clinic, owner phone, poison control number. Served as authenticated static page, never sent to LLM.

**System prompt strategy:**

The system prompt instructs the LLM to: answer only from the care guide, reference video URLs when relevant, direct users to the "Emergency Contacts" page for phone numbers (never output them directly), and never reveal personal info about the owner.

**Success criteria:**

- `care-guide.md` contains structured care instructions without sensitive contact info
- `emergency-contacts.md` contains contact details separated from the care guide
- System prompt correctly instructs LLM to defer to contacts page for phone numbers

### Module 4: Project Configuration & Deployment

**Responsibility:** Build, deployment, and portability configuration files.

**Key files:**

- `vite.config.ts` — Vite build config. `base` derived from `VITE_BASE_PATH` env var. Output: `dist/`.
- `wrangler.toml` — Cloudflare Worker config. Route pattern, env var bindings, `[env.production]` and `[env.standalone]` sections for different deployment targets.
- `.env.example` — Template listing all required environment variables with descriptions.
- `package.json` — Scripts: `dev` (Vite dev server), `build` (Vite build with `VITE_BASE_PATH`), `deploy` (wrangler deploy), `preview` (local preview).
- `.github/workflows/deploy.yml` — GitHub Actions CI/CD. On push to main: install, build with `VITE_BASE_PATH=/kuma`, deploy Pages, deploy Worker.

**Environment variables:**

| Variable | Scope | Purpose |
|----------|-------|---------|
| `VITE_BASE_PATH` | Build (frontend) | Drives Vite `base` and router `basename`. Set to `/kuma` or `/`. |
| `BASE_PATH` | Runtime (Worker) | Drives route prefix, cookie path, redirect URI construction. |
| `GOOGLE_CLIENT_ID` | Runtime (Worker) | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Runtime (Worker) | Google OAuth client secret. |
| `JWT_SECRET` | Runtime (Worker) | HS256 signing key. Random 32+ byte hex string. |
| `ANTHROPIC_API_KEY` | Runtime (Worker) | Anthropic API key for Claude Haiku 4.5. |
| `ALLOWED_EMAILS` | Runtime (Worker) | Comma-separated allowlist of authorized caretaker emails. |

**Success criteria:**

- `npm run build` with `VITE_BASE_PATH=/kuma` produces `dist/` with assets at `/kuma/assets/`
- `npm run build` with `VITE_BASE_PATH=/` produces `dist/` with assets at `/assets/`
- GitHub Actions workflow builds and deploys both Pages and Worker on push
- Moving to a new domain requires only: DNS update, custom domain in Pages settings, new OAuth redirect URI in Google Console

### Module 5: Tests

**Responsibility:** Unit and integration tests for auth flow, chat endpoint, care guide injection, YouTube URL detection, and portability.

**Key files:**

- `tests/test_auth.ts` — Tests JWT sign/verify, cookie attributes, allowlist checking, OAuth callback redirect logic.
- `tests/test_chat_endpoint.ts` — Tests `/api/chat` returns 401 without auth, returns LLM response with auth (mocked LLM), verifies care guide is injected into system prompt.
- `tests/test_care_guide.ts` — Tests care guide is loaded and injected, emergency contacts are separate and auth-gated.
- `tests/test_youtube_detection.ts` — Tests YouTube URL regex correctly extracts video IDs from various URL formats (youtube.com/watch?v=, youtu.be/, with/without query params).
- `tests/test_portability.ts` — Tests that building with different `VITE_BASE_PATH` values produces correct asset paths and router base names.

**Success criteria:**

- All tests pass via `npm test`
- Auth tests cover: valid JWT, expired JWT, unauthorized email, missing cookie
- Chat endpoint tests verify system prompt contains care guide content
- YouTube detection tests cover all URL variants
- Portability test confirms build output changes with `BASE_PATH`
>>>>>>> b86b54a425336b004e024e5d8c82dfcdbb21711e
