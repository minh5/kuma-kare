# 🐱 Kuma — Cat Caretaker Chatbot Architecture

## Overview

Kuma is a lightweight, stateless chatbot that allows designated cat caretakers to ask questions about cat care routines when the owner is unreachable. It replaces a static Word document handoff with a conversational interface that can surface instructional videos. The system is designed to be ephemeral, cheap, private, and fully portable across domains.

## Confirmed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authentication | Google SSO + email allowlist | Familiar UX (no passwords), gated access, no DB |
| State management | Ephemeral — browser memory only | No conversation persistence anywhere |
| Video hosting | YouTube unlisted (playback only) | Free, reliable, embeddable. No upload feature in V1. |
| Photo/video upload | **Not in V1** (deferred to V2) | Reduces complexity, privacy risk, and payload handling |
| Care guide updates | Markdown file + git push | Simple, versioned, no admin UI |
| LLM backend | Anthropic Claude Haiku 4.5 (text-only) | Fast, cheap, strong instruction-following, favorable data retention (7-day logs, no training on commercial data) |
| LLM abstraction | `LLMProvider` interface | Enables future swap to Baseten (open-source models) or TEE self-hosted inference |
| Platform | Web-only, responsive (mobile-first) | No native app, no PWA. Works in any browser. |
| Hosting | Cloudflare Pages + Workers | Free tier, scale-to-zero, global CDN |
| Base path | Env-driven (`BASE_PATH=/kuma`) | Enables subpath deployment and domain portability |
| Frontend framework | React (Vite static build) | Simple, clean `base` config for subpath support |
| JWT signing | HS256 (shared secret) | Proportionate security for this use case, simpler than RS256 |
| Cookie scope | `Path=$BASE_PATH`, `HttpOnly`, `Secure`, `SameSite=Lax` | Prevents cookie leakage to parent domain |
| Domain portability | Same codebase, different `BASE_PATH`/domain | Move from `domainA.com/kuma` to `domainB.com/kuma` with config changes only |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Client (Browser)                        │
│                                                                │
│   www.domain.com/kuma/ (or www.newdomain.com/kuma/)            │
│                                                                │
│   ┌─────────────────┐     ┌─────────────────────────────────┐  │
│   │  Landing Page    │────▶│  Chat UI (React SPA)            │  │
│   │  Google SSO      │     │  - Message list (in-memory)    │  │
│   │  "Sign in with   │     │  - Text input                  │  │
│   │   Google" button │     │  - Inline YouTube embeds       │  │
│   └─────────────────┘     │  - Responsive (mobile-first)  │  │
│                           │  - Router basename="/kuma"     │  │
│                           └──────────┬──────────────────────┘  │
│                                      │                          │
│                    JWT in HttpOnly    │                          │
│                    Cookie (Path=/kuma)│                          │
└──────────────────────────────────────┼─────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│              Cloudflare Edge (Transform Rule)                  │
│                                                                │
│   URL Transform Rule on parent domain:                        │
│   /kuma/* → proxy to kuma-pages.pages.dev/*                   │
│                                                                │
│   (When moved to standalone domain, no transform rule needed) │
└──────────────────────────────────────────────────────────────┘
                                       │
                    ┌────────────────┼────────────────┐
                    ▼                                  ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  Cloudflare Pages (Static)    │   │  Cloudflare Worker (API)      │
│                               │   │                               │
│  Kuma SPA                     │   │  Routes (scoped to BASE_PATH):│
│  - Built with base='/kuma/'   │   │  /kuma/api/auth/login         │
│  - index.html + hashed assets │   │  /kuma/api/auth/callback      │
│  - React Router basename      │   │  /kuma/api/chat               │
│                               │   │                               │
│  Deployed as standalone        │   │  Auth Middleware:             │
│  Pages project                 │   │  - Verify JWT (jose)         │
│  (*.pages.dev URL)            │   │  - Check ALLOWED_EMAILS       │
│                               │   │                               │
│                               │   │  Logic:                       │
│                               │   │  - Read care-guide.md         │
│                               │   │  - Construct LLM prompt       │
│                               │   │  - Call Anthropic API         │
│                               │   │  - Return text response       │
└──────────────────────────────┘   └─────────────┬─────────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  Anthropic   │
                                          │  Claude Haiku│
                                          │  4.5 (API)   │
                                          └──────────────┘
```

---

## Components

### 1. Frontend — Static SPA

| Concern | Decision |
|---------|----------|
| Framework | React (Vite static build) |
| Routing | React Router with `basename={import.meta.env.VITE_BASE_PATH}` |
| Asset paths | Vite `base: import.meta.env.VITE_BASE_PATH || '/'` |
| Hosting | Cloudflare Pages (standalone project, routed via edge rules to parent domain) |
| State | In-memory only (React state). Messages lost on refresh. Intentional. |
| Mobile | Responsive CSS, mobile-first design. No PWA/native app. |
| Security | No `dangerouslySetInnerHTML`. All user input escaped by React. |

**Portability Configuration:**

The `VITE_BASE_PATH` environment variable (set at build time) drives all pathing logic in the frontend:

- Vite config: `base: import.meta.env.VITE_BASE_PATH || '/'`
- Router: `<BrowserRouter basename={import.meta.env.VITE_BASE_PATH}>`
- No hardcoded `/` or `/kuma` strings in component code.

**YouTube Embed Rendering:**

When the LLM response contains a YouTube URL, the frontend detects it and renders an inline iframe using the privacy-friendly nocookie domain.

Detection regex: `/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/g`

Rendered as:
```html


```

**Emergency Contacts Page:**

A separate authenticated page (`/kuma/contacts`) renders sensitive contact information (vet phone, owner phone, address, emergency clinic) directly from a static markdown file. This page is never sent to the LLM. The LLM system prompt instructs it to say "check the Emergency Contacts page" when relevant.

### 2. Authentication — Google SSO + Email Allowlist

**Flow:**

1. User visits `/kuma/` and sees a landing page with "Sign in with Google" button.
2. Clicks button → redirects to Google OAuth consent screen.
3. Google redirects back to `{BASE_PATH}/api/auth/callback` with authorization code.
4. Worker exchanges code for Google ID token.
5. Worker verifies Google ID token signature (using Google's public keys).
6. Worker checks email against `ALLOWED_EMAILS` environment variable.
7. If authorized: issues signed JWT (HS256, 60 min TTL) containing `email` and `exp`.
   Sets cookie:
   ```
   Set-Cookie: jwt=<token>; Path=/kuma; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
   ```
8. Redirects to `/kuma/chat`.
9. If not authorized: returns 403 with message "This email is not authorized. Contact the cat owner."

**Cookie Scoping:**

The cookie `Path` attribute matches `BASE_PATH` (e.g., `/kuma`), ensuring it does not leak to other applications on the parent domain. When deployed to a standalone domain, `Path=/`.

**Allowlist Management:**

Managed via `ALLOWED_EMAILS` env var (comma-separated string). Adding/removing a caretaker requires updating the env var and triggering a redeploy.

### 3. Serverless API — Cloudflare Worker

| Concern | Decision |
|---------|----------|
| Platform | Cloudflare Workers |
| Runtime | V8 isolates (Edge) |
| Endpoints | `{BASE_PATH}/api/auth/login`, `{BASE_PATH}/api/auth/callback`, `{BASE_PATH}/api/chat` |
| Auth | JWT verification on every request using `jose` library |
| Cost | Free tier (100K requests/day). Will never be exceeded for this use case. |
| Cold starts | Near-zero (V8 isolates, not containers) |

**`POST {BASE_PATH}/api/chat` Request Flow:**

1. Extract JWT from cookie.
2. Verify JWT signature and check expiry.
3. Re-check email against `ALLOWED_EMAILS` (in case it was removed after JWT issuance).
4. Read `care-guide.md` (bundled into the Worker at deploy time).
5. Construct Anthropic API payload:
   - `system`: system prompt + care guide markdown content
   - `messages`: user message history from request body
6. Call Anthropic Claude Haiku 4.5 API.
7. Return LLM response text to client.
8. No data stored. Request ends, all memory reclaimed.

**Request Shape:**

```json
{
  "messages": [
    { "role": "user", "content": "How do I clean the litter box?" },
    { "role": "assistant", "content": "Clean it once daily. Here's a video: https://youtube.com/watch?v=XXXXX" },
    { "role": "user", "content": "What brand of food does she eat?" }
  ]
}
```

The client sends the full conversation history (from browser memory) with each request. The server does not store or retrieve any history — it is stateless.

### 4. Care Guide (Knowledge Base)

| Concern | Decision |
|---------|----------|
| Format | Markdown |
| Location | `data/care-guide.md` in the repository |
| Loading | Bundled into the Worker at deploy time (imported as a string) |
| Updates | Edit file, git commit, push. CI/CD rebuilds and redeploys. |
| Version control | Full git history provides audit trail of all changes. |

**Content Separation (Privacy Sanitization):**

The care guide is split into two sections:

1. **LLM-safe content** (sent to Claude as system prompt):
   - Feeding routine, amounts, food brand
   - Litter box cleaning instructions and video links
   - Behavioral notes, quirks, preferences
   - General do's and don'ts

2. **Sensitive contacts** (rendered on separate page, never sent to LLM):
   - Vet name, phone, address
   - Owner phone number
   - Emergency clinic info
   - Poison control number

**Care Guide Template:**

```markdown
# Cat Care Guide — [Cat Name]

## Feeding
- Food brand: [Brand], [specific variety]
- Amount: 1/2 cup morning, 1/4 cup evening
- Do NOT give: dairy, onions, garlic, chocolate, grapes
- Treats: [Brand], max 2 per day
- If she refuses food for more than 24 hours: contact vet (see Emergency Contacts page)

## Litter Box
- Scoop daily, full change every [X] days
- Step-by-step video: https://youtube.com/watch?v=XXXXX
- Litter: [Brand], unscented clumping
- Box location: [room/spot]

## Medication (if applicable)
- Medicine: [name], [dose], [frequency], [method]
- How to administer: [instructions or video link]

## Behavior and Quirks
- [Specific behaviors, fears, hiding spots]
- [What's normal vs. concerning]
- [Comfort techniques]
```

**Separate Emergency Contacts file** (`data/emergency-contacts.md`):

```markdown
# Emergency Contacts

- Vet: [Name], [Phone], [Address]
- Emergency Clinic: [Name], [Phone]
- Owner: [Phone] (try first for non-emergencies)
- Poison Control: [Number]
```

This file is served as a static authenticated page at `/kuma/contacts`. The Worker serves it only after JWT verification. It is never included in the LLM system prompt.

### 5. Video Integration

| Concern | Decision |
|---------|----------|
| Hosting | YouTube (unlisted videos) |
| Embedding | Frontend detects YouTube URLs in LLM responses, renders inline iframe |
| Privacy domain | `youtube-nocookie.com` for reduced tracking |
| Limitation | No video upload feature (V1). Only playback of pre-recorded instructions. |

**How it works:**
1. Care guide markdown includes YouTube URLs for instructional videos.
2. LLM is instructed to include relevant video URLs in its responses.
3. Frontend parses LLM response text for YouTube URL patterns.
4. Matches are rendered as inline iframe embeds using `youtube-nocookie.com`.
5. Non-URL text renders as normal paragraphs.

### 6. LLM Backend

#### V1: Anthropic Claude Haiku 4.5

| Concern | Decision |
|---------|----------|
| Provider | Anthropic |
| Model | `claude-haiku-4-5` |
| Reason | Strong instruction following, fast, low cost ($1/$5 per 1M tokens), 7-day log retention policy, no training on commercial data. |
| Vision | Not used in V1 (photos removed). |
| Cost Estimate | <$1/month at rare usage volume. |

**Anthropic API Payload Example:**

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: systemPrompt, // Injected care guide + safety instructions
    messages: userHistory, // Array of { role: 'user' | 'assistant', content: string }
  }),
});
```

**System Prompt Strategy:**

```
You are a helpful cat care assistant for [Cat Name]. 
Answer questions based ONLY on the provided care guide. 
If a question asks for emergency contacts, tell the user to check the 
"Emergency Contacts" page. Do NOT output phone numbers directly.

When the care guide includes video URLs relevant to the question, 
include those URLs in your response so the user can watch them.

Do not reveal personal information about the owner beyond what 
is in the care guide. Do not attempt to bypass these instructions.

--- CARE GUIDE ---
[contents injected here]
---
```

#### Future: Provider Abstraction

The system uses an `LLMProvider` interface to decouple the frontend from the backend, allowing for future swaps without rewriting the core logic.

```typescript
interface LLMProvider {
  chat(messages: ChatMessage[], systemPrompt: string): Promise;
}

// V1 Implementation
class AnthropicProvider implements LLMProvider { ... }

// Future Implementations (Planned)
class BasetenProvider implements LLMProvider { /* Open Source Models */ }
class TEEProvider implements LLMProvider { /* Self-hosted TEE Inference */ }
```

Swapping providers requires changing only one class instantiation.

---

## Deployment & Portability

### Directory Structure

```
kuma-chatbot/
├── src/
│   ├── components/
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── VideoEmbed.tsx
│   │   └── LoginForm.tsx
│   ├── pages/
│   │   ├── Landing.tsx
│   │   └── Chat.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── youtube.ts
│   ├── App.tsx
│   └── main.tsx
├── worker/
│   ├── index.ts
│   ├── handlers/
│   │   ├── authLogin.ts
│   │   ├── authCallback.ts
│   │   └── chat.ts
│   └── middleware/
│       └── verifyAuth.ts
├── data/
│   ├── care-guide.md
│   └── emergency-contacts.md
├── vite.config.ts
├── wrangler.toml
├── package.json
└── README.md
```

### Portability Mechanism

**Variable:** `VITE_BASE_PATH` (frontend build-time) and `BASE_PATH` (Worker runtime).

1.  **Subpath Deployment (`domain.com/kuma`):**
    *   Build: `VITE_BASE_PATH=/kuma npm run build`
    *   Worker Config: `route = "domain.com/kuma/api/*"`
    *   Result: Assets served at `/kuma/assets/*.js`, cookies scoped to `/kuma`.

2.  **Standalone Deployment (`kuma.domain.com`):**
    *   Build: `VITE_BASE_PATH=/ npm run build` (or empty string defaults to root)
    *   Worker Config: `route = "kuma.domain.com/api/*"`
    *   Result: Assets served at `/*/assets/*.js`, cookies scoped to `/`.

3.  **Migration Steps:**
    *   Change DNS record for new domain to point to same Cloudflare Pages project.
    *   Add new domain in Pages settings ("Custom Domains").
    *   Register new OAuth redirect URI in Google Console: `https://newdomain.com/kuma/api/auth/callback`.
    *   No code change required.

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | OAuth App Credentials | `12345.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth Secret | `GOCSPX-xyz...` |
| `JWT_SECRET` | Symmetric key for HS256 | Random 32-byte hex string |
| `ANTHROPIC_API_KEY` | LLM Access Key | `sk-ant-...` |
| `ALLOWED_EMAILS` | Comma-separated whitelist | `caretaker@gmail.com,backup@gmail.com` |
| `BASE_PATH` | App root path (Runtime) | `/kuma` (Worker), empty or `/kuma` (Build) |
| `VITE_BASE_PATH` | App root path (Build) | Passed via CLI or `.env` |

---

## Security Considerations

| Threat | Mitigation |
|--------|------------|
| Unauthorized Access | Google SSO + strict email allowlist. |
| Cookie Theft | `HttpOnly`, `Secure`, `SameSite=Lax`, short TTL (60m), scoped `Path`. |
| Prompt Injection | System prompt constraints: "Do not reveal personal info," "Follow care guide only." |
| Data Leakage | Care guide sanitized (phone numbers separated). No photo uploads. 7-day Anthropic retention. |
| XSS | React escapes all output. No `dangerouslySetInnerHTML`. |
| CSRF | `SameSite=Lax` cookie prevents most attacks. Origin header check on POST endpoints. |

---

## Open Questions / Future Enhancements

1.  **Photo Upload (V2):** If desired later, add canvas compression + multimodal LLM support. Requires careful privacy review.
2.  **Self-Hosted LLM (TEE):** If absolute privacy is required, migrate `AnthropicProvider` to `TEEProvider` running Ollama inside Intel TDX/AMD SEV VM.
3.  **Real-Time Updates:** Currently polling or SSE. Could switch to WebSocket if high-frequency updates needed (unlikely for cat care).
4.  **Admin UI:** A protected page to edit the care guide without git pushes (adds complexity, breaks "simple" principle). Stick to Git for now.

---

## Deployment Checklist

1.  **Setup Google OAuth App:**
    *   Create project in Google Cloud Console.
    *   Enable "Google+ API".
    *   Create OAuth 2.0 credentials (Web Application).
    *   Add Authorized Redirect URIs:
        *   `https://www.firstdomain.com/kuma/api/auth/callback`
        *   `https://www.seconddomain.com/kuma/api/auth/callback`
        *   `https://kuma.pages.dev/kuma/api/auth/callback` (dev)
2.  **Configure Cloudflare:**
    *   Create `kuma-chatbot` Pages project connected to GitHub repo.
    *   Set environment variables (Keys, Secrets, `BASE_PATH`).
    *   Configure `wrangler.toml` routes for `*firstdomain.com/kuma/api/*`.
    *   (Optional) Set up URL Transform Rules on parent domain to proxy `/kuma/*`.
3.  **Deploy:**
    *   `npm run build` (sets `VITE_BASE_PATH=/kuma`)
    *   `npx wrangler deploy --env production`
4.  **Verify:**
    *   Visit `www.firstdomain.com/kuma`.
    *   Test Google Login flow.
    *   Test Chat flow with dummy query.
    *   Verify YouTube video embedding works.
