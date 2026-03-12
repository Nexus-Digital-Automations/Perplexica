# Perplexica Codebase Overview

Perplexica is a **privacy-focused, open-source AI answering engine** built on Next.js. It takes a user's question, searches the web (via a local SearxNG instance), gathers and ranks sources, then uses a configurable LLM to write a cited answer — all streamed back to the browser in real time.

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Request lifecycle](#request-lifecycle)
5. [Core subsystems](#core-subsystems)
   - [Classifier](#1-classifier)
   - [Widget system](#2-widget-system)
   - [Researcher (search agent)](#3-researcher-search-agent)
   - [Writer (answer generator)](#4-writer-answer-generator)
   - [SessionManager (streaming)](#5-sessionmanager-streaming)
   - [Model layer](#6-model-layer)
   - [Upload / RAG pipeline](#7-upload--rag-pipeline)
6. [API routes](#api-routes)
7. [Database](#database)
8. [Frontend](#frontend)
9. [Search modes (optimization)](#search-modes-optimization)
10. [Supported search sources](#supported-search-sources)
11. [Supported AI providers](#supported-ai-providers)
12. [Deployment](#deployment)

---

## What it does

When you ask Perplexica a question it:

1. **Classifies** the query to decide what kind of search is needed and which UI widgets to show.
2. **Runs widgets** (weather, stocks, calculations) in parallel with research — results appear before the answer is done.
3. **Researches** the web (or uploaded files) using a tool-calling agentic loop powered by SearxNG.
4. **Writes** a final answer, streaming it token-by-token, with numbered inline citations.
5. **Persists** every chat and message in a local SQLite database.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Node.js runtime) |
| Language | TypeScript 5 |
| Database | SQLite via `better-sqlite3` + Drizzle ORM |
| Search backend | SearxNG (self-hosted, JSON API) |
| AI providers | OpenAI, Anthropic, Google Gemini, Groq, Ollama, LM Studio, Lemonade, HuggingFace Transformers |
| Embeddings | OpenAI, Gemini, Ollama, LM Studio, Lemonade, Transformers |
| Styling | Tailwind CSS + Headless UI |
| Streaming | Web Streams API (TransformStream / ReadableStream) |
| Schema validation | Zod |

---

## Project structure

```
Perplexica/
├── src/
│   ├── app/                        # Next.js App Router pages + API routes
│   │   ├── api/
│   │   │   ├── chat/route.ts       # Main chat endpoint (POST /api/chat)
│   │   │   ├── search/route.ts     # Headless search API (POST /api/search)
│   │   │   ├── chats/              # Chat history CRUD
│   │   │   ├── providers/          # AI provider management
│   │   │   ├── config/             # App configuration
│   │   │   ├── discover/           # Trending news feed
│   │   │   ├── images/             # Image search
│   │   │   ├── videos/             # Video search
│   │   │   ├── suggestions/        # Query suggestions
│   │   │   ├── uploads/            # File upload + embedding
│   │   │   └── weather/            # Weather widget data
│   │   ├── c/[chatId]/page.tsx     # Individual chat page
│   │   ├── library/page.tsx        # Chat history page
│   │   └── discover/page.tsx       # Discover / news page
│   ├── components/                 # React UI components
│   │   ├── Chat.tsx                # Chat orchestration
│   │   ├── ChatWindow.tsx          # Message list
│   │   ├── MessageBox.tsx          # Single message rendering
│   │   ├── MessageInput.tsx        # Input bar (in-chat)
│   │   ├── EmptyChatMessageInput.tsx # Landing input bar
│   │   ├── MessageSources.tsx      # Source cards
│   │   ├── Widgets/                # Weather, stock, calculation widgets
│   │   ├── Settings/               # Settings modal + provider config
│   │   └── Setup/                  # First-run setup wizard
│   └── lib/
│       ├── agents/
│       │   ├── search/
│       │   │   ├── index.ts        # SearchAgent (main orchestrator)
│       │   │   ├── classifier.ts   # Query classification
│       │   │   ├── api.ts          # APISearchAgent (headless API variant)
│       │   │   ├── types.ts        # Shared types
│       │   │   ├── researcher/     # Agentic research loop
│       │   │   │   ├── index.ts
│       │   │   │   └── actions/    # Tool implementations
│       │   │   │       ├── registry.ts         # Action registry
│       │   │   │       ├── webSearch.ts         # SearxNG web search
│       │   │   │       ├── academicSearch.ts    # ArXiv / Scholar / PubMed
│       │   │   │       ├── socialSearch.ts      # Reddit via SearxNG
│       │   │   │       ├── scrapeURL.ts         # Direct URL scraping
│       │   │   │       ├── uploadsSearch.ts     # Vector search over uploads
│       │   │   │       ├── plan.ts              # Reasoning preamble action
│       │   │   │       └── done.ts              # Terminal action
│       │   │   └── widgets/
│       │   │       ├── executor.ts              # Widget runner
│       │   │       ├── calculationWidget.ts
│       │   │       └── (weatherWidget, stockWidget registered elsewhere)
│       │   └── media/
│       │       ├── image.ts        # Image search agent
│       │       └── video.ts        # Video search agent
│       ├── models/
│       │   ├── base/               # Abstract BaseLLM + BaseEmbedding
│       │   ├── providers/          # One folder per provider
│       │   └── registry.ts         # ModelRegistry (loads / manages providers)
│       ├── db/
│       │   ├── index.ts            # Drizzle client (SQLite)
│       │   └── schema.ts           # chats + messages tables
│       ├── uploads/
│       │   ├── manager.ts          # File ingestion + chunking + embedding
│       │   └── store.ts            # In-memory vector store + cosine similarity search
│       ├── session.ts              # SessionManager (event bus + block store)
│       ├── searxng.ts              # SearxNG HTTP client
│       ├── config/                 # App config management (JSON file)
│       ├── prompts/                # System prompts for each LLM call
│       └── utils/                  # Helpers (similarity, text splitting, history formatting)
├── data/                           # SQLite DB + uploaded files (gitignored)
├── drizzle/                        # Migration SQL files
├── searxng/                        # SearxNG config (bundled in Docker image)
├── docker-compose.yaml
└── Dockerfile / Dockerfile.slim
```

---

## Request lifecycle

This is what happens from the moment you press Enter to when the answer appears on screen.

```
Browser
  │
  │  POST /api/chat  (JSON body with message, chatModel, embeddingModel, sources, optimizationMode)
  ▼
chat/route.ts
  ├── Validates request body (Zod)
  ├── Loads LLM + embedding model from ModelRegistry
  ├── Creates a SessionManager (event bus)
  ├── Opens a TransformStream → returns it as SSE to browser
  └── Calls SearchAgent.searchAsync() [non-blocking, runs in background]
        │
        ├── 1. CLASSIFY  (classifier.ts)
        │     LLM generates a structured JSON object deciding:
        │     - skipSearch, academicSearch, discussionSearch, personalSearch
        │     - showWeatherWidget, showStockWidget, showCalculationWidget
        │     - standaloneFollowUp (rewritten standalone question)
        │
        ├── 2. WIDGETS + RESEARCH  [run in parallel via Promise.all]
        │
        │   WidgetExecutor.executeAll()
        │     For each registered widget:
        │       if widget.shouldExecute(classification) → widget.execute()
        │       → session.emitBlock({ type: 'widget', data: ... })
        │
        │   Researcher.research()  (if !skipSearch)
        │     Loop (max iterations depends on optimizationMode):
        │       LLM selects tool calls from ActionRegistry
        │       Tools available:
        │         - web_search      → SearxNG general web
        │         - academic_search → SearxNG (arxiv, google scholar, pubmed)
        │         - social_search   → SearxNG (reddit)
        │         - scrape_url      → Direct HTTP fetch + HTML→Markdown
        │         - uploads_search  → Cosine similarity over uploaded file embeddings
        │         - done            → Signal research is complete
        │       Each tool emits sub-step events into the research block
        │       Results are deduplicated by URL
        │       → session.emitBlock({ type: 'source', data: [...] })
        │
        ├── 3. WRITE ANSWER
        │     Assembles context:
        │       <search_results> (citable) + <widgets_result> (not citable)
        │     LLM streams the answer using writerPrompt
        │     Each token chunk:
        │       → session.emitBlock / session.updateBlock (RFC 6902 JSON Patch)
        │
        └── 4. PERSIST
              db.update(messages) → status='completed', responseBlocks=[...]
              db.insert(chats)    → if first message in this chat


SessionManager (session.ts)
  Every session.emit/emitBlock/updateBlock sends events to:
    → The SSE TransformStream (which the browser reads line by line)
  The browser applies JSON Patch diffs to reconstruct the live state.
```

---

## Core subsystems

### 1. Classifier

**File:** `src/lib/agents/search/classifier.ts`

The first LLM call on every query. It uses structured output (`generateObject`) to produce a classification object:

```ts
{
  classification: {
    skipSearch: boolean,          // e.g. "hello" → true
    personalSearch: boolean,      // query is about user's own files
    academicSearch: boolean,      // query needs scholarly sources
    discussionSearch: boolean,    // query needs social/discussion sources
    showWeatherWidget: boolean,
    showStockWidget: boolean,
    showCalculationWidget: boolean,
  },
  standaloneFollowUp: string      // self-contained rewrite of the question
}
```

This result drives everything downstream: which research tools are enabled, which widgets execute, and how the researcher prompt is framed.

---

### 2. Widget system

**Files:** `src/lib/agents/search/widgets/`

Widgets are small helpers that show structured data cards in the UI. They run in **parallel** with research so results appear quickly.

| Widget | Trigger condition | What it does |
|---|---|---|
| Weather | `showWeatherWidget` | Fetches weather data and formats it |
| Stock | `showStockWidget` | Fetches stock price via `yahoo-finance2` |
| Calculation | `showCalculationWidget` | LLM extracts a math expression, evaluates it with `mathjs` |

Widget outputs are passed to the writer LLM as non-citable context (so the LLM can reference them but the UI won't show them as source links).

**Registration pattern:** Each widget is registered on the `WidgetExecutor` singleton map. The executor calls all registered widgets in parallel via `Promise.all`.

---

### 3. Researcher (search agent)

**Files:** `src/lib/agents/search/researcher/`

The researcher is an **agentic tool-calling loop**. It runs for a maximum number of iterations determined by `optimizationMode`:

| Mode | Max iterations |
|---|---|
| `speed` | 2 |
| `balanced` | 6 |
| `quality` | 25 |

Each iteration:
1. The LLM is given the conversation, its action history, and a list of available tools.
2. It returns tool calls (potentially multiple in one turn).
3. Each tool executes in parallel and returns results.
4. Results are appended to the agent's message history.
5. If the LLM calls `done` or produces no tool calls, the loop ends.

**Available research tools (actions):**

| Tool | Source | Enabled when |
|---|---|---|
| `web_search` | SearxNG general | `web` in sources + skipSearch=false |
| `academic_search` | SearxNG (arxiv, google scholar, pubmed) | `academic` in sources + academicSearch=true |
| `social_search` | SearxNG (reddit) | `discussions` in sources + discussionSearch=true |
| `scrape_url` | Direct HTTP + Turndown (HTML→Markdown) | Always (user must explicitly ask) |
| `uploads_search` | In-memory vector store | fileIds present |
| `done` | — | Always (signals end of research) |

A special pseudo-tool `__reasoning_preamble` lets the LLM emit its reasoning plan, which is shown in the UI as a collapsible "thinking" step.

After the loop, duplicate URLs are merged and all collected chunks are emitted as a `source` block to the session.

---

### 4. Writer (answer generator)

**File:** `src/lib/agents/search/index.ts` (SearchAgent class)

After research completes, the writer assembles two context sections:

- `<search_results>` — numbered search chunks the LLM should cite inline as `[1]`, `[2]`, etc.
- `<widgets_result>` — widget data the LLM may use but must **not** cite as a source.

The writer streams the answer token-by-token using `llm.streamText()`. Each chunk is either:
- A new `TextBlock` (first chunk) emitted via `session.emitBlock`
- An update to the existing block via `session.updateBlock` (RFC 6902 JSON Patch `replace` on `/data`)

This lets the browser reconstruct the growing answer in real time without receiving the full text on every event.

---

### 5. SessionManager (streaming)

**File:** `src/lib/session.ts`

The `SessionManager` is an in-process event bus that bridges the async research/write pipeline to the HTTP SSE response.

Key concepts:
- **Blocks**: typed data objects (`text`, `source`, `widget`, `research`) stored in a `Map<id, Block>`. Each block is immutable once created; updates use RFC 6902 JSON Patch.
- **Events**: `data` (new/updated block), `end`, `error` — emitted to an `EventEmitter` and replayed for late subscribers.
- **TTL**: Sessions self-delete from the global map after 30 minutes.
- **Reconnect**: Because events are replayed, a frontend that reconnects mid-stream catches up immediately.

The `chat/route.ts` subscribes to the session and forwards every event as a newline-delimited JSON line over the SSE `TransformStream`.

---

### 6. Model layer

**Files:** `src/lib/models/`

#### Abstract base classes

- `BaseLLM` — defines `generateText`, `streamText`, `generateObject`, `streamObject`
- `BaseEmbedding` — defines `embedText(strings[]) → number[][]`
- `BaseModelProvider` — defines `getModelList`, `loadChatModel`, `loadEmbeddingModel`

#### Supported providers

| Provider | Chat LLM | Embeddings |
|---|---|---|
| OpenAI | `openaiLLM.ts` | `openaiEmbedding.ts` |
| Anthropic | `anthropicLLM.ts` | — |
| Google Gemini | `geminiLLM.ts` | `geminiEmbedding.ts` |
| Groq | `groqLLM.ts` | — |
| Ollama | `ollamaLLM.ts` | `ollamaEmbedding.ts` |
| LM Studio | `lmstudioLLM.ts` | `lmstudioEmbedding.ts` |
| Lemonade | `lemonadeLLM.ts` | `lemonadeEmbedding.ts` |
| HuggingFace Transformers | — | `transformerEmbedding.ts` |

#### ModelRegistry

`ModelRegistry` reads the configured providers from the app's JSON config file, instantiates the appropriate provider class for each, and exposes `loadChatModel` / `loadEmbeddingModel`. Providers can be added, updated, or removed at runtime via the Settings UI (changes are persisted to the config file).

---

### 7. Upload / RAG pipeline

**Files:** `src/lib/uploads/`

Perplexica implements a lightweight retrieval-augmented generation (RAG) pipeline for uploaded documents.

**Ingestion** (`manager.ts`):
1. User uploads a file (PDF, DOCX, or plain text) via `POST /api/uploads`.
2. The file is saved to `data/uploads/`.
3. Text is extracted (`pdf-parse` for PDF, `officeparser` for DOCX, raw read for `.txt`).
4. Text is chunked into 512-token windows with 128-token overlap (`splitText`).
5. Each chunk is embedded using the user's configured embedding model.
6. Chunks + embeddings are saved as a `.content.json` file alongside the original.
7. A record is appended to `data/uploads/uploaded_files.json`.

**Retrieval** (`store.ts`):
1. `UploadStore` loads chunk records for the requested file IDs.
2. Query strings are embedded with the same model.
3. Cosine similarity is computed between query embeddings and all stored chunk embeddings.
4. Reciprocal Rank Fusion (RRF, `k=60`) merges results across multiple query embeddings.
5. Top-K chunks are returned as `Chunk[]` for the researcher to include in context.

---

## API routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Main chat endpoint — streaming SSE |
| `POST` | `/api/search` | Headless search API (returns JSON or SSE) |
| `GET` | `/api/chats` | List all chat sessions |
| `GET` | `/api/chats/[id]` | Get messages for a chat |
| `DELETE` | `/api/chats/[id]` | Delete a chat |
| `GET` | `/api/providers` | List configured AI providers + models |
| `POST` | `/api/providers` | Add a provider |
| `PUT` | `/api/providers/[id]` | Update a provider |
| `DELETE` | `/api/providers/[id]` | Remove a provider |
| `GET` | `/api/config` | Get app config |
| `POST` | `/api/config` | Update app config |
| `POST` | `/api/config/setup-complete` | Mark first-run setup as complete |
| `POST` | `/api/uploads` | Upload files for RAG |
| `GET` | `/api/images` | Image search (SearxNG) |
| `GET` | `/api/videos` | Video search (SearxNG) |
| `GET` | `/api/discover` | Trending news feed |
| `GET` | `/api/suggestions` | Query autocomplete suggestions |
| `GET` | `/api/weather` | Weather widget data |
| `GET` | `/api/reconnect/[id]` | Reconnect to an in-progress session |

---

## Database

**Files:** `src/lib/db/schema.ts`, `drizzle/`

SQLite database at `data/db.sqlite`, managed by Drizzle ORM.

### `chats` table

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK) | UUID, set by client |
| `title` | text | First message content |
| `createdAt` | text | ISO date string |
| `sources` | JSON | `SearchSources[]` — which sources were enabled |
| `files` | JSON | `{ fileId, name }[]` — attached file references |

### `messages` table

| Column | Type | Notes |
|---|---|---|
| `id` | integer (PK) | Auto-increment |
| `messageId` | text | UUID, set by client |
| `chatId` | text | FK → chats.id |
| `backendId` | text | SessionManager ID |
| `query` | text | Original user query |
| `createdAt` | text | ISO date string |
| `responseBlocks` | JSON | `Block[]` — full rendered response |
| `status` | enum | `'answering' \| 'completed' \| 'error'` |

The `responseBlocks` column stores the complete final state of the response (text, sources, widgets, research steps) so that the library page can replay them without re-running the search.

---

## Frontend

The UI is a React/Next.js app styled with Tailwind CSS.

### Key components

| Component | Role |
|---|---|
| `EmptyChat` + `EmptyChatMessageInput` | Landing screen — first query entry |
| `Chat` + `ChatWindow` | Ongoing conversation view |
| `MessageBox` | Renders a single AI response including blocks |
| `AssistantSteps` | Shows the live research progress (search queries, URLs being read, reasoning) |
| `MessageSources` | Source card grid with favicon + title |
| `SearchImages` / `SearchVideos` | Image / video result grids |
| `Widgets/Renderer` | Dispatches to Weather / Stock / Calculation widget components |
| `MessageInput` | In-chat input with source selector, mode selector, and file attach |
| `Sidebar` | Chat history navigation |
| `Settings/SettingsDialogue` | Provider config, personalization, search settings |
| `Setup/SetupWizard` | First-run onboarding flow |

### Streaming rendering

The browser reads the SSE stream line by line. Each line is a JSON object of type:

- `block` — a new block to add to the response
- `updateBlock` — a JSON Patch array to apply to an existing block's data
- `researchComplete` — research phase is done, answer is starting
- `messageEnd` — response is fully complete
- `error` — something went wrong

The frontend maintains a local `blocks` map and applies patches in order. This means complex nested data (research sub-steps, growing text) is updated efficiently without sending full payloads.

---

## Search modes (optimization)

| Mode | Research iterations | Behavior |
|---|---|---|
| `speed` | Max 2 | One broad search pass. Fastest, good for simple factual questions. |
| `balanced` | Max 6 | Broader then narrowing searches. Good for most queries. |
| `quality` | Max 25 | Many iterative searches; never stops early unless 5+ iterations done. Best for deep research. |

The mode is chosen per message in the input bar and sent with each `/api/chat` request.

---

## Supported search sources

| Source key | What is searched | Engines used |
|---|---|---|
| `web` | General web | SearxNG defaults |
| `academic` | Scholarly papers | arxiv, google scholar, pubmed |
| `discussions` | Community discussions | reddit |

Sources can be toggled per message in the input bar. Multiple can be active simultaneously.

---

## Supported AI providers

### Cloud providers
- **OpenAI** (GPT-4o, GPT-4o mini, o-series, etc.)
- **Anthropic** (Claude 3.5, Claude 3, etc.)
- **Google Gemini** (Gemini 1.5 Pro, Flash, etc.)
- **Groq** (Llama, Mixtral via Groq Cloud)

### Local providers
- **Ollama** — runs any locally-pulled model; also supports local embeddings
- **LM Studio** — OpenAI-compatible local server
- **Lemonade** — lightweight local inference server
- **HuggingFace Transformers** — runs embedding models locally in-process (no server required)

Any provider exposing an OpenAI-compatible API can be added as a custom provider.

---

## Deployment

### Docker (recommended)

```bash
# All-in-one (Perplexica + SearxNG bundled)
docker run -d -p 3000:3000 -v perplexica-data:/home/perplexica/data \
  --name perplexica itzcrazykns1337/perplexica:latest

# Slim (bring your own SearxNG)
docker run -d -p 3000:3000 \
  -e SEARXNG_API_URL=http://your-searxng:8080 \
  -v perplexica-data:/home/perplexica/data \
  --name perplexica itzcrazykns1337/perplexica:slim-latest
```

### Manual

```bash
npm install
npm run build
npm run start
# Open http://localhost:3000 and complete the setup wizard
```

### SearxNG requirements (if self-hosting)

- JSON format must be enabled in `settings.yml`
- Wolfram Alpha engine should be enabled for calculation queries

### Data persistence

All persistent state lives in `data/`:
- `data/db.sqlite` — chat and message history
- `data/uploads/` — uploaded files + their embeddings
- `data/config.json` — provider API keys and app settings
