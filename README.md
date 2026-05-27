# VedaAI Assessment Creator

A working AI assessment generator built as the **VedaAI Full-Stack Engineering hiring submission**.

A teacher describes an assignment (title, subject, grade, due date, file upload, question
breakdown by type and marks, free-form instructions), the system enqueues a generation job,
a background worker structures a prompt and calls an LLM (Groq, `llama-3.3-70b-versatile`),
validates the JSON response against a strict schema, persists the result, and streams live
progress to the browser over a WebSocket. The teacher then sees the rendered exam paper,
downloads it as a real PDF, or regenerates.

The whole flow is deployed on real infrastructure (AWS EC2 for the backend, Vercel for the
frontend, Cloudflare DNS, Let's Encrypt TLS) — not a localhost demo. See [Live Links](#live-links)
below.

---

## Live Links

| What | URL |
|---|---|
| Frontend (Vercel) | https://vedaai.yashvanth.com |
| Backend API (AWS EC2) | https://api.vedaai.yashvanth.com |
| Health probe | https://api.vedaai.yashvanth.com/health |
| Source repo | https://github.com/yashvanthsankar/vedaai |
| Credits page (inside the app) | https://vedaai.yashvanth.com/credits |
| Built by | [Yashvanth Sankar](https://yashvanth.com) · [GitHub](https://github.com/yashvanthsankar) · [LinkedIn](https://linkedin.com/in/yashvanths) · yashvanthsankar@gmail.com |

---

## Architecture

```
                              ┌──────────────────────────┐
                              │   Browser (any device)   │
                              │  https://vedaai.yashvan… │
                              └────────────┬─────────────┘
                                           │ HTTPS + WSS
                                           ▼
                          ┌────────────────────────────────────┐
                          │      Vercel (Next.js 15, SSR)      │
                          │  Edge + static + /api/* rewrite    │
                          └────────────────┬───────────────────┘
                                           │  rewrite /api/*
                                           ▼  → api.vedaai.yashvanth.com
                          ┌────────────────────────────────────┐
                          │     AWS EC2  t4g.small  ARM        │
                          │     ap-south-1 (Mumbai), 2 vCPU    │
                          │     Elastic IP 65.1.124.175        │
                          │                                    │
                          │  ┌─────────────────────────────┐   │
                          │  │  nginx (TLS, Let's Encrypt) │   │
                          │  │  :80 → :443 → :4000         │   │
                          │  └────────────┬────────────────┘   │
                          │               │ proxy               │
                          │               ▼                     │
                          │  ┌─────────────────────────────┐   │
                          │  │  PM2                        │   │
                          │  │  ├─ vedaai-api  (Express)   │───┼──► WebSocket /ws
                          │  │  └─ vedaai-worker (BullMQ)  │   │     (subscribe to jobId)
                          │  └────┬───────────────┬────────┘   │
                          │       │               │             │
                          │       ▼               ▼             │
                          │  ┌─────────┐    ┌──────────┐        │
                          │  │ Mongo 7 │    │ Redis 7  │        │
                          │  │ :27017  │    │ :6379    │        │
                          │  │ local   │    │ local    │        │
                          │  └─────────┘    └────┬─────┘        │
                          └─────────────────────┼──────────────┘
                                                │ pub/sub channel "paper-events"
                                                │
                                                ▼
                                  ┌──────────────────────┐
                                  │   Groq Cloud API     │
                                  │   llama-3.3-70b-     │
                                  │     versatile        │
                                  └──────────────────────┘
```

**Request flow for "Create Assignment":**

1. Browser POSTs `multipart/form-data` to `/api/assignments` (optional file + JSON payload).
2. Express validates the payload with Zod, extracts text from any uploaded PDF via `unpdf`,
   inserts an `Assignment` doc in Mongo with `status: queued` and a fresh `jobId`.
3. The same handler enqueues a job on the `paper-generation` BullMQ queue (Redis-backed).
4. The frontend opens a WebSocket to `/ws`, sends `{ type: 'subscribe', jobId }`.
5. The `vedaai-worker` process pulls the job, marks it `processing`, publishes a status
   event on the Redis pub/sub channel `paper-events`. The API's WS hub re-broadcasts the
   event to every subscriber of that `jobId`.
6. Worker builds a structured prompt (`backend/src/services/prompt.ts`), calls Groq with
   `response_format: { type: 'json_object' }`, parses + validates the response against a
   Zod schema (`backend/src/services/groq.ts`).
7. Worker saves the result, marks status `completed`, publishes a `completed` event with
   the full paper. The browser receives it and renders.
8. PDF export is on-demand: `GET /api/assignments/:id/pdf` streams a PDFKit-rendered A4
   document built from the same JSON.

---

## Tech Stack

| Layer | Library | Version | Why |
|---|---|---|---|
| **Frontend framework** | Next.js | 15.1.6 (App Router) | SSR, file-system routing, easy Vercel deploy |
| | React | 19 | — |
| | TypeScript | 5.7 | — |
| | Tailwind CSS | 3.4 | utility-first styling, matches Figma rapidly |
| **State** | Zustand | 5.0 | small, no provider boilerplate; used for `draft` + `groups` + `profile` |
| **Icons** | lucide-react | 0.473 | — |
| **Fonts** | Bricolage Grotesque (Google Fonts) | — | matches the Figma exactly |
| | Georgia (system) | — | exam-paper serif on the output page |
| **Backend runtime** | Node.js | 22 | — |
| | Express | 4.21 | unopinionated, well-known |
| | TypeScript | 5.7 | shared types with frontend (manual sync) |
| | `tsx` | 4.19 | run TS without a build step in dev + prod |
| **Validation** | Zod | 3.24 | both the create payload and the LLM response |
| **DB** | MongoDB | 7 (community) | doc-shaped data; one Mongoose model per collection |
| | Mongoose | 8.9 | — |
| **Queue / Cache** | Redis | 7 | BullMQ store + WS pub/sub broker |
| | BullMQ | 5.34 | jobs with retries, persistence, dashboards if needed |
| | ioredis | 5.4 | — |
| **WebSocket** | `ws` | 8.18 | tiny native WS server attached to the same HTTP server |
| **AI** | Groq SDK | 0.12 | fast, free-tier-friendly |
| | Model | `llama-3.3-70b-versatile` | strong JSON-mode adherence |
| **File upload** | Multer | 1.4 LTS | memory storage, 10 MB cap |
| **PDF read** | unpdf | 1.6 | Mozilla pdfjs wrapped for Node, handles malformed XRef |
| **PDF write** | PDFKit | 0.15 | hand-laid-out A4 exam paper |
| **IDs** | uuid v4 | 11 | jobIds |
| **Web server** | nginx | 1.24 | TLS termination + WebSocket proxy |
| **Process manager** | PM2 | latest | API + worker with auto-restart |
| **TLS** | Let's Encrypt via certbot | — | auto-renews |

---

## Project Structure

```
veda-ai-project/
├── README.md                        # this file
├── docker-compose.yml               # Mongo + Redis for local dev
├── .gitignore
│
├── backend/                         # Express + BullMQ + Groq
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts                 # API bootstrap: CORS, JSON, routes, error handler, WS
│       ├── config/
│       │   ├── db.ts                # mongoose.connect
│       │   ├── env.ts               # typed env loader with required() guard
│       │   └── redis.ts             # ioredis factory (BullMQ + WS pub/sub)
│       ├── controllers/
│       │   ├── assignment.controller.ts   # create, list, get, regen, delete, pdf
│       │   └── profile.controller.ts      # GET / PATCH /api/profile (singleton)
│       ├── models/
│       │   ├── Assignment.ts        # Mongoose schema for an assignment + result
│       │   └── Profile.ts           # singleton Profile doc (school + teacher defaults)
│       ├── queues/
│       │   └── generation.queue.ts  # BullMQ Queue, name = "paper-generation"
│       ├── routes/
│       │   ├── assignment.routes.ts # /api/assignments routes + Multer middleware
│       │   └── profile.routes.ts    # /api/profile
│       ├── services/
│       │   ├── prompt.ts            # buildPrompt(input) → { system, user }
│       │   ├── groq.ts              # generatePaper(prompt) → Zod-validated paper
│       │   └── pdf.ts               # renderPaperPdf(doc) → Buffer (A4 PDFKit)
│       ├── types/
│       │   └── assignment.ts        # shared interfaces & enums
│       ├── websocket/
│       │   └── hub.ts               # WSS + Redis pub/sub bridge, publishEvent()
│       └── workers/
│           └── generation.worker.ts # BullMQ Worker: prompt → Groq → validate → save → publish
│
├── frontend/                        # Next.js 15 App Router
│   ├── package.json
│   ├── next.config.mjs              # /api/* rewrite → backend
│   ├── tailwind.config.ts           # design tokens (palette, type scale, motion)
│   ├── tsconfig.json
│   ├── .env.example
│   ├── public/
│   │   └── brand/logo.avif          # VedaAI mark
│   ├── scripts/
│   │   └── visual-check.mjs         # Playwright screenshot helper (dev only)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           # AppShell wrapper
│       │   ├── page.tsx             # redirect → /assignments
│       │   ├── assignments/
│       │   │   ├── page.tsx         # list + empty-state + filter + search + grid
│       │   │   ├── new/page.tsx     # 2-step Create wizard (form + review)
│       │   │   └── [id]/page.tsx    # generating progress + final paper view
│       │   ├── home/page.tsx        # dashboard: stats + recent + CTA
│       │   ├── library/page.tsx     # completed papers + PDF download
│       │   ├── toolkit/page.tsx     # preset templates (Quick Quiz, Long Test, …)
│       │   ├── groups/page.tsx      # local-state class roster with CRUD
│       │   ├── settings/page.tsx    # profile editor (writes /api/profile)
│       │   └── credits/page.tsx     # about + links
│       ├── components/
│       │   ├── AppShell.tsx         # sidebar + topbar + mobile bar + modals
│       │   ├── Brand.tsx            # Logo, Wordmark, SparklesFilled
│       │   ├── Avatars.tsx          # PortraitAvatar, SchoolCrest
│       │   ├── EmptyIllustration.tsx# the "No assignments yet" composed SVG scene
│       │   ├── Modal.tsx            # accessible dialog primitive
│       │   ├── EditModals.tsx       # ProfileEditModal + SchoolEditModal
│       │   ├── PaperView.tsx        # serif exam-paper renderer
│       │   └── ComingSoon.tsx       # stub-page card
│       ├── lib/
│       │   ├── api.ts               # fetch wrappers for every endpoint
│       │   ├── profile.ts           # useProfile hook + Zustand store
│       │   ├── types.ts             # frontend mirror of backend types
│       │   ├── ws.ts                # useGenerationStream — opens WS, subscribes, derives state
│       │   └── cn.ts                # clsx + tailwind-merge helper
│       └── store/
│           ├── draft.ts             # Create-form state (Zustand)
│           └── groups.ts            # local class groups (Zustand with persist)
│
└── figma-design/                    # Source-of-truth Figma exports (gitignored)
```

---

## API Surface

All routes prefixed with `/api`. Live base URL: `https://api.vedaai.yashvanth.com`.

### Assignments

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| `GET` | `/api/assignments` | – | `{ items, total, limit, skip }` | Query: `search`, `limit` (max 100), `skip` |
| `POST` | `/api/assignments` | `multipart/form-data` with `payload` JSON + optional `file` (PDF/text/image, ≤10 MB) | `{ assignmentId, jobId, status: 'queued' }` (201) | Validated by Zod; enqueues a BullMQ job |
| `GET` | `/api/assignments/:id` | – | full `Assignment` doc | – |
| `GET` | `/api/assignments/job/:jobId` | – | `Assignment` doc | – |
| `POST` | `/api/assignments/:id/regenerate` | – | `{ assignmentId, jobId, status: 'queued' }` | Re-enqueues with a new jobId |
| `DELETE` | `/api/assignments/:id` | – | `204` | – |
| `GET` | `/api/assignments/:id/pdf` | – | `application/pdf` stream | 409 if status ≠ completed |

### Profile (singleton)

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| `GET` | `/api/profile` | – | full `Profile` doc | Auto-creates with defaults on first read |
| `PATCH` | `/api/profile` | partial fields | updated `Profile` doc | Whitelists `teacherName`, `teacherEmail`, `schoolName`, `schoolLocation`, `defaultSubject`, `defaultGradeLevel` |

### Health

| Method | Path | Response |
|---|---|---|
| `GET` | `/health` | `{ ok: true, ts }` |

### WebSocket

- **Path:** `/ws` (so `wss://api.vedaai.yashvanth.com/ws`)
- **Subscribe:** client sends `{ "type": "subscribe", "jobId": "<uuid>" }`
- **Server events:**
  - `{ type: "subscribed", jobId }`
  - `{ type: "status", jobId, status, progress, message }`
  - `{ type: "completed", jobId, result }`
  - `{ type: "failed", jobId, error }`

The hub uses Redis pub/sub (`paper-events` channel) so the API and worker can be on
separate processes and still talk to the same subscribers.

---

## Data Model

### `Assignment`

```ts
{
  _id: ObjectId,
  title: string,
  subject?: string,
  gradeLevel?: string,
  dueDate: string,                        // ISO date
  questionTypes: [
    { type: QuestionType, count: number, marksPerQuestion: number }
  ],
  additionalInstructions?: string,
  sourceText?: string,                    // extracted from uploaded PDF
  schoolName?: string,
  teacherName?: string,
  jobId: string,                          // unique, indexed
  status: 'queued' | 'processing' | 'completed' | 'failed',
  result?: GeneratedPaper,                // see below
  error?: string,
  createdAt, updatedAt
}

QuestionType =
  | 'mcq'
  | 'short_answer'
  | 'long_answer'
  | 'true_false'
  | 'fill_blank'
  | 'diagram_graph'
  | 'numerical'

GeneratedPaper = {
  title, subject?, gradeLevel?, dueDate,
  totalMarks: number,
  timeAllowedMinutes?: number,
  introMessage?: string,                  // friendly LLM-authored greeting
  sections: [
    {
      id: 'A' | 'B' | 'C' | ...,
      title, instruction,
      questions: [
        {
          id,                              // e.g. "A1"
          text,
          type: QuestionType,
          difficulty: 'easy' | 'moderate' | 'challenging',
          marks: number,
          options?: string[],              // exactly 4 for mcq
          answer?: string
        }
      ]
    }
  ]
}
```

### `Profile` (singleton)

```ts
{ teacherName, teacherEmail?, schoolName, schoolLocation,
  defaultSubject?, defaultGradeLevel?, createdAt, updatedAt }
```

---

## Generation Pipeline (in detail)

1. **Payload validation** — `assignment.controller.ts` parses the multipart body and runs
   it through a Zod schema (`createSchema`). Rejects empty titles, missing dates, negative
   counts, duplicate question types, total questions > 100.

2. **PDF/text extraction** — if a file is attached:
   - **PDF** is parsed with `unpdf` (Mozilla pdfjs under the hood). Returns extracted
     plain text, capped to 38 000 chars. `unpdf` handles malformed XRef tables that
     break the older `pdf-parse` library.
   - **Text/markdown** is read directly from the buffer.
   - **Images** are accepted but text extraction is skipped (no OCR yet).
   Any parse failure is logged and downgraded — the assignment still gets created, the
   LLM just won't have reference text.

3. **DB insert** — Mongo doc created with `status: queued` and a fresh `jobId`.

4. **Enqueue** — `generationQueue.add('generate', { assignmentId, jobId }, { jobId })`.

5. **Worker pickup** — `vedaai-worker` (separate Node process under PM2) pulls the job,
   sets status to `processing`, publishes progress events.

6. **Prompt** — `buildPrompt()` produces a system prompt locking the JSON schema and a
   user prompt with the assignment specifics and optional reference text.

7. **Groq call** — Chat completion with `response_format: { type: 'json_object' }`,
   temperature 0.6, max tokens 8000.

8. **Schema validation** — Zod (`PaperSchema`) confirms the response matches the
   expected shape. MCQs are required to have ≥2 options. Non-MCQs have their options
   field stripped. Mismatches throw and the worker's `failed` listener writes the error
   to the doc + publishes a `failed` event.

9. **Persist + broadcast** — Result saved, status set to `completed`, `completed` event
   published with the full paper. The browser receives it via WebSocket and re-renders.

10. **PDF on demand** — `GET /:id/pdf` calls `renderPaperPdf()` which lays out the paper
    using PDFKit (Helvetica/Helvetica-Bold for body, hairline section dividers, A4 with
    56pt margins). Returned as `application/pdf` with `Content-Disposition: attachment`.

---

## Running Locally

### Prerequisites

- Node 20 or 22
- Docker (for Mongo + Redis) OR your own Mongo & Redis on the standard ports
- A Groq API key — free from https://console.groq.com

### 1. Clone

```bash
git clone https://github.com/yashvanthsankar/vedaai.git
cd vedaai
```

### 2. Spin up Mongo + Redis

```bash
docker compose up -d
docker ps           # should show vedaai-mongo and vedaai-redis
```

If you already have Mongo/Redis running locally, skip this step.

### 3. Backend

```bash
cd backend
cp .env.example .env
# edit .env, fill in GROQ_API_KEY
npm install
# in two terminals — or use a process manager:
npm run dev      # API server on http://localhost:4000
npm run worker   # BullMQ worker
```

Verify: `curl http://localhost:4000/health` → `{ "ok": true, "ts": … }`.

### 4. Frontend

```bash
cd ../frontend
cp .env.example .env.local       # only needed if your backend isn't on :4000
npm install
npm run dev                       # http://localhost:3000
```

Open `http://localhost:3000`, you'll be redirected to `/assignments`. Click
**Create Assignment**, fill the form, hit Generate. You should see a generating screen
that flips to the live paper in 3–8 seconds.

---

## Deployment (Live Stack)

This is exactly how the public links are running.

### Frontend — Vercel

- **Repo:** `yashvanthsankar/vedaai`, Root Directory `frontend`
- **Build command:** `next build` (default)
- **Env vars** (Production + Preview):
  - `NEXT_PUBLIC_API_URL=https://api.vedaai.yashvanth.com`
  - `NEXT_PUBLIC_WS_URL=wss://api.vedaai.yashvanth.com/ws`
- **Domain:** `vedaai.yashvanth.com` → Vercel CNAME

### Backend — AWS EC2 t4g.small (ARM, ap-south-1 Mumbai)

- **Instance:** `t4g.small`, 2 vCPU ARM Graviton, 2 GB RAM, 20 GB gp3 root volume.
  Free under the AWS T4g free trial through December 2026.
- **OS:** Ubuntu 24.04 LTS ARM.
- **Elastic IP:** `65.1.124.175` (static).
- **Security group:** SSH from my IP only, 80 + 443 from `0.0.0.0/0`.
- **DNS:** `api.vedaai.yashvanth.com` → `65.1.124.175` (Cloudflare, DNS-only / gray cloud).
- **TLS:** Let's Encrypt via `certbot --nginx`. Auto-renew via certbot's systemd timer.
- **Process manager:** PM2 with two apps: `vedaai-api` and `vedaai-worker`, both running
  via `tsx` directly. `pm2 startup` + `pm2 save` for boot persistence.
- **Reverse proxy:** nginx 1.24 terminates TLS, proxies HTTP + WebSocket to
  `127.0.0.1:4000`. Includes `client_max_body_size 20M` for PDF uploads.
- **Data stores:** MongoDB 7 and Redis 7, both installed natively on the same instance
  (`systemctl enable mongod redis-server`). Binding to `127.0.0.1` only so they're
  unreachable from the public internet.

### Repro the deployment

The full sequence I ran (CLI-driven, no AWS Console for the real work):

```bash
# 1. Create IAM user with AmazonEC2FullAccess, generate access key, aws configure.
# 2. Generate SSH keypair:
aws ec2 create-key-pair --key-name vedaai-deploy --key-type ed25519 \
    --query KeyMaterial --output text > ~/.ssh/vedaai-deploy.pem
chmod 600 ~/.ssh/vedaai-deploy.pem
# 3. Security group, instance launch, EIP allocate + associate (see git history).
# 4. SSH in, install Node 22 + MongoDB 7 + Redis + nginx + certbot + PM2.
# 5. git clone the repo, npm install, write backend/.env, pm2 start ecosystem.config.cjs.
# 6. Configure nginx + certbot --nginx --domains api.vedaai.yashvanth.com.
```

All commands are reproducible by reading the commit history — no hand-edited "go figure
it out" steps.

---

## Engineering Decisions / Trade-offs

A few choices that needed real thinking, kept here so a reviewer doesn't have to guess:

- **Why a separate worker process instead of doing it in the API.** Generation calls
  Groq, which can take 3–10s under load. Doing it inline blocks the request handler and
  is exposed to timeouts on the proxy. With BullMQ the API returns the `jobId`
  immediately; the worker can scale independently if needed.

- **Why MongoDB, not Postgres.** The assignment plus its generated paper is a single
  nested JSON document with variable depth (sections → questions → options). It maps
  cleanly to a Mongo doc; modelling it relationally would just mean joining four tables
  to read one paper. The brief explicitly asks for Mongo too.

- **Why Redis for the queue AND for the WebSocket fan-out.** BullMQ needs Redis anyway,
  and using Redis pub/sub means the API and worker can run on different processes (or
  different machines later) without needing direct IPC. The WS hub subscribes to a
  `paper-events` channel and pushes to the matching browser sockets.

- **Why `tsx` in production, not a `tsc` build step.** Saves a build minute on every
  deploy and the loader cost of `tsx` is dominated by Groq latency anyway. With PM2's
  `max_memory_restart: 400M` I bound RSS, and uptime has been stable.

- **Why I swapped `pdf-parse` for `unpdf`.** `pdf-parse@1.1.1` is an abandoned wrapper
  around an older pdfjs and crashes with `bad XRef entry` on a non-trivial fraction of
  real PDFs (textbooks especially). `unpdf` is a current pdfjs build with no native deps
  and a clean Promise-based API. The swap is in
  `backend/src/controllers/assignment.controller.ts` and the controller logs the
  extracted-char count so you can verify it actually read the file.

- **Why I validate the LLM response with Zod.** The model is told to return JSON in a
  strict schema, but you have to assume it'll occasionally deviate. The brief explicitly
  warns "Do not directly render LLM response" — the Zod step is what enforces that.
  Failed validation throws, the worker marks the assignment `failed`, and the user gets
  a Regenerate button.

- **Why I set `NEXT_PUBLIC_API_URL` and ALSO keep `next.config.mjs` rewrites.** Both
  work, but with `NEXT_PUBLIC_API_URL` set on Vercel, server-side rewrites still hit the
  backend hostname directly while the browser can also call the proxied path. Belt and
  braces — covers both fetch patterns I use across pages.

- **Why a singleton `Profile` document and not per-user auth.** The brief doesn't ask
  for auth and adding it would balloon the scope without changing what's being
  evaluated. The Profile API has a `getOrCreateProfile()` so the singleton is
  auto-seeded with VedaAI-friendly defaults on first read.

- **Why no shadcn or any UI kit.** The Figma had very specific design (Bricolage
  Grotesque, gradient logo, signature dark CTA with orange ring, mobile bottom-pill
  nav). Rebuilding it on top of shadcn would have meant restyling every component to
  override the kit's defaults — slower than writing the few primitives I needed by hand.
  See `frontend/src/components/`.

- **Why mobile bottom-pill bar (with a separate "+" FAB) instead of a hamburger drawer.**
  Matches the Figma exactly. The desktop sidebar has a dynamic CTA that changes label
  per route ("Create Assignment" on `/assignments`, "AI Teacher's Toolkit" on the
  toolkit page, etc.) — I kept that on mobile by floating the `+` button to the right
  of the bar.

---

## Brief Requirements Checklist

| Requirement (from the brief) | Where | Done |
|---|---|---|
| **Assignment Creation form** | `frontend/src/app/assignments/new/page.tsx` | ✅ |
| File upload (PDF / text) | Multer + unpdf extraction | ✅ |
| Due date input | Form field with date picker | ✅ |
| Question types | 7 types, multi-row table with steppers | ✅ |
| Number of questions + marks | Per-row steppers, live totals | ✅ |
| Additional instructions | Textarea, flows into the prompt verbatim | ✅ |
| Validation (no empty / negative) | Zod schema both client-form + server-side | ✅ |
| **State management** — Zustand | `frontend/src/store/draft.ts`, `groups.ts`, `lib/profile.ts` | ✅ |
| **WebSocket management** | `frontend/src/lib/ws.ts` + `backend/src/websocket/hub.ts` | ✅ |
| **Convert input → structured prompt** | `backend/src/services/prompt.ts` | ✅ |
| **Generate sections, questions, difficulty, marks** | `backend/src/services/groq.ts` + Zod schema | ✅ |
| **Do not render raw LLM response** | All output goes through `PaperSchema` validation; rendering happens in `PaperView.tsx` | ✅ |
| **Backend: Node + Express + TypeScript** | `backend/` whole tree | ✅ |
| **MongoDB → store assignments & results** | `models/Assignment.ts` | ✅ |
| **Redis → caching / job state** | BullMQ stores job state in Redis; WS pub/sub also on Redis | ✅ |
| **BullMQ → background jobs** | `queues/generation.queue.ts`, `workers/generation.worker.ts` | ✅ |
| **WebSocket → real-time updates** | `websocket/hub.ts` (subscribe by jobId) | ✅ |
| **Flow: API → queue → worker → store → notify** | Exactly this | ✅ |
| **Output page: Student Info Section (Name / Roll / Section)** | `components/PaperView.tsx` | ✅ |
| **Sections grouped with title + instruction + questions** | Same | ✅ |
| **Each question shows text + difficulty + marks** | Same; difficulty rendered as bracketed text matching the Figma | ✅ |
| **Clean, readable, mobile-responsive exam-paper layout** | Georgia serif on white paper, generous spacing, mobile-friendly | ✅ |
| **Bonus: Download as PDF (proper formatting)** | `services/pdf.ts` via PDFKit, A4, real PDF not print-to-pdf | ✅ |
| **Bonus: Action bar (Regenerate)** | Top of the output page | ✅ |
| **Bonus: Difficulty highlighting** | Bracketed tags on screen, color-coded in PDF | ✅ |
| **Tech stack: Next.js + TS + Zustand + WS** | ✅ | ✅ |
| **Tech stack: Node + Express + MongoDB + Redis + BullMQ** | ✅ | ✅ |
| **AI: any LLM with prompt structuring + parsing** | Groq `llama-3.3-70b-versatile`, JSON-mode + Zod validation | ✅ |
| **Deployed link** | https://vedaai.yashvanth.com | ✅ |
| **GitHub repo** | https://github.com/yashvanthsankar/vedaai | ✅ |
| **README with architecture + approach** | this file | ✅ |

Beyond the brief, the app also has:

- A **dashboard** (`/home`) with live stats from `/api/assignments` (total / ready / in-progress / failed).
- A **toolkit** (`/toolkit`) with 6 preset templates (Quick Quiz, Long Test, Diagnostic, Numerical, Diagram-Based, Rapid Review) that pre-fill the Create form and route to it.
- A **library** (`/library`) listing completed papers with quick PDF download.
- A **groups** page (`/groups`) using local Zustand-persisted state for a simple class roster.
- A **settings** page (`/settings`) plus inline modal editors (sidebar school card + topbar avatar) for editing the singleton Profile.
- A **credits** page (`/credits`) explaining who built it and how.
- Mobile polish: bottom-pill nav with active filled icon, floating `+` FAB, hamburger sheet for settings/credits/profile edit, smooth slide-down + fade animations honoring `prefers-reduced-motion`.

---

## Credits

Built by **Yashvanth Sankar** as the submission for VedaAI's Full-Stack Engineering hiring assignment.

- Portfolio: https://yashvanth.com
- GitHub: https://github.com/yashvanthsankar
- LinkedIn: https://linkedin.com/in/yashvanths
- Email: yashvanthsankar@gmail.com

The Figma source and brief belong to VedaAI. All other code in this repo is my own
implementation, written for this assignment.
