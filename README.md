# VedaAI Assessment Creator

> **Submission for the VedaAI Full-Stack Engineering hiring assignment.**
> A teacher describes an assignment → a worker turns it into a real exam paper with an
> LLM → the browser watches it generate over a WebSocket → the teacher downloads a PDF.
> Live, on real infrastructure, end to end.

**Live:** [vedaai.yashvanth.com](https://vedaai.yashvanth.com) · **API:** [api.vedaai.yashvanth.com](https://api.vedaai.yashvanth.com/health) · **Built by:** [Yashvanth Sankar](https://yashvanth.com) — [github](https://github.com/yashvanthsankar) · [linkedin](https://linkedin.com/in/yashvanths) · yashvanthsankar@gmail.com

---

## 30-second summary

| | |
|---|---|
| **What it does** | Teacher fills a form (title, subject, due date, file, question breakdown, free-text instructions) → background worker prompts an LLM, validates the JSON response against a strict schema, streams progress to the browser, renders the paper, exports a real PDF. |
| **Stack** | Next.js 15 (App Router) + Zustand · Express 4 + TypeScript · MongoDB 7 + Mongoose · Redis 7 + BullMQ · WebSocket (`ws`) · Groq `llama-3.3-70b-versatile` · unpdf · PDFKit · Tailwind + Bricolage Grotesque |
| **Where it runs** | Vercel (frontend) → nginx + PM2 on AWS EC2 t4g.small Mumbai (API + worker) → MongoDB & Redis on-instance, bound to localhost. TLS via Let's Encrypt, DNS via Cloudflare. |
| **End-to-end time** | ~3–8 s for a typical paper (25 questions, 60 marks, single-PDF reference). Tested live. |
| **Built in** | ~2 weeks, solo, end-to-end including infra. |

The three files that carry the most weight:

1. The **request lifecycle** diagram below — shows how API → queue → worker → WS → browser fit together.
2. [`backend/src/services/groq.ts`](backend/src/services/groq.ts) and [`backend/src/services/prompt.ts`](backend/src/services/prompt.ts) — the LLM prompt + Zod-validated parsing.
3. [`frontend/src/lib/ws.ts`](frontend/src/lib/ws.ts) + [`backend/src/websocket/hub.ts`](backend/src/websocket/hub.ts) — the WebSocket hub and the React hook that consumes it.

---

## Three decisions worth defending

### 1. The API does *not* call the LLM. A separate worker does.

`POST /api/assignments` validates the payload, extracts text from the uploaded PDF, inserts
the doc with `status: queued`, enqueues a BullMQ job, and returns within ~80 ms with a `jobId`.
The browser then opens a WebSocket and subscribes to that jobId. A separate `vedaai-worker`
process pulls the job, calls Groq (3–8 s), validates the response, persists the result, and
publishes a `completed` event on Redis pub/sub. The WS hub re-broadcasts to every browser
subscribed to that jobId.

Why this matters: doing the LLM call inline blocks the request handler, ties up an HTTP
connection for seconds, and dies if anything between the browser and Express has a timeout
(nginx, Cloudflare, you name it). With the worker split out, the API stays responsive, the
worker scales independently, and a browser that reloads mid-generation just re-subscribes
by jobId and picks up the stream where it left off.

### 2. Every LLM response is parsed against a strict Zod schema before it goes anywhere near the UI.

The brief said it out loud: *do not directly render LLM response*. So:

- Groq is called with `response_format: { type: 'json_object' }` (forces valid JSON).
- The response is parsed and then run through [`PaperSchema`](backend/src/services/groq.ts) — sections, questions, difficulty enum, marks bounds, MCQ option count.
- Mismatches throw; the worker's `failed` listener writes the error onto the doc and publishes a `failed` event.
- The browser shows a "Generation failed — Regenerate" affordance, not a half-broken paper.

This is the boundary between "untrusted model output" and "data we own." Everything past
that boundary can be rendered, indexed, exported to PDF, and trusted to have the right shape.

### 3. I swapped `pdf-parse` for `unpdf` after I found real PDFs that broke parsing.

The default Node PDF-text library, `pdf-parse@1.1.1`, is an abandoned wrapper around an
older pdfjs. On a non-trivial slice of real teaching materials (textbooks especially) it
crashes with `bad XRef entry` and the file's text never reaches the prompt. I replaced it
with [unpdf](https://github.com/unjs/unpdf), a current pdfjs build with no native deps and
a Promise-based API. Then I made the extraction non-fatal: if it still fails on some
unusual PDF, the assignment is created anyway and the model just doesn't get the reference
text. The controller logs the extracted character count so you can verify it really read
the file. See [`backend/src/controllers/assignment.controller.ts`](backend/src/controllers/assignment.controller.ts) lines 56–76.

Six more decisions like this are documented in the [Trade-offs](#trade-offs--things-i-considered-and-rejected) section below.

---

## Request lifecycle (the part the brief actually grades)

```
┌──────────┐  POST /api/assignments    ┌───────────────┐
│ Browser  │ ────────────────────────► │  Express API  │ ─── Zod validate
│ (Next.js)│                           │               │ ─── unpdf extract (non-fatal)
└────┬─────┘ ◄─── 200 { jobId } ─────  └────┬──────────┘ ─── Mongo insert (status: queued)
     │ open WS                              │
     │ { type: 'subscribe', jobId }         │ generationQueue.add(...)
     ▼                                      ▼
┌──────────┐                          ┌──────────┐    pop    ┌────────────────┐
│ WS hub   │ ◄─────── Redis ─────────►│  Redis 7 │ ◄──────── │ Worker process │
│ (per-job │  channel: paper-events   │  + BullMQ│           │ (BullMQ Worker)│
│ subs)    │                          └──────────┘ ──────┐   └───┬────────────┘
└────┬─────┘                                             │       │
     │                                                   │       │ buildPrompt()
     │ status / progress / completed / failed events     │       │ Groq.chat.completions
     ▼                                                   │       │ Zod PaperSchema.parse()
┌──────────┐                                             │       │ Mongo update + publish
│ Browser  │                                             │       ▼
│ renders  │                          ┌────────────────────────────────────┐
│ paper    │                          │  Groq Cloud · llama-3.3-70b-vers.  │
└──────────┘                          │  JSON-mode, temp 0.6, 8000 tokens  │
                                      └────────────────────────────────────┘

Then later, on demand:
GET /api/assignments/:id/pdf  →  PDFKit renders A4 paper from the same JSON.
```

Why three independently moving pieces (API, worker, WS hub) instead of one fat handler:
each one fails differently, scales differently, and gets restarted independently by PM2.
The worker can crash mid-generation and BullMQ will retry it; the API stays up. The API
can be redeployed and existing in-flight jobs are unaffected.

---

## Infrastructure (this is actually deployed)

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
                                         │  → api.vedaai.yashvanth.com
                                         ▼
                        ┌────────────────────────────────────┐
                        │     AWS EC2  t4g.small  ARM        │
                        │     ap-south-1 (Mumbai), 2 vCPU    │
                        │     Elastic IP 65.1.124.175        │
                        │                                    │
                        │  ┌─────────────────────────────┐   │
                        │  │  nginx (TLS, Let's Encrypt) │   │
                        │  │  :80 → :443 → :4000         │   │
                        │  └────────────┬────────────────┘   │
                        │               │ proxy + ws upgrade  │
                        │               ▼                     │
                        │  ┌─────────────────────────────┐   │
                        │  │  PM2                        │   │
                        │  │  ├─ vedaai-api  (Express)   │   │
                        │  │  └─ vedaai-worker (BullMQ)  │   │
                        │  └────┬───────────────┬────────┘   │
                        │       │               │             │
                        │       ▼               ▼             │
                        │  ┌─────────┐    ┌──────────┐        │
                        │  │ Mongo 7 │    │ Redis 7  │        │
                        │  │ :27017  │    │ :6379    │        │
                        │  │ local   │    │ local    │        │
                        │  └─────────┘    └────┬─────┘        │
                        └─────────────────────┼──────────────┘
                                              │ → Groq Cloud
                                              ▼
                                ┌──────────────────────┐
                                │   Groq Cloud API     │
                                │   llama-3.3-70b-     │
                                │     versatile        │
                                └──────────────────────┘
```

MongoDB and Redis bind to `127.0.0.1` only — they're not reachable from the public
internet even though they're on the same instance. The security group exposes `:22` (my
IP only), `:80`, and `:443`. Everything else is closed.

---

## Live links

| What | URL |
|---|---|
| Frontend (Vercel) | https://vedaai.yashvanth.com |
| Backend API (AWS EC2) | https://api.vedaai.yashvanth.com |
| Health probe | https://api.vedaai.yashvanth.com/health |
| Source repo | https://github.com/yashvanthsankar/vedaai |
| Credits page (inside the app) | https://vedaai.yashvanth.com/credits |

Cold-start: there isn't one — PM2 keeps both processes warm.

---

## Tech stack

| Layer | Library | Version | Why this and not the alternative |
|---|---|---|---|
| **Frontend framework** | Next.js | 15.1.6 (App Router) | File-system routing, easy Vercel deploy, RSC where it helps. Not Vite — wanted Vercel as the deploy target. |
| | React | 19 | — |
| | TypeScript | 5.7 | — |
| | Tailwind CSS | 3.4 | Utility classes match Figma fastest. Not CSS Modules / not a UI kit — see "no shadcn" trade-off. |
| **State** | Zustand | 5.0 | Tiny, no provider boilerplate. Used for the draft form, profile, and groups roster. Not Redux. |
| **Icons** | lucide-react | 0.473 | Matches the stroke weight in the Figma without restyling. |
| **Fonts** | Bricolage Grotesque · Georgia | — | Bricolage for UI (matches Figma exactly), Georgia for the exam-paper output. |
| **Backend runtime** | Node | 22 | — |
| | Express | 4.21 | Unopinionated, well-known. Not Fastify — Express's middleware ecosystem (multer especially) was the path of least resistance. |
| | TypeScript | 5.7 | Manual type sync with frontend. |
| | `tsx` | 4.19 | Run TS directly in prod; no separate `tsc` build step. See trade-off below. |
| **Validation** | Zod | 3.24 | One library, two jobs: validate user payload AND validate LLM JSON response. |
| **DB** | MongoDB | 7 (community) | Doc-shaped data with nested sections → questions → options. Brief asks for Mongo. |
| | Mongoose | 8.9 | — |
| **Queue / pub-sub** | Redis | 7 + ioredis 5.4 | BullMQ needs it; WS fan-out reuses it. One dependency, two uses. |
| | BullMQ | 5.34 | Retries, dead-letter queue, observable jobs. |
| **WebSocket** | `ws` | 8.18 | Native, ~5 KB, attaches to the same HTTP server. Not Socket.io. |
| **AI** | Groq SDK + `llama-3.3-70b-versatile` | 0.12 | Fastest hosted Llama 70b I know of, generous free tier, strong JSON-mode adherence. Provider-swappable in `services/groq.ts`. |
| **File upload** | Multer | 1.4 LTS | Memory storage, 10 MB cap. Files never touch disk on the API box. |
| **PDF read** | unpdf | 1.6 | Mozilla pdfjs wrapped for Node. Replaces `pdf-parse`. |
| **PDF write** | PDFKit | 0.15 | Hand-laid A4 exam paper, not "print to PDF". |
| **IDs** | uuid v4 | 11 | jobIds. |
| **Edge** | nginx 1.24 | — | TLS termination + WS upgrade. |
| **Process manager** | PM2 | latest | Two processes (`vedaai-api`, `vedaai-worker`), auto-restart, boot persistence via `pm2 startup`. |
| **TLS** | Let's Encrypt via certbot | — | Auto-renew via systemd timer. |

---

## Project structure

```
veda-ai-project/
├── README.md                        # this file
├── docker-compose.yml               # Mongo + Redis for local dev
│
├── backend/                         # Express + BullMQ + Groq
│   └── src/
│       ├── index.ts                 # API bootstrap: CORS, JSON, routes, error handler, WS attach
│       ├── config/
│       │   ├── db.ts                # mongoose.connect
│       │   ├── env.ts               # typed env loader, required() guard
│       │   └── redis.ts             # ioredis factory (BullMQ + WS pub/sub)
│       ├── controllers/
│       │   ├── assignment.controller.ts   # create, list, get, regenerate, delete, pdf
│       │   └── profile.controller.ts      # GET/PATCH /api/profile (singleton)
│       ├── models/
│       │   ├── Assignment.ts        # full schema incl. nested GeneratedPaper
│       │   └── Profile.ts           # singleton teacher/school doc
│       ├── queues/
│       │   └── generation.queue.ts  # BullMQ Queue "paper-generation"
│       ├── routes/
│       │   ├── assignment.routes.ts # routes + Multer middleware
│       │   └── profile.routes.ts
│       ├── services/
│       │   ├── prompt.ts            # buildPrompt(input) → { system, user }
│       │   ├── groq.ts              # generatePaper() — Groq call + Zod validation
│       │   └── pdf.ts               # renderPaperPdf(doc) → PDFKit stream
│       ├── types/
│       │   └── assignment.ts        # shared interfaces & enums
│       ├── websocket/
│       │   └── hub.ts               # WSS + Redis pub/sub bridge, publishEvent()
│       └── workers/
│           └── generation.worker.ts # pulls job → prompt → Groq → validate → save → publish
│
├── frontend/                        # Next.js 15 App Router
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           # AppShell wrapper
│       │   ├── assignments/
│       │   │   ├── page.tsx         # list + empty + filter + search + delete modal
│       │   │   ├── new/page.tsx     # 2-step Create wizard (form + review)
│       │   │   └── [id]/page.tsx    # generating progress + final paper view + regenerate
│       │   ├── home/page.tsx        # dashboard stats
│       │   ├── library/page.tsx     # completed papers + PDF download
│       │   ├── toolkit/page.tsx     # 6 preset templates that pre-fill the form
│       │   ├── groups/page.tsx      # local class roster (Zustand-persisted)
│       │   ├── settings/page.tsx    # profile editor
│       │   └── credits/page.tsx
│       ├── components/
│       │   ├── AppShell.tsx         # sidebar + topbar + mobile bar + modals
│       │   ├── Brand.tsx            # Logo, Wordmark, SparklesFilled SVGs
│       │   ├── Avatars.tsx
│       │   ├── EmptyIllustration.tsx# the "No assignments yet" composed SVG scene
│       │   ├── Modal.tsx            # accessible dialog primitive
│       │   ├── EditModals.tsx       # ProfileEditModal, SchoolEditModal
│       │   └── PaperView.tsx        # serif exam-paper renderer
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
└── figma-design/                    # source PNG exports, gitignored
```

---

## API surface

Base: `https://api.vedaai.yashvanth.com` · all under `/api`.

### Assignments

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| `GET` | `/api/assignments` | – | `{ items, total, limit, skip }` | Query: `search`, `limit` (max 100), `skip` |
| `POST` | `/api/assignments` | `multipart/form-data` with `payload` JSON + optional `file` (PDF / text / image, ≤10 MB) | `{ assignmentId, jobId, status: 'queued' }` (201) | Zod-validated; enqueues a BullMQ job |
| `GET` | `/api/assignments/:id` | – | full `Assignment` doc | – |
| `GET` | `/api/assignments/job/:jobId` | – | `Assignment` doc | For browsers reconnecting after refresh |
| `POST` | `/api/assignments/:id/regenerate` | – | `{ assignmentId, jobId, status: 'queued' }` | Fresh jobId, new generation |
| `DELETE` | `/api/assignments/:id` | – | `204` | – |
| `GET` | `/api/assignments/:id/pdf` | – | `application/pdf` stream | `409` if status ≠ `completed` |

### Profile (singleton)

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| `GET` | `/api/profile` | – | full `Profile` doc | Auto-creates with defaults on first read |
| `PATCH` | `/api/profile` | partial fields | updated `Profile` doc | Whitelists `teacherName`, `teacherEmail`, `schoolName`, `schoolLocation`, `defaultSubject`, `defaultGradeLevel` — nothing else |

### Health

| Method | Path | Response |
|---|---|---|
| `GET` | `/health` | `{ ok: true, ts }` |

### WebSocket

- **Path:** `/ws` → `wss://api.vedaai.yashvanth.com/ws`
- **Subscribe:** client sends `{ "type": "subscribe", "jobId": "<uuid>" }`
- **Server events:**
  - `{ type: "subscribed", jobId }`
  - `{ type: "status", jobId, status, progress, message }` — emitted at ~10%, 35%, 85%
  - `{ type: "completed", jobId, result }` — full `GeneratedPaper`
  - `{ type: "failed", jobId, error }`

The hub uses a Redis pub/sub channel (`paper-events`) so the API and worker can be on
different processes (or, later, different machines) and still talk to the same browser
subscribers.

---

## Data model

### `Assignment`

```ts
{
  _id: ObjectId,
  title: string,                          // 1–200 chars
  subject?: string,                       // ≤100
  gradeLevel?: string,                    // ≤50
  dueDate: string,                        // ISO date
  questionTypes: [
    { type: QuestionType, count: 1..50, marksPerQuestion: 1..100 }
  ],                                      // 1–10 items, ≤100 total questions across all types
  additionalInstructions?: string,        // ≤2000
  sourceText?: string,                    // ≤40000, extracted from uploaded PDF/text
  schoolName?: string,
  teacherName?: string,
  jobId: string,                          // unique, indexed
  status: 'queued' | 'processing' | 'completed' | 'failed',
  result?: GeneratedPaper,
  error?: string,
  createdAt, updatedAt
}

QuestionType =
  | 'mcq' | 'short_answer' | 'long_answer'
  | 'true_false' | 'fill_blank'
  | 'diagram_graph' | 'numerical'

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
          id,                             // e.g. "A1"
          text,
          type: QuestionType,
          difficulty: 'easy' | 'moderate' | 'challenging',
          marks: number,
          options?: string[],             // exactly 4 for mcq
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

## Generation pipeline (step by step)

1. **Payload validation.** [`createSchema`](backend/src/controllers/assignment.controller.ts) (Zod) rejects empty titles, missing dates, negative counts, duplicate question types, or totals > 100.
2. **PDF/text extraction.** PDFs → `unpdf`, capped at 38 000 chars. Text/markdown → buffer string. Images accepted but no OCR. Failure is non-fatal — assignment is still created.
3. **DB insert.** Mongo doc with `status: 'queued'`, fresh `jobId`.
4. **Enqueue.** `generationQueue.add('generate', { assignmentId, jobId }, { jobId })`. API returns `{ assignmentId, jobId }` to the browser.
5. **Worker pickup.** `vedaai-worker` (separate Node process under PM2) pulls the job, sets `status: 'processing'`, publishes a `status` event with `progress: 10`.
6. **Prompt.** [`buildPrompt()`](backend/src/services/prompt.ts) — system prompt locks the JSON schema, user prompt carries the assignment specifics + optional reference text (capped at 8 000 chars in the prompt itself).
7. **Groq call.** Chat completion with `response_format: { type: 'json_object' }`, temperature 0.6, `max_tokens: 8000`.
8. **Schema validation.** Zod [`PaperSchema`](backend/src/services/groq.ts) confirms shape. MCQs must have ≥2 options. Non-MCQ option fields are stripped. Mismatches throw → worker writes `error` + publishes `failed`.
9. **Persist + broadcast.** Result saved, `status: 'completed'`, `completed` event published with the full paper. Browser re-renders.
10. **PDF on demand.** `GET /:id/pdf` → [`renderPaperPdf()`](backend/src/services/pdf.ts) — PDFKit lays out A4 (Helvetica/Helvetica-Bold body, hairline section dividers, 56pt margins), color-coded difficulty badges, answer key page. Returned as `application/pdf` with `Content-Disposition: attachment`.

Concurrency: 2 jobs in flight per worker process. Retries: 2 attempts with exponential
backoff. Auto-cleanup after 24 h.

---

## Try it locally in 60 seconds

```bash
git clone https://github.com/yashvanthsankar/vedaai.git && cd vedaai
docker compose up -d                       # Mongo + Redis
(cd backend  && cp .env.example .env && \
  echo "GROQ_API_KEY=YOUR_KEY_HERE" >> .env && \
  npm i && npm run dev &        npm run worker &)
(cd frontend && cp .env.example .env.local && npm i && npm run dev)
open http://localhost:3000
```

Then click **Create Assignment**, fill the form, hit Generate. You should see a
generating screen that flips to the live paper in 3–8 seconds.

Prereqs: Node 20+, Docker, a free Groq API key from <https://console.groq.com>.

---

## Trade-offs — things considered and rejected

The three biggest are at the top of the README; these are the smaller ones.

- **`tsx` in production, not `tsc` build.** Saves a build minute on every deploy, and the
  loader cost of `tsx` is dominated by Groq latency anyway. PM2's `max_memory_restart: 400M`
  bounds RSS. Uptime has been stable.

- **No UI kit (no shadcn, no MUI).** The Figma had a very specific design system —
  Bricolage Grotesque, a gradient logo, signature dark CTA with an orange gradient ring,
  mobile bottom-pill nav. Rebuilding it on top of shadcn would have meant restyling every
  component to override the kit's defaults. Faster to write the ~8 primitives I needed by
  hand. See [`frontend/src/components/`](frontend/src/components/).

- **Mobile bottom-pill bar + floating "+" FAB, not a hamburger drawer.** Matches the
  Figma exactly. The desktop sidebar has a dynamic CTA that changes label per route
  ("Create Assignment" on `/assignments`, "AI Teacher's Toolkit" on the toolkit page,
  etc.); the mobile FAB inherits that.

- **Singleton `Profile` document, no per-user auth.** Brief doesn't ask for auth. Adding
  it would balloon the scope without changing what's being evaluated. `getOrCreateProfile()`
  seeds the singleton with VedaAI-friendly defaults (Lakshya at DPS Bokaro) on first read.

- **Both `NEXT_PUBLIC_API_URL` and `next.config.mjs` rewrites are configured.** Belt
  and braces — server-side rewrites hit the backend hostname directly while the browser
  can also call the proxied path. Covers both fetch patterns I use across pages.

- **Memory-only file uploads, not disk.** Multer keeps uploaded files in RAM (10 MB cap).
  Files are immediately parsed and discarded. No persistent storage to clean up, no
  serverless-disk caveats if I move the API to Fly/Render later.

- **Brand coral (#EF6A1A) for destructive actions, not red.** Brand consistency over
  generic "red = bad" convention — the delete affordances feel like part of the same
  product instead of bolted-on system UI. (`accent-red` is reserved for true error states
  like "Generation failed".)

---

## What I'd add for production

If this were going to real teachers tomorrow:

| Gap | What I'd add | Where it'd go |
|---|---|---|
| **No auth** | Sign-in with magic links + per-school multi-tenancy on every doc. JWT cookies, `requiredAuth` middleware. | New `auth/` module on backend; `withAuth` HOC on frontend. |
| **No rate limiting** | Per-IP and per-token limits on `POST /api/assignments` and `regenerate`. Groq has its own rate limits but I shouldn't pay for someone else's loop. | `express-rate-limit` + Redis-backed store. |
| **No observability** | Structured logs (pino), request IDs end-to-end, OpenTelemetry traces around the worker. Right now I have `console.log` and `pm2 logs`. | Replace ad-hoc logging; export to Loki + Tempo on a small Grafana box. |
| **Single-region** | Worker is in Mumbai, Groq is in the US. Round-trip dominates. A US worker would cut the median by ~200 ms. | Run the worker on Fly's IAD region, keep the API in Mumbai near the DB. |
| **No idempotency on Create** | If the browser retries `POST /api/assignments` after a flaky connection, the user gets two assignments. | Accept an `Idempotency-Key` header and store it on the doc with a unique index. |
| **No OCR on uploaded images** | The form accepts images but extraction is a no-op. | Either Groq's vision-capable models or a tesseract fallback. |
| **No paper preview during streaming** | I show progress %, not partial sections. Could stream section-by-section as the model returns them. | Move from single chat completion to streaming + incremental Zod (`safeParse` per section). |
| **Profile is a singleton** | One profile per instance — no concept of "users". Tied to the no-auth gap above. | Same fix as auth. |

---

## What's beyond the brief

Built to make the product feel real, not because the rubric asked:

- **Dashboard** at `/home` with live stats from `/api/assignments` (total / ready / in-progress / failed).
- **Toolkit** at `/toolkit` with 6 preset templates (Quick Quiz, Long Test, Diagnostic, Numerical, Diagram-Based, Rapid Review) that pre-fill the Create form.
- **Library** at `/library` listing completed papers with quick PDF download.
- **Groups** at `/groups` — local Zustand-persisted class roster, basic CRUD.
- **Settings** at `/settings` + inline modal editors (sidebar school card + topbar avatar) for editing the singleton Profile.
- **Credits** at `/credits` explaining who built it.
- **Mobile polish:** bottom-pill nav with active filled icon, floating `+` FAB, hamburger sheet for settings/credits/profile, slide-down + fade animations honoring `prefers-reduced-motion`.
- **Custom `DD-MM-YYYY` date pill** with digit auto-mask and a calendar glyph that opens the native picker via `showPicker()` — replaces the browser's `mm/dd/yyyy` widget that didn't match Figma.

---

## Brief requirements checklist

| Requirement | Where | Done |
|---|---|---|
| Assignment Creation form | [`frontend/src/app/assignments/new/page.tsx`](frontend/src/app/assignments/new/page.tsx) | ✅ |
| File upload (PDF / text) | Multer + unpdf extraction | ✅ |
| Due date input | Custom DD-MM-YYYY pill | ✅ |
| Question types | 7 types, multi-row table with steppers | ✅ |
| Number of questions + marks | Per-row steppers, live totals | ✅ |
| Additional instructions | Textarea, flows into the prompt verbatim | ✅ |
| Validation (no empty / negative) | Zod schema both client-form + server-side | ✅ |
| **State management — Zustand** | [`frontend/src/store/draft.ts`](frontend/src/store/draft.ts), `groups.ts`, [`lib/profile.ts`](frontend/src/lib/profile.ts) | ✅ |
| **WebSocket management** | [`frontend/src/lib/ws.ts`](frontend/src/lib/ws.ts) + [`backend/src/websocket/hub.ts`](backend/src/websocket/hub.ts) | ✅ |
| **Convert input → structured prompt** | [`backend/src/services/prompt.ts`](backend/src/services/prompt.ts) | ✅ |
| **Generate sections, questions, difficulty, marks** | [`backend/src/services/groq.ts`](backend/src/services/groq.ts) + Zod schema | ✅ |
| **Do not render raw LLM response** | All output goes through `PaperSchema`; rendering in [`PaperView.tsx`](frontend/src/components/PaperView.tsx) | ✅ |
| **Backend: Node + Express + TypeScript** | [`backend/`](backend/) | ✅ |
| **MongoDB → store assignments & results** | [`models/Assignment.ts`](backend/src/models/Assignment.ts) | ✅ |
| **Redis → caching / job state** | BullMQ stores job state; WS pub/sub also uses Redis | ✅ |
| **BullMQ → background jobs** | [`queues/generation.queue.ts`](backend/src/queues/generation.queue.ts), [`workers/generation.worker.ts`](backend/src/workers/generation.worker.ts) | ✅ |
| **WebSocket → real-time updates** | [`websocket/hub.ts`](backend/src/websocket/hub.ts) (subscribe by jobId) | ✅ |
| **Flow: API → queue → worker → store → notify** | Exactly this — see lifecycle diagram | ✅ |
| **Output page: Student Info Section** | [`components/PaperView.tsx`](frontend/src/components/PaperView.tsx) | ✅ |
| **Sections grouped with title + instruction + questions** | Same | ✅ |
| **Each question shows text + difficulty + marks** | Same; difficulty as bracketed text matching Figma | ✅ |
| **Clean, mobile-responsive exam-paper layout** | Georgia serif on white paper, generous spacing | ✅ |
| **Bonus: Download as PDF** | [`services/pdf.ts`](backend/src/services/pdf.ts) — real PDFKit, A4, not print-to-pdf | ✅ |
| **Bonus: Action bar (Regenerate)** | Top of the output page | ✅ |
| **Bonus: Difficulty highlighting** | Bracketed tags on screen, color-coded in PDF | ✅ |
| **Tech stack: Next.js + TS + Zustand + WS** | ✅ | ✅ |
| **Tech stack: Node + Express + Mongo + Redis + BullMQ** | ✅ | ✅ |
| **AI: any LLM with structured prompt + parsing** | Groq `llama-3.3-70b-versatile`, JSON-mode + Zod | ✅ |
| **Deployed link** | https://vedaai.yashvanth.com | ✅ |
| **GitHub repo** | https://github.com/yashvanthsankar/vedaai | ✅ |
| **README with architecture + approach** | this file | ✅ |

---

## Reproducing the deployment

Full sequence, CLI-driven (no AWS Console for the real work):

```bash
# 1. IAM user with AmazonEC2FullAccess, generate access key, aws configure.
# 2. SSH keypair:
aws ec2 create-key-pair --key-name vedaai-deploy --key-type ed25519 \
    --query KeyMaterial --output text > ~/.ssh/vedaai-deploy.pem
chmod 600 ~/.ssh/vedaai-deploy.pem
# 3. Security group, instance launch, EIP allocate + associate.
# 4. SSH in, install Node 22 + MongoDB 7 + Redis + nginx + certbot + PM2.
# 5. git clone, npm install, write backend/.env, pm2 start ecosystem.config.cjs.
# 6. nginx site config + certbot --nginx --domains api.vedaai.yashvanth.com.
```

All commands reproducible from the commit history.

---

## Credits

Built by **Yashvanth Sankar** as the submission for VedaAI's Full-Stack Engineering hiring assignment.

- Portfolio: <https://yashvanth.com>
- GitHub: <https://github.com/yashvanthsankar>
- LinkedIn: <https://linkedin.com/in/yashvanths>
- Email: yashvanthsankar@gmail.com

The Figma source and brief belong to VedaAI. All code in this repo is my own
implementation, written for this assignment.
