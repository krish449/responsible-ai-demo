# Responsible AI Demo — CLAUDE.md

> This file is read by Claude Code at the start of every session to understand the project.
> Keep it up to date as the codebase evolves.

---

## Project Overview

**What this is:** An interactive engineering team demo application showcasing responsible vs
irresponsible AI usage patterns across 8 real-world software engineering scenarios.

**Tech stack:**
- **Backend:** Node.js + Express + TypeScript + Groq SDK (`llama-3.3-70b-versatile`)
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + React Router
- **AI Provider:** Groq API (OpenAI-compatible, using `groq-sdk` npm package)
- **Streaming:** SSE (Server-Sent Events) for real-time LLM output

**Monorepo layout:**
```
responsible-ai-demo/
├── CLAUDE.md                      ← You are here
├── package.json                   ← Root: concurrently + install:all scripts
├── .env.example                   ← Copy to backend/.env
├── .claude/launch.json            ← Claude Code preview server config
├── backend/                       ← Express API (port 3001)
│   └── src/
│       ├── index.ts               ← Express entry point
│       ├── config/groq.ts         ← Groq client + model constants
│       ├── scenarios/index.ts     ← All 8 ScenarioConfig objects
│       ├── services/
│       │   ├── piiScrubber.ts     ← Regex-based PII masking (10 patterns)
│       │   ├── injectionGuard.ts  ← Prompt injection detection (9 patterns)
│       │   └── auditLog.ts        ← In-memory audit log + stats
│       └── routes/
│           ├── scenarios.ts       ← /api/scenarios/* — UC-01 to UC-07
│           └── chat.ts            ← /api/chat/*     — UC-08 chatbot sessions
└── frontend/                      ← Vite React app (port 5173)
    └── src/
        ├── App.tsx                ← Router + layout
        ├── types/index.ts         ← Shared TypeScript types
        ├── services/api.ts        ← All API calls + SSE consumer
        └── components/
            ├── Sidebar.tsx        ← Navigation sidebar
            ├── Dashboard.tsx      ← Landing page
            ├── ScenarioView.tsx   ← Split-panel ❌/✅ scenario runner
            ├── ChatbotView.tsx    ← UC-08 side-by-side live chatbot
            ├── Charter.tsx        ← AI Usage Charter page
            └── Scorecard.tsx      ← Live audit log + risk stats
```

---

## Environment Setup

### 1. Get a Groq API Key
Sign up at https://console.groq.com — free tier is sufficient for demo purposes.

### 2. Set up environment
```bash
cp .env.example backend/.env
# Edit backend/.env and set:
# GROQ_API_KEY=gsk_your_actual_key_here
```

### 3. Install all dependencies
```bash
npm run install:all    # installs both backend/ and frontend/
```
Or individually:
```bash
cd backend && npm install
cd frontend && npm install
```

---

## Running the App

### Both servers together (recommended)
```bash
npm run dev
# Backend → http://localhost:3001
# Frontend → http://localhost:5173
```

### Individually
```bash
npm run dev:backend    # Express API only
npm run dev:frontend   # Vite dev server only
```

### Build for production
```bash
npm run build
```

---

## Key Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start both backend + frontend concurrently |
| `npm run dev:backend` | Backend only (port 3001) |
| `npm run dev:frontend` | Frontend only (port 5173) |
| `npm run install:all` | Install deps in both workspaces |
| `npm run typecheck` | Run `tsc --noEmit` on both packages |
| `npm run build` | Production build both packages |

### Backend-only commands
```bash
cd backend
npm run dev        # tsx watch (hot reload)
npm run build      # compile to dist/
npm run start      # run compiled dist/index.js
```

### Frontend-only commands
```bash
cd frontend
npm run dev        # vite dev server
npm run build      # vite production build
npm run preview    # preview production build
```

---

## API Endpoints

### Scenarios (UC-01 to UC-07)
```
GET  /api/scenarios              → list all 8 scenario configs
GET  /api/scenarios/:id          → single scenario config
POST /api/scenarios/:id/run      → run irresponsible or responsible path (SSE stream)
GET  /api/scenarios/audit/log    → full audit log + stats
DELETE /api/scenarios/audit/log  → clear audit log (demo reset)
```

**POST body for `/run`:**
```json
{ "input": "string", "mode": "irresponsible" | "responsible" }
```

**SSE event types:**
```json
{ "type": "metadata", "guardrailsTriggered": [], "piiRedacted": false, ... }
{ "type": "delta", "content": "streamed text chunk" }
{ "type": "done", "durationMs": 1234 }
{ "type": "error", "message": "..." }
```

### Chatbot (UC-08)
```
POST   /api/chat/sessions                        → create session (returns sessionId)
GET    /api/chat/sessions/:sessionId             → get session history
POST   /api/chat/sessions/:sessionId/message     → send message (SSE stream)
DELETE /api/chat/sessions/:sessionId             → clear session
```

**POST body for session creation:**
```json
{ "mode": "irresponsible" | "responsible" }
```

**POST body for message:**
```json
{ "message": "user message text" }
```

### Health Check
```
GET /api/health   → { status: "ok", timestamp, version }
```

---

## The 8 Use Cases

| ID | Title | Dimension | Key Demo |
|---|---|---|---|
| UC-01 | Code Review Assistant | Transparency | Shows opaque vs structured findings with severity + line citations |
| UC-02 | Incident Log Analyzer | Privacy & Data Safety | PII scrubber in action — see network tab |
| UC-03 | Architecture Assistant | Human Oversight | Decision suppression — tradeoffs not recommendations |
| UC-04 | Test Case Generator | Fairness & Bias | 6 coverage categories incl. international/adversarial |
| UC-05 | Secure Code Generation | Security | SECURITY NOTE annotations vs silent SQL injection |
| UC-06 | API Doc Generator | Accuracy & Hallucination | [VERIFIED]/[INFERRED]/[UNKNOWN] tags + COVERAGE GAPS |
| UC-07 | PR Merge Gating | Human Oversight | Advisory-only vs auto-merge (secret key in diff demo) |
| UC-08 | Engineering Chatbot | All Dimensions | Live injection deflection, source tags, destructive gate |

---

## Adding a New Scenario

1. **Add config to `backend/src/scenarios/index.ts`:**
```typescript
const uc09: ScenarioConfig = {
  id: "uc09",
  title: "My New Scenario",
  dimension: "Security",
  dimensionIcon: "🔒",
  keyPrinciple: "...",
  irresponsible: { userPromptTemplate: "{input}", warningLabel: "...", failureMode: "..." },
  responsible: { systemPrompt: "...", userPromptTemplate: "{input}", successLabel: "..." },
  sampleInput: "...",
  guardrails: [...],
  demoTip: "...",
};

export const SCENARIOS = [...existing, uc09];
```

2. **Add to `frontend/src/components/Sidebar.tsx`** — SCENARIOS array.
3. **Add sample input** to `SAMPLE_INPUTS` in `ScenarioView.tsx`.
4. **Add guardrails** to `GUARDRAILS_BY_SCENARIO` in `ScenarioView.tsx`.

---

## Guardrail Services

### PII Scrubber (`backend/src/services/piiScrubber.ts`)
Detects and masks: emails, JWTs, API keys, AWS keys, internal IPs, credit cards,
SSNs, phone numbers, DB connection strings, private key blocks.

```typescript
import { scrubPII, classifyData } from "./services/piiScrubber";

const result = scrubPII(rawLogText);
// result.scrubbed         — masked text
// result.redactionsCount  — how many items were masked
// result.categories       — ["PII", "SECRETS", "NETWORK"]
// result.wasSensitive     — true if PHI/PCI detected
```

### Injection Guard (`backend/src/services/injectionGuard.ts`)
Detects: instruction overrides, system prompt reveal, role jailbreaks, DAN patterns,
token manipulation, developer mode claims, base64 injection.

```typescript
import { checkInjection, getDeflectionMessage } from "./services/injectionGuard";

const result = checkInjection(userInput);
// result.isInjection       — boolean
// result.confidence        — "HIGH" | "MEDIUM" | "LOW"
// result.matchedPatterns   — ["Instruction override attempt", ...]
// result.sanitized         — safe replacement string
```

### Audit Log (`backend/src/services/auditLog.ts`)
In-memory store (500 entries max, newest-first). Resets on server restart.
In production, replace with a database write.

```typescript
import { auditLog } from "./services/auditLog";

auditLog.add({ scenarioId, verdict, guardrailsTriggered, ... });
auditLog.getAll();    // all entries
auditLog.getStats();  // aggregated counts
auditLog.clear();     // demo reset
```

---

## Frontend Architecture Notes

### SSE Streaming Pattern
All AI responses stream via SSE. The `consumeSSE()` function in `src/services/api.ts`
handles reading the stream, buffering incomplete lines, and calling `onEvent` for each
parsed event. Use `AbortController` to cancel in-flight requests on component unmount.

```typescript
const abort = new AbortController();
await runScenarioStream(scenarioId, input, mode, (event) => {
  if (event.type === "delta") appendText(event.content);
  if (event.type === "done") setLoading(false);
}, abort.signal);

// Cancel: abort.abort();
```

### State Pattern for Panels
`ScenarioView` keeps separate state objects for `irresponsible` and `responsible` panels.
Each panel has `{ output, loading, metadata, durationMs, error }`.
Always reset panel state before starting a new run.

### ChatbotView Session Flow
1. On mount: `POST /api/chat/sessions` × 2 (one per mode) → store sessionIds
2. On send: `POST /api/chat/sessions/:id/message` × 2 simultaneously
3. SSE events update the matching message bubble by ID
4. On "New Conversation": delete sessions + re-create

---

## Groq Model Configuration

| Constant | Value | Used For |
|---|---|---|
| `PRIMARY_MODEL` | `llama-3.3-70b-versatile` | All scenario runs and chat |
| `FAST_MODEL` | `llama-3.1-8b-instant` | Available for quick guardrail checks |

To change the model, edit `backend/src/config/groq.ts`.
Groq's API is OpenAI-compatible — the `groq-sdk` wraps `chat.completions.create`.

---

## Common Issues & Fixes

| Issue | Fix |
|---|---|
| `GROQ_API_KEY` missing | Copy `.env.example` → `backend/.env` and set key |
| Port 3001 already in use | `PORT=3002 npm run dev:backend` |
| CORS error | Frontend must run on port 5173 or 3000 (see `backend/src/index.ts`) |
| SSE not streaming | Check browser Network tab → `text/event-stream` content-type |
| TypeScript errors | Run `npm run typecheck` from root |
| `uuid` not found | `npm install uuid @types/uuid` in the affected workspace |
| Sessions lost on restart | By design — audit log and chat sessions are in-memory only |

---

## Demo Flow (5-minute per scenario)

1. Open the scenario from the sidebar
2. Read the **Key Principle** banner
3. Leave the pre-loaded sample input or paste your own
4. Click **Run Both** — watch both panels stream simultaneously
5. Point out the guardrail badges on the Responsible panel
6. Expand **Guardrails Panel** to show technical controls
7. Ask the team: *"Which output would you stake your production system on?"*

### UC-08 Chatbot Specific Demo Flow
1. Navigate to **Engineering Chatbot** (sidebar capstone)
2. Click **💉 Injection Attack** quick button → show deflection on right, compliance on left
3. Click **🗑️ Destructive Command** → show safety questions on responsible path
4. Click **❓ Vague Question** → show how responsible bot asks for context
5. Click **✅ Good Question** → show [GENERAL KNOWLEDGE] source tags
6. Toggle the **Effective Prompting Guide** at the bottom

---

## Not Implemented (Future Work)

- [ ] Persistent storage (replace in-memory audit log with SQLite or Postgres)
- [ ] Per-engineer session tracking and sign-off workflows
- [ ] SAST integration (Semgrep) for UC-05 code generation scanning
- [ ] On-prem model fallback for PHI/PCI classified data (UC-02)
- [ ] Real-time guardrail dashboard with WebSocket push
- [ ] Export scorecard as PDF/Markdown
- [ ] Authentication for multi-team deployments
- [ ] UC-09+ additional scenario slots
