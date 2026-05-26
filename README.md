# VedaAI — AI Assessment Creator

Full-stack take-home for the VedaAI Full Stack Engineer role.

A teacher creates an assignment, picks question types/marks, optionally uploads
reference material; the backend queues an LLM job, generates a structured
question paper, and streams progress back to the browser. The result renders as
an exam-style paper that can be downloaded as a clean PDF or regenerated.

---

## Architecture

```
                            ┌──────────────────────┐
                            │  Next.js 15 (App)    │
                            │  TS · Tailwind ·     │
                            │  Zustand · native WS │
                            └──────────┬───────────┘
                                       │  REST + WebSocket
                                       ▼
┌──────────────┐   enqueue   ┌────────────────────────┐
│ Express API  │ ──────────▶ │  BullMQ queue (Redis)  │
│ (TypeScript) │             └──────────┬─────────────┘
│  · multer    │                        │
│  · zod       │                        ▼
│  · pdfkit    │            ┌────────────────────────┐
└──────┬───────┘            │  Worker (TypeScript)   │
       │                    │   prompt → Groq LLM    │
       │                    │   → zod-validate JSON  │
       │                    │   → persist + notify   │
       │                    └──────────┬─────────────┘
       ▼                               │
┌──────────────┐                       │
│  MongoDB     │ ◀─────────────────────┘
│  (assignments│
│   + results) │                       │ publish event
└──────────────┘                       ▼
                            ┌────────────────────────┐
                            │  Redis pub/sub channel │
                            │  → WS hub fans out to  │
                            │    subscribed clients  │
                            └────────────────────────┘
```

### Why these choices

- **Mongo** for documents — the generated paper is a deeply nested JSON, native
  document storage is the right fit.
- **Redis** does double duty: BullMQ backing store **and** pub/sub channel for
  the WebSocket hub, so the API and worker scale horizontally without sticky
  sessions.
- **BullMQ** for retries, backoff, and idempotency (`jobId` is the deterministic
  key — regenerating creates a fresh job).
- **WebSocket** (raw `ws`, not socket.io) sends three event types:
  `status`, `completed`, `failed`. Client subscribes by `jobId`.
- **Strict prompt + zod-validated response** ensures we never render raw LLM
  output. If the LLM returns malformed JSON or the wrong schema, the job fails
  cleanly and the UI shows an error with a Regenerate action.
- **PDFKit** server-side for the download — gives us real layout control
  (page breaks, fonts, colored difficulty tags) that an HTML print would lose.

---

## Repository layout

```
veda-ai-project/
├── backend/                     Express + BullMQ + WS API
│   ├── src/
│   │   ├── index.ts             API bootstrap (Express, CORS, WS, routes)
│   │   ├── routes/              Express routers
│   │   ├── controllers/         Request handlers (multer + zod)
│   │   ├── models/              Mongoose schemas
│   │   ├── queues/              BullMQ queue definitions
│   │   ├── workers/             BullMQ worker process
│   │   ├── services/
│   │   │   ├── prompt.ts        System + user prompt builder
│   │   │   ├── groq.ts          LLM call + zod response validation
│   │   │   └── pdf.ts           PDFKit paper rendering
│   │   ├── websocket/hub.ts     WS hub with Redis pub/sub fan-out
│   │   ├── config/              env, db, redis singletons
│   │   └── types/               Shared types
│   ├── package.json
│   └── .env.example
├── frontend/                    Next.js 15 (App Router) UI
│   ├── src/
│   │   ├── app/
│   │   │   ├── assignments/                List page (empty + filled)
│   │   │   ├── assignments/new/            Create form
│   │   │   └── assignments/[id]/           Result + generating + failure
│   │   ├── components/
│   │   │   ├── AppShell.tsx                Sidebar + topbar
│   │   │   └── PaperView.tsx               Exam-paper output renderer
│   │   ├── lib/
│   │   │   ├── api.ts                      Fetch wrappers
│   │   │   ├── ws.ts                       useGenerationStream hook
│   │   │   ├── types.ts                    Shared TS types
│   │   │   └── cn.ts                       clsx + tailwind-merge
│   │   └── store/draft.ts                  Zustand store for create form
│   ├── package.json
│   └── .env.example
├── docker-compose.yml           Mongo + Redis for local dev
└── README.md
```

---

## Prerequisites

- **Node.js ≥ 20**
- **Docker** (or local installs of MongoDB 7 + Redis 7)
- A **Groq API key** (free, get one at https://console.groq.com).
  The LLM can be swapped for any provider by editing `backend/src/services/groq.ts`.

---

## Setup

### 1. Start MongoDB + Redis

Easiest path — Docker:

```bash
docker run -d --name vedaai-mongo -p 27017:27017 -v vedaai-mongo:/data/db mongo:7
docker run -d --name vedaai-redis -p 6379:6379 -v vedaai-redis:/data redis:7-alpine
```

Or via the included compose file (if you have docker compose v2):

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env and paste your GROQ_API_KEY
npm install
```

Run **two** processes (in two terminals):

```bash
npm run dev       # API on :4000
npm run worker    # BullMQ generation worker
```

Health check: `curl http://localhost:4000/health` → `{ ok: true }`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local      # optional — defaults work
npm install
npm run dev                     # :3000
```

Open http://localhost:3000.

---

## Environment variables

### `backend/.env`

| Key | Default | Notes |
|---|---|---|
| `PORT` | `4000` | API + WS port |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed origins, or `*` |
| `MONGODB_URI` | `mongodb://localhost:27017/vedaai` | Atlas connection string also fine |
| `REDIS_URL` | `redis://localhost:6379` | Use `rediss://` for Upstash |
| `GROQ_API_KEY` | — | Required for actual generation |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Any Groq chat-completion model |
| `WS_PATH` | `/ws` | WebSocket upgrade path |

### `frontend/.env.local`

| Key | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Used by the Next rewrite |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:4000/ws` | Used by the WS hook |

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/api/assignments` | List (supports `?search=&limit=&skip=`) |
| `POST` | `/api/assignments` | Create — JSON or multipart with `file` + `payload` |
| `GET` | `/api/assignments/:id` | Detail (Redis-cached for 1h once completed) |
| `DELETE` | `/api/assignments/:id` | Delete |
| `POST` | `/api/assignments/:id/regenerate` | Re-queue with a fresh `jobId` |
| `GET` | `/api/assignments/:id/pdf` | Render and download PDF |
| `GET` | `/api/assignments/job/:jobId` | Lookup by job id |
| `WS` | `/ws` | Client sends `{type:"subscribe", jobId}`; server pushes `status`/`completed`/`failed` |

---

## How the generation pipeline runs

1. Browser submits the create form → `POST /api/assignments` (JSON or multipart).
2. If a PDF/text file is attached, `pdf-parse` extracts text into `sourceText`.
3. Payload is zod-validated, persisted with `status: "queued"`, and a BullMQ job
   is enqueued with `jobId` = generated UUID.
4. The frontend navigates to `/assignments/[id]?jobId=…` and opens a WebSocket
   subscribing to that `jobId`.
5. The worker (separate process) picks up the job:
   - publishes `status: processing` with progress messages,
   - calls `buildPrompt(input)` → produces a strict-JSON-mode system prompt,
   - calls Groq Chat Completions with `response_format: json_object`,
   - parses the response and validates it against a zod schema (sections,
     questions, difficulty enum, marks, mcq options),
   - normalises and persists,
   - publishes `completed` with the parsed paper.
6. Frontend renders the paper. It never touches the raw LLM string.
7. Failures bubble up as `failed` events with the error message, and the UI
   surfaces a Try Again action.

---

## Validation & guardrails

**Frontend** (zod-free, validated in the form before submit):
- Title required
- Due date must parse
- Each question row must have count ≥ 1, marks ≥ 1
- Each question type may appear at most once
- Total questions ≤ 100

**Backend** (zod schema in the controller):
- Same checks, plus per-row caps (count ≤ 50, marks ≤ 100)
- File upload type-checked + 10 MB cap (multer)
- Question-type enum strictly enforced

**LLM output** (zod schema in `services/groq.ts`):
- Required fields on paper / section / question
- Difficulty enum
- MCQ must have ≥ 2 options (or job fails)

---

## Bonus features delivered

- ✅ **PDF export** — server-side PDFKit, colored difficulty markers, separate
  answer-key page, A4 layout.
- ✅ **Regenerate** — one-click new job from the result page.
- ✅ **Difficulty badges** — color-coded chips in the rendered paper.
- ✅ **Redis caching** — completed assignments cached for 1h on detail GET.
- ✅ **Real-time updates** — WebSocket-streamed progress messages
  ("Structuring your prompt…", "Asking the model to draft questions…",
  "Validating and formatting…").
- ✅ **Mobile responsive** — sidebar drawer, stacked form rows, full-width cards.
- ✅ **File ingestion** — PDF + plain text are parsed into the prompt context.

---

## Running tests / verifying manually

A scripted smoke test of the full pipeline:

```bash
# 1. boot mongo + redis
docker run -d --name vedaai-mongo -p 27017:27017 mongo:7
docker run -d --name vedaai-redis -p 6379:6379 redis:7-alpine

# 2. boot backend + worker (two shells)
cd backend && npm install && npm run dev
cd backend && npm run worker

# 3. create an assignment
curl -X POST http://localhost:4000/api/assignments \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Quiz on Electricity",
    "subject": "Science",
    "gradeLevel": "8th",
    "dueDate": "2026-06-15",
    "questionTypes": [
      { "type": "mcq", "count": 4, "marksPerQuestion": 1 },
      { "type": "short_answer", "count": 3, "marksPerQuestion": 2 }
    ],
    "schoolName": "Delhi Public School, Sector-4, Bokaro",
    "teacherName": "Lakshya"
  }'

# 4. poll detail until status === "completed"
curl http://localhost:4000/api/assignments/<id>

# 5. download the PDF
curl -o paper.pdf http://localhost:4000/api/assignments/<id>/pdf
```

---

## Decisions / trade-offs worth noting

- **Difficulty values**: the Figma uses `Easy / Moderate / Challenging`, so the
  backend enum matches that vocabulary (`challenging`, not `hard`).
- **Question type catalogue** includes the design's `Diagram/Graph-Based` and
  `Numerical Problems` in addition to the standard set.
- **No auth** — out of scope for the brief; teacher/school identity is supplied
  as form fields (defaults: "Lakshya" / "Delhi Public School, Sector-4, Bokaro").
- **`pdf-parse` warning suppressed** — known noisy debug log on module load; not
  load-bearing.

---

## Submission

- Repo root: this directory.
- Setup: see the **Setup** section above. Three commands to get running once
  Mongo + Redis are up: `npm install && npm run dev` in `backend`,
  `npm run worker` in another shell, `npm install && npm run dev` in `frontend`.
- Deployed link: TBD (the system is stateless apart from Mongo + Redis, so it
  drops cleanly onto Render / Railway / Fly with the same env vars).
