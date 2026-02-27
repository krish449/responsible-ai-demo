# Responsible AI Demo — Technical Documentation

> Full technical reference: architecture, components, data flow, and API.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 18 + TypeScript | Backend server |
| **Framework** | Express 4 | HTTP server, routing, middleware |
| **AI Provider** | Groq SDK (`llama-3.3-70b-versatile`) | LLM inference with SSE streaming |
| **Database** | SQLite via `@libsql/client` | Persistent user + quiz data |
| **Auth — Tokens** | `jsonwebtoken` (JWT, 7-day expiry) | Stateless session management |
| **Auth — Passwords** | `bcryptjs` (12 rounds) | Password hashing |
| **Auth — Google** | `google-auth-library` + `@react-oauth/google` | Google OAuth 2.0 |
| **Frontend** | React 18 + Vite + TypeScript | SPA UI |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Routing** | React Router v6 | Client-side navigation |
| **Streaming** | SSE (Server-Sent Events) | Real-time LLM output |
| **Deployment** | Railway.app | Cloud hosting (single service) |
| **Source Control** | GitHub (`krish449/responsible-ai-demo`) | CI/CD trigger |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│  React 18 SPA (Vite build)                                      │
│  ┌───────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │ AuthContext│  │ React Router │  │ api.ts (fetch + SSE)   │   │
│  │ (JWT store)│  │ (8 routes)   │  │ authHeaders() helper   │   │
│  └───────────┘  └──────────────┘  └────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS (Railway domain)
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│              RAILWAY SERVICE (Single Container)                  │
│                                                                 │
│  Express Server (port $PORT, default 8080 in prod)              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Static File Serving (frontend/dist)                    │   │
│  │  Serves React SPA for all non-API routes                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │/api/auth │ │/api/scen │ │/api/chat │ │/api/quiz │         │
│  │ (public) │ │ (+ auth) │ │ (+ auth) │ │ (+ auth) │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│       ┌───────────────────────────────────────────────┐        │
│       │           /api/admin (admin role only)         │        │
│       └───────────────────────────────────────────────┘        │
│                                                                 │
│  ┌─────────────────────────┐  ┌──────────────────────────┐    │
│  │  Guardrail Services     │  │  SQLite DB (app.db)       │    │
│  │  • PII Scrubber         │  │  • users table            │    │
│  │  • Injection Guard      │  │  • quiz_attempts table    │    │
│  │  • Audit Log            │  │  Seeded: admin/Admin@123  │    │
│  └─────────────────────────┘  └──────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS API calls
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   GROQ CLOUD (External)                          │
│                                                                 │
│   Model: llama-3.3-70b-versatile                                │
│   Mode: streaming (chat.completions.create, stream: true)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id           TEXT PRIMARY KEY,            -- UUID v4
  username     TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE,                 -- optional
  password_hash TEXT,                       -- null for Google-only accounts
  google_id    TEXT UNIQUE,                 -- null for password accounts
  role         TEXT DEFAULT 'user' NOT NULL, -- 'user' | 'admin'
  created_at   TEXT DEFAULT (datetime('now')) NOT NULL,
  last_login   TEXT
);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
  id              TEXT PRIMARY KEY,          -- UUID v4
  user_id         TEXT NOT NULL,
  score           INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage      REAL NOT NULL,
  completed_at    TEXT DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Seed:** Admin account auto-created on first boot: `admin` / `Admin@123`

---

## Frontend Component Diagram

```
App.tsx
├── GoogleOAuthProvider (wraps entire app)
└── AuthProvider (JWT + user state in localStorage)
    ├── /login          → LoginPage
    │                     ├── Username/Password form
    │                     └── Google Sign In button (conditional on VITE_GOOGLE_CLIENT_ID)
    │
    ├── /register       → RegisterPage
    │                     ├── Username, Email, Password fields
    │                     └── Google Sign In button
    │
    └── ProtectedRoute (redirects to /login if no token)
        └── Layout: Sidebar + <Outlet>
            │
            ├── Sidebar
            │   ├── Logo + nav links (Dashboard, Scenarios, Chatbot, Charter, Scorecard, Quiz)
            │   ├── User avatar + username display
            │   ├── Admin Dashboard link (admin role only)
            │   └── Logout button
            │
            ├── /dashboard      → Dashboard
            │                     └── Scenario cards grid + quick-start links
            │
            ├── /scenario/:id   → ScenarioView
            │                     ├── Key Principle banner
            │                     ├── Input textarea + "Run Both" button
            │                     ├── ❌ Irresponsible Panel (SSE stream)
            │                     └── ✅ Responsible Panel (SSE stream)
            │                         └── Guardrails Panel (expandable)
            │
            ├── /chatbot        → ChatbotView
            │                     ├── Quick demo buttons
            │                     ├── ❌ Irresponsible chatbot (SSE stream)
            │                     └── ✅ Responsible chatbot (SSE stream)
            │
            ├── /charter        → Charter
            │                     └── AI Usage Charter static content
            │
            ├── /scorecard      → Scorecard
            │                     ├── Risk stats cards
            │                     └── Audit log table (live)
            │
            ├── /quiz           → Quiz
            │                     ├── 20 questions (random from pool of 48)
            │                     ├── Category breakdown on completion
            │                     ├── Score saved to backend on completion
            │                     └── Retake with new question set
            │
            └── /admin          → AdminDashboard (admin role only)
                                  ├── Tab: Users (table)
                                  ├── Tab: Quiz Scores (table)
                                  ├── Tab: Leaderboard (ranked list)
                                  └── Tab: Login Activity (last login per user)
```

---

## Backend Service Diagram

```
backend/src/
│
├── index.ts                    Entry point
│   ├── CORS config             (localhost in dev, FRONTEND_URL in prod)
│   ├── Route mounting          (public + protected)
│   ├── Static file serving     (frontend/dist in production)
│   └── initDB()                (on startup — creates tables + seeds admin)
│
├── config/groq.ts              Groq client setup
│   ├── isApiKeyValid()         Validates GROQ_API_KEY is not a placeholder
│   ├── groqClient              Groq SDK instance
│   ├── PRIMARY_MODEL           llama-3.3-70b-versatile
│   └── FAST_MODEL              llama-3.1-8b-instant
│
├── db/database.ts              SQLite layer
│   ├── initDB()                Creates tables + seeds admin on first run
│   ├── userQueries             findById, findByUsername, findByEmail,
│   │                           findByGoogleId, create, updateLastLogin,
│   │                           linkGoogleId, all
│   └── quizQueries             create, byUser, all, leaderboard
│
├── services/
│   ├── authService.ts          Auth logic
│   │   ├── register()          Hash password → insert user → return JWT
│   │   ├── login()             Verify password → update last_login → return JWT
│   │   ├── googleAuth()        Verify Google ID token → upsert user → return JWT
│   │   ├── signToken()         JWT sign (7d expiry)
│   │   ├── verifyToken()       JWT verify
│   │   └── getUserById()       DB lookup by ID
│   │
│   ├── piiScrubber.ts          PII detection + masking
│   │   ├── scrubPII()          Replaces 10 pattern types with [REDACTED-TYPE]
│   │   └── classifyData()      Returns categories: PII / SECRETS / NETWORK / PHI / PCI
│   │
│   ├── injectionGuard.ts       Prompt injection defence
│   │   ├── checkInjection()    Tests against 9 regex patterns (HIGH/MEDIUM/LOW)
│   │   └── getDeflectionMessage() Safe response for injection attempts
│   │
│   └── auditLog.ts             In-memory audit log
│       ├── auditLog.add()      Append entry (max 500, newest-first)
│       ├── auditLog.getAll()   Return all entries
│       ├── auditLog.getStats() Aggregate counts + risk metrics
│       └── auditLog.clear()    Demo reset
│
├── middleware/
│   └── auth.ts
│       ├── requireAuth         Extract Bearer token → verify JWT → attach req.user
│       └── requireAdmin        requireAuth + check role === 'admin'
│
├── scenarios/index.ts          8 ScenarioConfig objects (UC-01 to UC-08)
│   └── Each config has:        id, title, dimension, irresponsible{}, responsible{},
│                               sampleInput, guardrails[], demoTip
│
└── routes/
    ├── auth.ts                 POST /register, /login, /google — GET /me
    ├── scenarios.ts            GET /, /:id — POST /:id/run (SSE) — GET+DELETE /audit/log
    ├── chat.ts                 POST /sessions — GET+DELETE /:id — POST /:id/message (SSE)
    ├── quiz.ts                 POST /attempts — GET /attempts/me — GET /leaderboard
    └── admin.ts                GET /users — GET /quiz-attempts
```

---

## Authentication Flow

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│  Browser │         │ Express API  │         │  SQLite DB   │
└────┬─────┘         └──────┬───────┘         └──────┬───────┘
     │                      │                        │
     │  POST /api/auth/login │                        │
     │  {username, password} │                        │
     │─────────────────────>│                        │
     │                      │  findByUsername()       │
     │                      │───────────────────────>│
     │                      │  UserRow               │
     │                      │<───────────────────────│
     │                      │  bcrypt.compare()       │
     │                      │  updateLastLogin()      │
     │                      │───────────────────────>│
     │                      │  signToken(userId)      │
     │  {token, user}        │                        │
     │<─────────────────────│                        │
     │                      │                        │
     │  Store token in       │                        │
     │  localStorage         │                        │
     │  (rai_token)          │                        │
     │                      │                        │
     │  GET /api/scenarios   │                        │
     │  Authorization: Bearer│                        │
     │─────────────────────>│                        │
     │                      │  verifyToken()          │
     │                      │  getUserById()          │
     │                      │───────────────────────>│
     │                      │  attach req.user        │
     │  200 OK + data        │                        │
     │<─────────────────────│                        │
```

---

## Scenario Execution Flow (SSE Streaming)

```
User clicks "Run Both"
        │
        ├──────────────────────────────────────────────┐
        │                                              │
        ▼                                              ▼
POST /api/scenarios/:id/run              POST /api/scenarios/:id/run
{ mode: "irresponsible" }               { mode: "responsible" }
        │                                              │
        ▼                                              ▼
  Build raw prompt                      1. checkInjection(input)
  (no system prompt)                       └─ if HIGH confidence → SSE error
        │                                  2. scrubPII(input)
        │                                     └─ redact emails, keys, IPs...
        │                                  3. Build system prompt
        │                                     (with guardrail instructions)
        │                                  4. auditLog.add(entry)
        │                                              │
        ▼                                              ▼
  groq.chat.completions                 groq.chat.completions
  .create({ stream: true })             .create({ stream: true })
        │                                              │
        ▼                                              ▼
  SSE: { type: "metadata" }             SSE: { type: "metadata",
  SSE: { type: "delta", content }             guardrailsTriggered: [...] }
  SSE: { type: "done" }                 SSE: { type: "delta", content }
                                        SSE: { type: "done" }
```

---

## The 8 Use Cases

| ID | Title | Dimension | Key Demo |
|---|---|---|---|
| UC-01 | Code Review Assistant | Transparency | Opaque vs structured findings with severity + line citations |
| UC-02 | Incident Log Analyzer | Privacy & Data Safety | PII scrubber — see network tab for redacted data |
| UC-03 | Architecture Assistant | Human Oversight | Decision suppression — tradeoffs not recommendations |
| UC-04 | Test Case Generator | Fairness & Bias | 6 coverage categories incl. international/adversarial |
| UC-05 | Secure Code Generation | Security | SECURITY NOTE annotations vs silent SQL injection |
| UC-06 | API Doc Generator | Accuracy & Hallucination | [VERIFIED]/[INFERRED]/[UNKNOWN] tags + COVERAGE GAPS |
| UC-07 | PR Merge Gating | Human Oversight | Advisory-only vs auto-merge (secret key in diff demo) |
| UC-08 | Engineering Chatbot | All Dimensions | Live injection deflection, source tags, destructive gate |

---

## API Reference

### Auth (Public)
```
POST /api/auth/register     { username, password, email? }     → { token, user }
POST /api/auth/login        { username, password }             → { token, user }
POST /api/auth/google       { credential }                     → { token, user }
GET  /api/auth/me           Authorization: Bearer <jwt>        → { user }
```

### Scenarios (Auth required)
```
GET    /api/scenarios                       → { scenarios[] }
GET    /api/scenarios/:id                   → { scenario }
POST   /api/scenarios/:id/run               → SSE stream
GET    /api/scenarios/audit/log             → { log[], stats }
DELETE /api/scenarios/audit/log             → { cleared: true }
```

### Chat (Auth required)
```
POST   /api/chat/sessions                   → { sessionId }
GET    /api/chat/sessions/:id               → { messages[] }
POST   /api/chat/sessions/:id/message       → SSE stream
DELETE /api/chat/sessions/:id               → { deleted: true }
```

### Quiz (Auth required)
```
POST   /api/quiz/attempts     { score, totalQuestions, percentage }  → { attempt }
GET    /api/quiz/attempts/me                                         → { attempts[] }
GET    /api/quiz/leaderboard                                         → { leaderboard[] }
```

### Admin (Admin role required)
```
GET    /api/admin/users                     → { users[] }
GET    /api/admin/quiz-attempts             → { attempts[] }
```

### Health
```
GET    /api/health                          → { status, timestamp, version }
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key (console.groq.com) |
| `JWT_SECRET` | Yes | Long random string for JWT signing |
| `GOOGLE_CLIENT_ID` | No | Google OAuth Client ID (enables Google Sign In) |
| `NODE_ENV` | Yes | Set to `production` on Railway |
| `FRONTEND_URL` | Yes (prod) | Railway URL for CORS allowlist |
| `VITE_GOOGLE_CLIENT_ID` | No | Same as GOOGLE_CLIENT_ID (baked into frontend build) |
| `PORT` | Auto | Set by Railway automatically |
| `RAILWAY_VOLUME_MOUNT_PATH` | No | Volume path for persistent SQLite (e.g. `/data`) |

---

## Deployment Architecture (Railway)

```
GitHub Push
    │
    ▼
Railway Build (Nixpacks)
    ├── npm run install:all      (install backend + frontend deps)
    └── npm run build            (tsc backend + vite build frontend)
            │
            ▼
    Single Container
    ├── /app/backend/dist/       (compiled Express server)
    └── /app/frontend/dist/      (built React SPA)
            │
            ▼
    npm run start
    └── node backend/dist/index.js
        ├── Serves /api/*        (Express routes)
        └── Serves /*            (React SPA from frontend/dist)
```

**Live URL:** https://responsible-ai-demo.up.railway.app

---

## Project File Tree

```
responsible-ai-demo/
├── CLAUDE.md                      Project instructions for Claude Code
├── DOCUMENTATION.md               This file
├── package.json                   Root: concurrently + build scripts
├── railway.toml                   Railway build + deploy config
├── .env.example                   Template for required environment variables
├── .gitignore
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               Express entry point
│       ├── config/groq.ts         Groq client + model constants
│       ├── db/database.ts         SQLite init + queries
│       ├── middleware/auth.ts     requireAuth + requireAdmin
│       ├── scenarios/index.ts     8 ScenarioConfig objects
│       ├── services/
│       │   ├── authService.ts     JWT, bcrypt, Google token verify
│       │   ├── piiScrubber.ts     10 PII pattern types
│       │   ├── injectionGuard.ts  9 injection patterns
│       │   └── auditLog.ts        In-memory log (500 entries max)
│       └── routes/
│           ├── auth.ts            /api/auth/*
│           ├── scenarios.ts       /api/scenarios/*
│           ├── chat.ts            /api/chat/*
│           ├── quiz.ts            /api/quiz/*
│           └── admin.ts           /api/admin/*
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx                Router + AuthProvider + GoogleOAuthProvider
        ├── types/index.ts         Shared TypeScript types
        ├── services/api.ts        All API calls + SSE consumer
        ├── context/AuthContext.tsx Auth state (token, user, login, logout)
        └── components/
            ├── LoginPage.tsx      Login form + Google OAuth button
            ├── RegisterPage.tsx   Registration form
            ├── ProtectedRoute.tsx Route guard (redirects to /login)
            ├── Sidebar.tsx        Navigation + user info + logout
            ├── Dashboard.tsx      Landing page with scenario cards
            ├── ScenarioView.tsx   Split-panel UC-01 to UC-07 runner
            ├── ChatbotView.tsx    UC-08 side-by-side chatbot
            ├── Charter.tsx        AI Usage Charter page
            ├── Scorecard.tsx      Audit log + risk stats
            ├── Quiz.tsx           48-question pool, 20 per attempt
            └── AdminDashboard.tsx Users, quiz scores, leaderboard, activity
```
