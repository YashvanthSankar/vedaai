# VedaAI Assessment Creator

> **Submission for the VedaAI Full-Stack Engineering hiring assignment.**
> A teacher describes an assignment → a worker turns it into a real exam paper with an
> LLM → the browser watches it generate over a WebSocket → the teacher downloads a PDF.
> Live, on real infrastructure, end to end.

| | |
|---|---|
| **Live app** | **<https://vedaai.yashvanth.com>** |
| **Backend API** | <https://api.vedaai.yashvanth.com> · [health](https://api.vedaai.yashvanth.com/health) |
| **Source** | <https://github.com/yashvanthsankar/vedaai> |
| **Built by** | [Yashvanth Sankar](https://yashvanth.com) — [github](https://github.com/yashvanthsankar) · [linkedin](https://linkedin.com/in/yashvanths) · yashvanthsankar@gmail.com |

```bash
curl https://api.vedaai.yashvanth.com/health
# → {"ok":true,"ts":1738...}
```

---

## 30-second summary

| | |
|---|---|
| **What it does** | Teacher fills a form (title, subject, due date, file, question breakdown, free-text instructions) → background worker prompts an LLM, validates the JSON response against a strict schema, streams progress to the browser, renders the paper, exports a real PDF. |
| **Stack** | Next.js 15 (App Router) + Zustand · Express 4 + TypeScript · MongoDB 7 + Mongoose · Redis 7 + BullMQ · WebSocket (`ws`) · Groq `llama-3.3-70b-versatile` · unpdf · PDFKit · Tailwind + Bricolage Grotesque |
| **Where it runs** | Vercel (frontend) → nginx + PM2 on AWS EC2 t4g.small Mumbai (API + worker) → MongoDB & Redis on the same instance, bound to localhost. TLS via Let's Encrypt (auto-renew), DNS via Cloudflare (gray-cloud), WSS straight through. See [Hosting choices](#hosting-choices--why-this-not-that) for why each box was picked over the popular alternative. |
| **End-to-end time** | ~3–8 s for a typical paper (25 questions, 60 marks, single-PDF reference). Tested live. |
| **Scope** | Frontend, backend, infrastructure, deployment — single-developer build. |

The three files that carry the most weight:

1. The **request lifecycle** diagram below — shows how API → queue → worker → WS → browser fit together.
2. [`backend/src/services/groq.ts`](backend/src/services/groq.ts) and [`backend/src/services/prompt.ts`](backend/src/services/prompt.ts) — the LLM prompt + Zod-validated parsing.
3. [`frontend/src/lib/ws.ts`](frontend/src/lib/ws.ts) + [`backend/src/websocket/hub.ts`](backend/src/websocket/hub.ts) — the WebSocket hub and the React hook that consumes it.

---

## Three decisions that shaped the architecture

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

Seven more are documented in the [Trade-offs](#trade-offs--things-considered-and-rejected) section below.

---

## Request lifecycle

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

Three independently moving pieces — API, worker, WS hub — each one fails differently,
scales differently, and gets restarted independently by PM2. The worker can crash
mid-generation and BullMQ retries the job; the API stays up. The API can be redeployed
and in-flight jobs are unaffected.

---

## Hosting choices — why this, not that

Every box in the infrastructure diagram was a deliberate pick over a popular alternative:

| Box | What I picked | What I rejected | Why |
|---|---|---|---|
| **Frontend host** | **Vercel** | Netlify · Cloudflare Pages · self-hosted Next | Native Next.js 15 support (RSC, streaming, ISR), zero-config preview URLs on every PR, free TLS + global CDN. Netlify would have worked but Vercel ships Next's own edge runtime. Cloudflare Pages still has rough edges with App Router streaming. |
| **Backend host** | **AWS EC2 `t4g.small` (ARM, Mumbai)** | Render · Railway · Fly.io · Vercel Functions | Render and Railway sleep free dynos and charge per-process — this app needs *two* long-running processes (API + worker) plus persistent WS connections. Fly is solid but the free allowance was cut in 2024. EC2 ARM Graviton gives me 2 vCPU / 2 GB / 20 GB SSD at ~$13/month with full control over nginx + PM2 + systemd. Same instance hosts Mongo and Redis on `127.0.0.1` — no cross-network latency. |
| **Why not serverless for the API?** | — | Vercel Functions / Lambda | Two killers: (1) WebSocket connections need a persistent process — serverless cold-starts and 10-minute timeouts don't fit. (2) BullMQ workers must be long-lived to pull jobs from Redis; you'd end up paying a long-running Lambda anyway. Putting the WS hub on EC2 sidesteps both problems. |
| **Database** | **MongoDB 7 on the EC2 box, bound to `127.0.0.1`** | MongoDB Atlas free tier · Supabase · PlanetScale | Atlas free tier is 512 MB shared — fine for now, but every query crosses the public internet and adds ~30–80 ms. On-instance Mongo gives me sub-millisecond reads and no per-doc fees. Trade-off: I'm responsible for backups. Acceptable for an assignment; first thing I'd change for real production (see [What I'd add for production](#what-id-add-for-production)). |
| **Queue / pub-sub** | **Redis 7 on the EC2 box, bound to `127.0.0.1`** | **Upstash Redis** · ElastiCache · Redis Cloud | Upstash is HTTP-based and bills per command — fine for cache reads, terrible for BullMQ which makes hundreds of `BRPOPLPUSH` calls per second per worker. The first time a job loops you'd burn through the free tier. ElastiCache is overkill (~$13/mo minimum). Self-hosted Redis on the same box as the worker = zero network hop, zero per-command cost, and the same Redis powers both BullMQ *and* WS pub/sub. |
| **TLS** | **Let's Encrypt via certbot** | Cloudflare proxy TLS · AWS ACM | Cloudflare's proxy mode would have terminated WebSockets at the edge — I want WSS straight through to nginx so the connection state lives in one process. ACM only attaches to ALBs (~$22/mo minimum). certbot is free and auto-renews via systemd timer. |
| **DNS** | **Cloudflare (DNS-only, gray cloud)** | Route 53 · Vercel DNS | Free, fast resolvers, free DDoS protection at the DNS layer. "Gray cloud" mode means Cloudflare just resolves the A record; traffic goes directly to my Elastic IP so WSS isn't proxied through their edge. |
| **Process manager** | **PM2** | systemd units · Docker · pm2-runtime | PM2 gives me two named processes (`vedaai-api`, `vedaai-worker`), auto-restart on crash, `max_memory_restart: 400M` to bound RSS, boot persistence via `pm2 startup`, and live logs via `pm2 logs`. systemd would have meant two unit files + journalctl. Same result, more YAML. |
| **Reverse proxy** | **nginx 1.24** | Caddy · Traefik · raw Node behind ALB | nginx is the path of most documentation. The config is ~30 lines: terminate TLS, proxy `:443 → :4000`, add `Upgrade: websocket` headers for `/ws`, bump `client_max_body_size` to 20 MB for PDF uploads. |
| **AI provider** | **Groq + `llama-3.3-70b-versatile`** | OpenAI · Anthropic direct · Together · Replicate | Groq's inference latency is 5–10× faster than the equivalent OpenAI call (the entire 8000-token paper comes back in 2–4 s). Free tier is generous. JSON-mode adherence is strong for a Llama model. Trade-off: a single point of failure. The provider is isolated to [`services/groq.ts`](backend/src/services/groq.ts) so a swap is one file. |
| **PDF parsing** | **unpdf** | pdf-parse · pdfjs-dist directly | Already documented above in [Three decisions worth defending](#three-decisions-worth-defending) (#3). |
| **PDF generation** | **PDFKit** | Puppeteer print-to-PDF · react-pdf | Puppeteer ships a 200 MB headless Chromium — overkill for an A4 exam paper, and it doesn't play nice with `t4g.small` RAM. react-pdf needs a React tree to render. PDFKit lets me lay out the page imperatively with full control over fonts, spacing, and color-coded difficulty badges. |

Common thread across all of these: every piece has been production-stable for 5+ years
with documentation that hasn't churned. The whole stack reproduces from `docker compose up`
locally and from a handful of `apt install` commands on the production box.

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

## Tech stack

| Layer | Library | Version | Why this and not the alternative |
|---|---|---|---|
| **Frontend framework** | Next.js | 15.1.6 (App Router) | File-system routing, RSC where it helps, native Vercel deploy target. |
| | React | 19 | — |
| | TypeScript | 5.7 | — |
| | Tailwind CSS | 3.4 | Utility classes track Figma changes fastest. Custom primitives live in [`globals.css`](frontend/src/app/globals.css). |
| **State** | Zustand | 5.0 | Single-store, no provider boilerplate. Used for the draft form, profile, and groups roster. |
| **Icons** | lucide-react | 0.473 | Stroke weight matches the Figma without restyling. |
| **Fonts** | Bricolage Grotesque · Georgia | — | Bricolage for UI (Figma match), Georgia for the exam-paper output. |
| **Backend runtime** | Node | 22 | — |
| | Express | 4.21 | Middleware ecosystem (Multer, body parsers) is the most mature in Node. |
| | TypeScript | 5.7 | Shared types with frontend, manually kept in sync. |
| | `tsx` | 4.19 | Run TS directly in prod, no separate `tsc` build step. See trade-off below. |
| **Validation** | Zod | 3.24 | One library, two jobs: validate user payload AND validate LLM JSON response. |
| **DB** | MongoDB | 7 (community) | Doc-shaped data with nested sections → questions → options maps cleanly. |
| | Mongoose | 8.9 | — |
| **Queue / pub-sub** | Redis | 7 + ioredis 5.4 | One dependency, two uses — BullMQ store and WS fan-out. |
| | BullMQ | 5.34 | Retries, dead-letter queue, observable jobs. |
| **WebSocket** | `ws` | 8.18 | Native, ~5 KB, attaches to the same HTTP server. |
| **AI** | Groq SDK + `llama-3.3-70b-versatile` | 0.12 | Fastest hosted Llama 70b inference, strong JSON-mode adherence. Provider-swappable in [`services/groq.ts`](backend/src/services/groq.ts). |
| **File upload** | Multer | 1.4 LTS | Memory storage, 10 MB cap. Files never touch disk. |
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

- **`tsx` in production, not `tsc` build.** Saves a build minute on every deploy, and the
  loader cost of `tsx` is dominated by Groq latency anyway. PM2's `max_memory_restart: 400M`
  bounds RSS. Uptime has been stable.

- **No UI kit (no shadcn, no MUI).** The Figma had a very specific design system —
  Bricolage Grotesque, a gradient logo, signature dark CTA with an orange gradient ring,
  mobile bottom-pill nav. Rebuilding it on top of shadcn would have meant restyling every
  component to override the kit's defaults. Building the ~8 primitives directly was
  faster. See [`frontend/src/components/`](frontend/src/components/).

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

Built to make the product feel real:

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
| Assignment Creation form | [`frontend/src/app/assignments/new/page.tsx`](frontend/src/app/assignments/new/page.tsx) | Yes |
| File upload (PDF / text) | Multer + unpdf extraction | Yes |
| Due date input | Custom DD-MM-YYYY pill | Yes |
| Question types | 7 types, multi-row table with steppers | Yes |
| Number of questions + marks | Per-row steppers, live totals | Yes |
| Additional instructions | Textarea, flows into the prompt verbatim | Yes |
| Validation (no empty / negative) | Zod schema both client-form + server-side | Yes |
| **State management — Zustand** | [`frontend/src/store/draft.ts`](frontend/src/store/draft.ts), `groups.ts`, [`lib/profile.ts`](frontend/src/lib/profile.ts) | Yes |
| **WebSocket management** | [`frontend/src/lib/ws.ts`](frontend/src/lib/ws.ts) + [`backend/src/websocket/hub.ts`](backend/src/websocket/hub.ts) | Yes |
| **Convert input → structured prompt** | [`backend/src/services/prompt.ts`](backend/src/services/prompt.ts) | Yes |
| **Generate sections, questions, difficulty, marks** | [`backend/src/services/groq.ts`](backend/src/services/groq.ts) + Zod schema | Yes |
| **Do not render raw LLM response** | All output goes through `PaperSchema`; rendering in [`PaperView.tsx`](frontend/src/components/PaperView.tsx) | Yes |
| **Backend: Node + Express + TypeScript** | [`backend/`](backend/) | Yes |
| **MongoDB → store assignments & results** | [`models/Assignment.ts`](backend/src/models/Assignment.ts) | Yes |
| **Redis → caching / job state** | BullMQ stores job state; WS pub/sub also uses Redis | Yes |
| **BullMQ → background jobs** | [`queues/generation.queue.ts`](backend/src/queues/generation.queue.ts), [`workers/generation.worker.ts`](backend/src/workers/generation.worker.ts) | Yes |
| **WebSocket → real-time updates** | [`websocket/hub.ts`](backend/src/websocket/hub.ts) (subscribe by jobId) | Yes |
| **Flow: API → queue → worker → store → notify** | Exactly this — see lifecycle diagram | Yes |
| **Output page: Student Info Section** | [`components/PaperView.tsx`](frontend/src/components/PaperView.tsx) | Yes |
| **Sections grouped with title + instruction + questions** | Same | Yes |
| **Each question shows text + difficulty + marks** | Same; difficulty as bracketed text matching Figma | Yes |
| **Clean, mobile-responsive exam-paper layout** | Georgia serif on white paper, generous spacing | Yes |
| **Bonus: Download as PDF** | [`services/pdf.ts`](backend/src/services/pdf.ts) — real PDFKit, A4, not print-to-pdf | Yes |
| **Bonus: Action bar (Regenerate)** | Top of the output page | Yes |
| **Bonus: Difficulty highlighting** | Bracketed tags on screen, color-coded in PDF | Yes |
| **Tech stack: Next.js + TS + Zustand + WS** | [`frontend/`](frontend/) — see [Tech stack](#tech-stack) for versions | Yes |
| **Tech stack: Node + Express + Mongo + Redis + BullMQ** | [`backend/`](backend/) — see [Tech stack](#tech-stack) for versions | Yes |
| **AI: any LLM with structured prompt + parsing** | Groq `llama-3.3-70b-versatile`, JSON-mode + Zod | Yes |
| **Deployed link** | https://vedaai.yashvanth.com | Yes |
| **GitHub repo** | https://github.com/yashvanthsankar/vedaai | Yes |
| **README with architecture + approach** | [`README.md`](README.md) | Yes |

---

## Reproducing the deployment

Every command, in order. CLI-driven end to end so the entire deployment is reproducible
from shell history.

### 1. Provision the EC2 instance (AWS CLI)

```bash
# IAM user with AmazonEC2FullAccess + AmazonRoute53FullAccess → access key → aws configure.

# SSH keypair (ed25519, not RSA — smaller, modern):
aws ec2 create-key-pair --key-name vedaai-deploy --key-type ed25519 \
    --query KeyMaterial --output text > ~/.ssh/vedaai-deploy.pem
chmod 600 ~/.ssh/vedaai-deploy.pem

# Security group — SSH locked to my IP, HTTP/HTTPS open to the world.
aws ec2 create-security-group --group-name vedaai-sg \
    --description "vedaai api + worker"
aws ec2 authorize-security-group-ingress --group-name vedaai-sg \
    --protocol tcp --port 22  --cidr "$(curl -s ifconfig.me)/32"
aws ec2 authorize-security-group-ingress --group-name vedaai-sg \
    --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name vedaai-sg \
    --protocol tcp --port 443 --cidr 0.0.0.0/0

# Launch t4g.small (ARM Graviton) in ap-south-1 (Mumbai, closest to most Indian schools).
# Ubuntu 24.04 ARM AMI, 20 GB gp3 root volume.
aws ec2 run-instances \
    --image-id ami-0xxxxxxxxxxxxxxxx \
    --instance-type t4g.small \
    --key-name vedaai-deploy \
    --security-groups vedaai-sg \
    --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3}' \
    --region ap-south-1

# Allocate and attach an Elastic IP so the DNS record never has to change.
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id i-xxxxxxxx --allocation-id eipalloc-xxxxxxxx
```

### 2. Install the runtime (on the instance)

```bash
# Node 22 (via NodeSource), MongoDB 7 (via official Mongo apt repo),
# Redis 7 (Ubuntu's PPA), nginx, certbot, PM2.
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] \
    https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update && sudo apt install -y \
    nodejs mongodb-org redis-server nginx certbot python3-certbot-nginx
sudo npm install -g pm2

# Bind Mongo + Redis to localhost ONLY — they must not be reachable from the internet.
sudo sed -i 's/bindIp:.*/bindIp: 127.0.0.1/' /etc/mongod.conf
sudo sed -i 's/^bind .*/bind 127.0.0.1/'      /etc/redis/redis.conf

sudo systemctl enable --now mongod redis-server nginx
```

### 3. Clone, configure, and start the app

```bash
git clone https://github.com/yashvanthsankar/vedaai.git ~/vedaai
cd ~/vedaai/backend
npm ci
cp .env.example .env
# Fill in: MONGODB_URI=mongodb://127.0.0.1:27017/vedaai
#          REDIS_URL=redis://127.0.0.1:6379
#          GROQ_API_KEY=<key>
#          CORS_ORIGIN=https://vedaai.yashvanth.com

# PM2 ecosystem — two named processes, both running through tsx.
cat > ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [
    { name: 'vedaai-api',    script: 'npx', args: 'tsx src/index.ts',                      max_memory_restart: '400M', env: { NODE_ENV: 'production' } },
    { name: 'vedaai-worker', script: 'npx', args: 'tsx src/workers/generation.worker.ts',  max_memory_restart: '400M', env: { NODE_ENV: 'production' } },
  ],
};
EOF

pm2 start ecosystem.config.cjs
pm2 save                               # persists the process list
pm2 startup systemd                    # generates and registers a systemd unit
# Output: copy-paste the printed `sudo env PATH=... pm2 startup systemd -u ...` line.
```

### 4. nginx with WebSocket upgrade + Let's Encrypt TLS

```nginx
# /etc/nginx/sites-available/vedaai-api
server {
    listen 80;
    server_name api.vedaai.yashvanth.com;

    client_max_body_size 20M;          # leave headroom over Multer's 10M cap

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket upgrade headers — required for /ws to work through the proxy.
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout                 3600s;   # don't drop idle WS connections
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vedaai-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS — certbot edits the nginx config in place and adds a systemd timer for renewal.
sudo certbot --nginx -d api.vedaai.yashvanth.com \
    --non-interactive --agree-tos -m yashvanthsankar@gmail.com
sudo systemctl status certbot.timer    # confirms auto-renew is armed
```

### 5. Cloudflare DNS

`api.vedaai.yashvanth.com` → `A` record → `65.1.124.175` → **DNS-only** (gray cloud).
Gray cloud is deliberate: orange cloud would proxy WSS through Cloudflare's edge and add
state I don't want to manage. The TLS cert is mine, terminated on nginx.

### 6. Frontend on Vercel

```bash
# From the frontend/ directory:
vercel link                            # connect to the GitHub repo
vercel env add NEXT_PUBLIC_API_URL  production   # https://api.vedaai.yashvanth.com
vercel env add NEXT_PUBLIC_WS_URL   production   # wss://api.vedaai.yashvanth.com/ws
vercel --prod
```

Custom domain `vedaai.yashvanth.com` added in the Vercel dashboard, then a `CNAME`
record on Cloudflare pointing at the Vercel target. Vercel handles TLS itself.

### 7. Verify end-to-end

```bash
curl https://api.vedaai.yashvanth.com/health
# → {"ok":true,"ts":1738...}

# WebSocket smoke test:
wscat -c wss://api.vedaai.yashvanth.com/ws
# > {"type":"subscribe","jobId":"00000000-0000-0000-0000-000000000000"}
# ← {"type":"subscribed","jobId":"..."}
```

### Operational notes

- **Logs:** `pm2 logs vedaai-api` and `pm2 logs vedaai-worker` — one stream per process.
- **Restart after a code pull:** `git pull && cd backend && npm ci && pm2 restart all`.
- **Mongo backups:** currently manual (`mongodump`); first thing I'd add for prod — see [What I'd add for production](#what-id-add-for-production).
- **Cost:** EC2 t4g.small in ap-south-1 runs ~$13/month on-demand (cheaper with a 1-year Savings Plan). Vercel hobby tier covers the frontend at $0. Cloudflare DNS is free. Domain is ~$12/year. Total run rate: **~$13/month**.

---

## Credits

Built by **Yashvanth Sankar** as the submission for VedaAI's Full-Stack Engineering hiring assignment.

- Portfolio: <https://yashvanth.com>
- GitHub: <https://github.com/yashvanthsankar>
- LinkedIn: <https://linkedin.com/in/yashvanths>
- Email: yashvanthsankar@gmail.com

The Figma source and brief belong to VedaAI.
